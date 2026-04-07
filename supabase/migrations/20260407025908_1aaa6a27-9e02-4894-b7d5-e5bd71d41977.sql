
-- Create storage bucket for email attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('email-attachments', 'email-attachments', false);

-- RLS: authenticated users can upload files
CREATE POLICY "Users can upload attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'email-attachments');

-- RLS: authenticated users can read their own files (path starts with their user id)
CREATE POLICY "Users can read own attachments" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'email-attachments' AND (auth.uid()::text = (storage.foldername(name))[1]));

-- RLS: authenticated users can delete their own files
CREATE POLICY "Users can delete own attachments" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'email-attachments' AND (auth.uid()::text = (storage.foldername(name))[1]));

-- Create email_attachments metadata table
CREATE TABLE public.email_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  file_size INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create attachments" ON public.email_attachments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own attachments" ON public.email_attachments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own attachments" ON public.email_attachments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Junction table: template default attachments
CREATE TABLE public.template_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  attachment_id UUID NOT NULL REFERENCES public.email_attachments(id) ON DELETE CASCADE,
  UNIQUE(template_id, attachment_id)
);

ALTER TABLE public.template_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage template attachments" ON public.template_attachments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.templates WHERE id = template_attachments.template_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.templates WHERE id = template_attachments.template_id AND user_id = auth.uid()));
