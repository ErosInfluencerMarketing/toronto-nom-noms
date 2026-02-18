import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'user';

export function useUserRole() {
  const { user } = useAuth();

  const { data: role, isLoading } = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async (): Promise<AppRole> => {
      if (!user) return 'user';
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .limit(1)
        .single();
      if (error || !data) return 'user';
      return data.role as AppRole;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  return {
    role: role ?? 'user',
    isAdmin: role === 'admin',
    isLoading,
  };
}
