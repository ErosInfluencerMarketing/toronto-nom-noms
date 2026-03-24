import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sequence, SequenceFormData, SequenceStatus, SenderIdentity } from '@/types/sequence';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useSequences(statusFilter: SequenceStatus | 'all' = 'all', leadSearch = '') {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['sequences', user?.id, statusFilter, leadSearch],
    queryFn: async () => {
      if (!user) return { sequences: [], totalCount: 0 };

      // If searching by lead name, first find matching lead IDs
      let matchingLeadIds: string[] | null = null;
      if (leadSearch.trim()) {
        const searchTerm = `%${leadSearch.trim()}%`;
        const { data: matchingLeads } = await supabase
          .from('leads')
          .select('id')
          .or(`business_name.ilike.${searchTerm},email.ilike.${searchTerm}`);
        matchingLeadIds = (matchingLeads || []).map((l: any) => l.id);
        if (matchingLeadIds.length === 0) {
          return { sequences: [], totalCount: 0 };
        }
      }

      let query = supabase
        .from('sequences')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (matchingLeadIds) {
        query = query.in('lead_id', matchingLeadIds);
      }

      const { data: seqData, error, count } = await query;
      if (error) throw error;

      // Fetch steps only for current page sequences
      if (seqData && seqData.length > 0) {
        const seqIds = seqData.map((s: any) => s.id);
        const { data: steps, error: stepsErr } = await supabase
          .from('sequence_steps')
          .select('*')
          .in('sequence_id', seqIds)
          .order('step_number', { ascending: true });
        if (stepsErr) throw stepsErr;

        const stepsBySeq = (steps || []).reduce((acc: Record<string, any[]>, step: any) => {
          if (!acc[step.sequence_id]) acc[step.sequence_id] = [];
          acc[step.sequence_id].push(step);
          return acc;
        }, {});

        const sequences = seqData.map((seq: any) => ({
          ...seq,
          steps: stepsBySeq[seq.id] || [],
        })) as unknown as Sequence[];

        return { sequences, totalCount: count || 0 };
      }

      return { sequences: [] as Sequence[], totalCount: count || 0 };
    },
    enabled: !!user,
    placeholderData: keepPreviousData,
  });

  // Fetch status counts and aggregate email stats
  const { data: statusCounts } = useQuery({
    queryKey: ['sequences-counts', user?.id],
    queryFn: async () => {
      if (!user) return { active: 0, paused: 0, completed: 0, replied: 0, total: 0, totalEmailsSent: 0, leadsEmailed: 0 };
      
      const statuses = ['active', 'paused', 'completed', 'replied'] as const;
      const counts: Record<string, number> = {};
      let total = 0;

      for (const status of statuses) {
        const { count } = await supabase
          .from('sequences')
          .select('*', { count: 'exact', head: true })
          .eq('status', status);
        counts[status] = count || 0;
        total += count || 0;
      }

      // Fetch aggregate email stats in pages to avoid 1000-row limit
      let totalEmailsSent = 0;
      const leadIdsEmailed = new Set<string>();
      let offset = 0;
      const batchSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data: batch } = await supabase
          .from('sequences')
          .select('current_step, lead_id')
          .gt('current_step', 0)
          .range(offset, offset + batchSize - 1);

        if (!batch || batch.length === 0) {
          hasMore = false;
        } else {
          for (const s of batch) {
            totalEmailsSent += s.current_step || 0;
            leadIdsEmailed.add(s.lead_id);
          }
          offset += batchSize;
          if (batch.length < batchSize) hasMore = false;
        }
      }

      return { ...counts, total, totalEmailsSent, leadsEmailed: leadIdsEmailed.size };
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const createSequence = useMutation({
    mutationFn: async (formData: SequenceFormData) => {
      if (!user) throw new Error('Not authenticated');

      const firstDelay = formData.steps[0]?.delay_days ?? 0;
      const results = [];

      for (const leadId of formData.lead_ids) {
        const nextSend = new Date();
        nextSend.setDate(nextSend.getDate() + firstDelay);

        const { data, error } = await supabase
          .from('sequences')
          .insert({
            user_id: user.id,
            lead_id: leadId,
            name: formData.name,
            template_id: formData.steps[0].template_id,
            max_followups: formData.steps.length,
            interval_days: firstDelay,
            current_step: 0,
            status: 'active',
            sender: formData.sender,
            next_send_at: nextSend.toISOString(),
          } as any)
          .select()
          .single();
        if (error) throw error;

        const stepsToInsert = formData.steps.map((step, idx) => ({
          sequence_id: data.id,
          template_id: step.template_id,
          step_number: idx + 1,
          delay_days: step.delay_days,
        }));

        const { error: stepsErr } = await supabase
          .from('sequence_steps')
          .insert(stepsToInsert);
        if (stepsErr) throw stepsErr;

        results.push(data);
      }

      // Auto-update leads with status "new" to "contacted" when added to a sequence
      const newLeadIds = formData.lead_ids;
      if (newLeadIds.length > 0) {
        await supabase
          .from('leads')
          .update({ status: 'contacted' } as any)
          .in('id', newLeadIds)
          .eq('status', 'new');
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      queryClient.invalidateQueries({ queryKey: ['sequences-counts'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Sequence started');
    },
    onError: (error) => {
      toast.error('Failed to create sequence: ' + error.message);
    },
  });

  const updateSequenceStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SequenceStatus }) => {
      const { error } = await supabase
        .from('sequences')
        .update({ status } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      queryClient.invalidateQueries({ queryKey: ['sequences-counts'] });
      toast.success('Sequence updated');
    },
    onError: (error) => {
      toast.error('Failed to update sequence: ' + error.message);
    },
  });

  const bulkUpdateStatus = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: SequenceStatus }) => {
      const { error } = await supabase
        .from('sequences')
        .update({ status } as any)
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, { ids, status }) => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      queryClient.invalidateQueries({ queryKey: ['sequences-counts'] });
      toast.success(`${ids.length} sequence(s) ${status === 'paused' ? 'paused' : status === 'active' ? 'resumed' : 'updated'}`);
    },
    onError: (error) => {
      toast.error('Failed to update sequences: ' + error.message);
    },
  });

  const deleteSequence = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('sequence_steps').delete().eq('sequence_id', id);
      const { error } = await supabase.from('sequences').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      queryClient.invalidateQueries({ queryKey: ['sequences-counts'] });
      toast.success('Sequence deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete sequence: ' + error.message);
    },
  });

  return {
    sequences: data?.sequences || [],
    totalCount: data?.totalCount || 0,
    statusCounts: statusCounts || { active: 0, paused: 0, completed: 0, replied: 0, total: 0 },
    isLoading,
    error,
    createSequence,
    updateSequenceStatus,
    bulkUpdateStatus,
    deleteSequence,
  };
}
