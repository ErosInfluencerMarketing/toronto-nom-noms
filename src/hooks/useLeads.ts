import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Lead, LeadFormData } from '@/types/lead';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useLeads() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ['leads', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!user,
  });

  const createLead = useMutation({
    mutationFn: async (leadData: LeadFormData) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('leads')
        .insert({
          ...leadData,
          user_id: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error) => {
      toast.error('Failed to create lead: ' + error.message);
    },
  });

  const bulkCreateLeads = useMutation({
    mutationFn: async (leadsData: LeadFormData[]) => {
      if (!user) throw new Error('Not authenticated');
      
      const leadsWithUserId = leadsData.map(lead => ({
        ...lead,
        user_id: user.id,
      }));

      const { data, error } = await supabase
        .from('leads')
        .insert(leadsWithUserId)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error) => {
      toast.error('Failed to import leads: ' + error.message);
    },
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, ...leadData }: Partial<Lead> & { id: string }) => {
      const { data, error } = await supabase
        .from('leads')
        .update(leadData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update lead: ' + error.message);
    },
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete lead: ' + error.message);
    },
  });

  return {
    leads,
    isLoading,
    error,
    createLead,
    updateLead,
    deleteLead,
    bulkCreateLeads,
  };
}
