import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TeamMember {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  created_at: string;
}

export function useTeamMembers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: async (): Promise<TeamMember[]> => {
      // Get all profiles
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('id, email, full_name, created_at');
      if (pErr) throw pErr;

      // Get all roles
      const { data: roles, error: rErr } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (rErr) throw rErr;

      const roleMap = new Map<string, string>();
      roles?.forEach((r: any) => roleMap.set(r.user_id, r.role));

      return (profiles ?? []).map((p: any) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        role: roleMap.get(p.id) ?? 'user',
        created_at: p.created_at,
      }));
    },
    enabled: !!user,
  });

  const { data: invites = [], isLoading: invitesLoading } = useQuery({
    queryKey: ['user-invites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_invites')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const sendInvite = useMutation({
    mutationFn: async (email: string) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase.functions.invoke('send-invite', {
        body: { email },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-invites'] });
      toast.success('Invite sent successfully!');
    },
    onError: (err) => {
      toast.error('Failed to send invite: ' + err.message);
    },
  });

  const assignLeads = useMutation({
    mutationFn: async ({ leadIds, userId }: { leadIds: string[]; userId: string }) => {
      const { error } = await supabase
        .from('leads')
        .update({ assigned_user_id: userId } as any)
        .in('id', leadIds);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Leads assigned successfully');
    },
    onError: (err) => {
      toast.error('Failed to assign leads: ' + err.message);
    },
  });

  return { members, isLoading, invites, invitesLoading, sendInvite, assignLeads };
}
