import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Influencer {
  id: string;
  user_id: string;
  username: string;
  platform: string;
  full_name: string | null;
  bio: string | null;
  profile_url: string | null;
  profile_image_url: string | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
  engagement_rate: number;
  avg_likes: number;
  avg_comments: number;
  content_type: string;
  niche: string;
  city: string;
  email: string | null;
  website: string | null;
  contact_method: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useInfluencers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: influencers = [], isLoading } = useQuery({
    queryKey: ['influencers', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('influencers' as any)
        .select('*')
        .order('followers_count', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Influencer[];
    },
    enabled: !!user,
  });

  const discoverInfluencers = useMutation({
    mutationFn: async ({ query, platform, city }: { query?: string; platform?: string; city?: string }) => {
      const { data, error } = await supabase.functions.invoke('discover-influencers', {
        body: { query, platform, city },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['influencers'] });
      toast.success(`Discovered ${data.discovered} influencers`);
    },
    onError: (error) => {
      toast.error('Discovery failed: ' + error.message);
    },
  });

  const addInfluencer = useMutation({
    mutationFn: async ({ username, platform }: { username: string; platform: string }) => {
      const { data, error } = await supabase.functions.invoke('discover-influencers', {
        body: { manual_username: username, platform },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influencers'] });
      toast.success('Influencer added and enriched');
    },
    onError: (error) => {
      toast.error('Failed to add: ' + error.message);
    },
  });

  const updateInfluencer = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Influencer> & { id: string }) => {
      const { error } = await supabase
        .from('influencers' as any)
        .update(data as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influencers'] });
    },
  });

  const deleteInfluencer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('influencers' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['influencers'] });
      toast.success('Influencer removed');
    },
  });

  return { influencers, isLoading, discoverInfluencers, addInfluencer, updateInfluencer, deleteInfluencer };
}
