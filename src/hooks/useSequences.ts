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
      return data as unknown as Sequence[];
    },
    enabled: !!user,
  });

  const createSequence = useMutation({
    mutationFn: async (formData: SequenceFormData) => {
      if (!user) throw new Error('Not authenticated');
      const nextSend = new Date();
      nextSend.setDate(nextSend.getDate() + formData.interval_days);
      
      const { data, error } = await supabase
        .from('sequences')
        .insert({
          user_id: user.id,
          lead_id: formData.lead_id,
          template_id: formData.template_id,
          max_followups: formData.max_followups,
          interval_days: formData.interval_days,
          current_step: 0,
          status: 'active',
          next_send_at: nextSend.toISOString(),
        } as any)
        .select()
        .single();
      if (error) throw error;
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
      const { error } = await supabase
        .from('sequences')
        .delete()
        .eq('id', id);
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
