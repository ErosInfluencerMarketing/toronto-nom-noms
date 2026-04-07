
-- Create restaurant_groups table
CREATE TABLE public.restaurant_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add group_id column to leads
ALTER TABLE public.leads ADD COLUMN group_id uuid REFERENCES public.restaurant_groups(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.restaurant_groups ENABLE ROW LEVEL SECURITY;

-- RLS policies for restaurant_groups
CREATE POLICY "Users can view groups" ON public.restaurant_groups
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR user_id = auth.uid());

CREATE POLICY "Users can create groups" ON public.restaurant_groups
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update groups" ON public.restaurant_groups
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR user_id = auth.uid());

CREATE POLICY "Users can delete groups" ON public.restaurant_groups
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin') OR user_id = auth.uid());

-- Updated_at trigger
CREATE TRIGGER update_restaurant_groups_updated_at
  BEFORE UPDATE ON public.restaurant_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
