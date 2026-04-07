import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface RestaurantGroup {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export function useRestaurantGroups() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['restaurant_groups', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurant_groups')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as RestaurantGroup[];
    },
    enabled: !!user,
  });

  const createGroup = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('restaurant_groups')
        .insert({ name, description: description || null, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant_groups'] });
      toast.success('Group created');
    },
    onError: (e) => toast.error('Failed to create group: ' + e.message),
  });

  const updateGroup = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('restaurant_groups')
        .update({ name, description: description || null })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant_groups'] });
      toast.success('Group updated');
    },
    onError: (e) => toast.error('Failed to update group: ' + e.message),
  });

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('restaurant_groups')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant_groups'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Group deleted');
    },
    onError: (e) => toast.error('Failed to delete group: ' + e.message),
  });

  const assignLeadsToGroup = useMutation({
    mutationFn: async ({ leadIds, groupId }: { leadIds: string[]; groupId: string | null }) => {
      const { error } = await supabase
        .from('leads')
        .update({ group_id: groupId } as any)
        .in('id', leadIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant_groups'] });
      toast.success('Leads updated');
    },
    onError: (e) => toast.error('Failed to assign leads: ' + e.message),
  });

  return { groups, isLoading, createGroup, updateGroup, deleteGroup, assignLeadsToGroup };
}
