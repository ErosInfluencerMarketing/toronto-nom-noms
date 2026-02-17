import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sequence, SequenceFormData, SequenceStatus } from '@/types/sequence';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useSequences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: sequences = [], isLoading, error } = useQuery({
    queryKey: ['sequences', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('sequences')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch steps for all sequences
      const seqIds = data.map((s: any) => s.id);
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

      return data.map((seq: any) => ({
        ...seq,
        steps: stepsBySeq[seq.id] || [],
      })) as unknown as Sequence[];
    },
    enabled: !!user,
  });

  const createSequence = useMutation({
    mutationFn: async (formData: SequenceFormData) => {
      if (!user) throw new Error('Not authenticated');

      const firstDelay = formData.steps[0]?.delay_days ?? 0;
      const nextSend = new Date();
      nextSend.setDate(nextSend.getDate() + firstDelay);

      const { data, error } = await supabase
        .from('sequences')
        .insert({
          user_id: user.id,
          lead_id: formData.lead_id,
          template_id: formData.steps[0].template_id,
          max_followups: formData.steps.length,
          interval_days: firstDelay,
          current_step: 0,
          status: 'active',
          next_send_at: nextSend.toISOString(),
        } as any)
        .select()
        .single();
      if (error) throw error;

      // Insert steps
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

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
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
      toast.success('Sequence updated');
    },
    onError: (error) => {
      toast.error('Failed to update sequence: ' + error.message);
    },
  });

  const deleteSequence = useMutation({
    mutationFn: async (id: string) => {
      // Delete steps first
      await supabase.from('sequence_steps').delete().eq('sequence_id', id);
      const { error } = await supabase.from('sequences').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      toast.success('Sequence deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete sequence: ' + error.message);
    },
  });

  return { sequences, isLoading, error, createSequence, updateSequenceStatus, deleteSequence };
}
