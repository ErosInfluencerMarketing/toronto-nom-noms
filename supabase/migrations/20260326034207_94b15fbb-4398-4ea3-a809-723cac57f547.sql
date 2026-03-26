
CREATE TYPE public.email_engagement_type AS ENUM ('none', 'sent', 'opened', 'clicked', 'replied');

ALTER TABLE public.leads ADD COLUMN email_engagement public.email_engagement_type NOT NULL DEFAULT 'none';
