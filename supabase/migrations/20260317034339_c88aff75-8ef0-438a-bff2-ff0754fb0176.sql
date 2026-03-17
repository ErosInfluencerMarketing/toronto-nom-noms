
CREATE TABLE public.influencers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  username text NOT NULL,
  platform text NOT NULL DEFAULT 'instagram',
  full_name text,
  bio text,
  profile_url text,
  profile_image_url text,
  followers_count integer DEFAULT 0,
  following_count integer DEFAULT 0,
  posts_count integer DEFAULT 0,
  engagement_rate numeric(5,2) DEFAULT 0,
  avg_likes integer DEFAULT 0,
  avg_comments integer DEFAULT 0,
  content_type text DEFAULT 'mixed',
  niche text DEFAULT 'food',
  city text DEFAULT 'Toronto',
  email text,
  website text,
  contact_method text,
  notes text,
  status text NOT NULL DEFAULT 'discovered',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, username, platform)
);

ALTER TABLE public.influencers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own influencers" ON public.influencers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create influencers" ON public.influencers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own influencers" ON public.influencers FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own influencers" ON public.influencers FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_influencers_updated_at BEFORE UPDATE ON public.influencers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
