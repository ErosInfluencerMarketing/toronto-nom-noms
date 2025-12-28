import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Template, TemplateFormData } from '@/types/template';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['templates', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Template[];
    },
    enabled: !!user,
  });

  const createTemplate = useMutation({
    mutationFn: async (templateData: TemplateFormData) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('templates')
        .insert({
          ...templateData,
          user_id: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create template: ' + error.message);
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...templateData }: Partial<Template> & { id: string }) => {
      const { data, error } = await supabase
        .from('templates')
        .update(templateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update template: ' + error.message);
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete template: ' + error.message);
    },
  });

  return {
    templates,
    isLoading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
}
