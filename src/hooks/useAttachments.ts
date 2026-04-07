import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export interface Attachment {
  id: string;
  user_id: string;
  file_name: string;
  storage_path: string;
  content_type: string;
  file_size: number;
  created_at: string;
}

export function useAttachments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ['email_attachments', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('email_attachments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Attachment[];
    },
    enabled: !!user,
  });

  const uploadAttachment = async (file: File): Promise<Attachment | null> => {
    if (!user) return null;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const storagePath = `${user.id}/${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('email-attachments')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const { data, error: insertError } = await supabase
        .from('email_attachments')
        .insert({
          user_id: user.id,
          file_name: file.name,
          storage_path: storagePath,
          content_type: file.type || 'application/octet-stream',
          file_size: file.size,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['email_attachments'] });
      return data as Attachment;
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deleteAttachment = async (attachment: Attachment) => {
    try {
      await supabase.storage.from('email-attachments').remove([attachment.storage_path]);
      await supabase.from('email_attachments').delete().eq('id', attachment.id);
      queryClient.invalidateQueries({ queryKey: ['email_attachments'] });
      toast.success('Attachment deleted');
    } catch (err: any) {
      toast.error('Delete failed: ' + err.message);
    }
  };

  const getTemplateAttachments = async (templateId: string): Promise<Attachment[]> => {
    const { data, error } = await supabase
      .from('template_attachments')
      .select('attachment_id')
      .eq('template_id', templateId);
    if (error || !data || data.length === 0) return [];

    const ids = data.map((d: any) => d.attachment_id);
    const { data: atts, error: attErr } = await supabase
      .from('email_attachments')
      .select('*')
      .in('id', ids);
    if (attErr) return [];
    return atts as Attachment[];
  };

  const setTemplateAttachments = async (templateId: string, attachmentIds: string[]) => {
    // Remove all existing
    await supabase.from('template_attachments').delete().eq('template_id', templateId);
    // Insert new
    if (attachmentIds.length > 0) {
      const rows = attachmentIds.map((aid) => ({ template_id: templateId, attachment_id: aid }));
      await supabase.from('template_attachments').insert(rows);
    }
  };

  return {
    attachments,
    isLoading,
    uploading,
    uploadAttachment,
    deleteAttachment,
    getTemplateAttachments,
    setTemplateAttachments,
  };
}
