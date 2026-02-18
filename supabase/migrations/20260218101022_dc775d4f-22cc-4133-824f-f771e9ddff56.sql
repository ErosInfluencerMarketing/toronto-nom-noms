
-- 1. Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. RLS on user_roles
CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. Assign admin role to hello@erosmarketing.io
INSERT INTO public.user_roles (user_id, role)
VALUES ('ca08dec5-5027-4897-bfbf-057495aa3552', 'admin');

-- 6. Add assigned_user_id to leads
ALTER TABLE public.leads ADD COLUMN assigned_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Set existing leads' assigned_user_id to their creator
UPDATE public.leads SET assigned_user_id = user_id WHERE assigned_user_id IS NULL;

-- 7. Update leads RLS policies
DROP POLICY "Users can view their own leads" ON public.leads;
CREATE POLICY "Users can view leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR assigned_user_id = auth.uid() OR user_id = auth.uid());

DROP POLICY "Users can update their own leads" ON public.leads;
CREATE POLICY "Users can update leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR assigned_user_id = auth.uid() OR user_id = auth.uid());

DROP POLICY "Users can create their own leads" ON public.leads;
CREATE POLICY "Users can create leads"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY "Users can delete their own leads" ON public.leads;
CREATE POLICY "Users can delete leads"
  ON public.leads FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

-- 8. Update sequences RLS - admin can see all, users see only their own
DROP POLICY "Users can view their own sequences" ON public.sequences;
CREATE POLICY "Users can view sequences"
  ON public.sequences FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

DROP POLICY "Users can update their own sequences" ON public.sequences;
CREATE POLICY "Users can update sequences"
  ON public.sequences FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

DROP POLICY "Users can delete their own sequences" ON public.sequences;
CREATE POLICY "Users can delete sequences"
  ON public.sequences FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR user_id = auth.uid());

-- 9. Create user_invites table
CREATE TABLE public.user_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  invited_by uuid REFERENCES auth.users(id) NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invites"
  ON public.user_invites FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 10. Update handle_new_user to also assign default 'user' role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  
  -- Assign 'user' role by default (skip if role already exists, e.g. admin)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN new;
END;
$$;
