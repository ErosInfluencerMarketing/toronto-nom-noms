
-- Create channel type enum
CREATE TYPE public.channel_type AS ENUM ('email', 'instagram');

-- Add channel column to templates
ALTER TABLE public.templates ADD COLUMN channel public.channel_type NOT NULL DEFAULT 'email';

-- Create sequences table
CREATE TABLE public.sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  max_followups INTEGER NOT NULL DEFAULT 3,
  interval_days INTEGER NOT NULL DEFAULT 2,
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  next_send_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Validation trigger for status instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_sequence_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'paused', 'completed', 'replied') THEN
    RAISE EXCEPTION 'Invalid sequence status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_sequence_status_trigger
BEFORE INSERT OR UPDATE ON public.sequences
FOR EACH ROW EXECUTE FUNCTION public.validate_sequence_status();

-- Updated_at trigger
CREATE TRIGGER update_sequences_updated_at
BEFORE UPDATE ON public.sequences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;

-- RLS policies for sequences
CREATE POLICY "Users can view their own sequences"
ON public.sequences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sequences"
ON public.sequences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sequences"
ON public.sequences FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sequences"
ON public.sequences FOR DELETE
USING (auth.uid() = user_id);
