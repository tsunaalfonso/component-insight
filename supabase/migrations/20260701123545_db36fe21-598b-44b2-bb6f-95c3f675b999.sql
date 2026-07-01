
-- =========================================================
-- Enums
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.diagnosis_status AS ENUM ('pending', 'healthy', 'defective', 'severe', 'unknown');
CREATE TYPE public.diagnosis_source AS ENUM ('upload', 'camera');

-- =========================================================
-- profiles
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  approved BOOLEAN NOT NULL DEFAULT false,
  disabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- user_roles
-- =========================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- has_role() security-definer
-- =========================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- =========================================================
-- diagnoses
-- =========================================================
CREATE TABLE public.diagnoses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_path TEXT,
  source public.diagnosis_source NOT NULL DEFAULT 'upload',
  component_name TEXT,
  package_type TEXT,
  manufacturer TEXT,
  visible_damage JSONB DEFAULT '[]'::jsonb,
  severity TEXT,
  possible_cause TEXT,
  confidence NUMERIC(5,2),
  summary TEXT,
  recommendation TEXT,
  repairability TEXT,
  status public.diagnosis_status NOT NULL DEFAULT 'pending',
  raw_analysis JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diagnoses TO authenticated;
GRANT ALL ON public.diagnoses TO service_role;
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_diagnoses_user ON public.diagnoses(user_id);
CREATE INDEX idx_diagnoses_created ON public.diagnoses(created_at DESC);

-- =========================================================
-- reports
-- =========================================================
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id UUID NOT NULL REFERENCES public.diagnoses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdf_url TEXT NOT NULL,
  pdf_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- system_logs
-- =========================================================
CREATE TABLE public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.system_logs TO authenticated;
GRANT ALL ON public.system_logs TO service_role;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- Policies: profiles
-- =========================================================
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- Policies: user_roles
-- =========================================================
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- Policies: diagnoses
-- =========================================================
CREATE POLICY "Users can view their own diagnoses"
  ON public.diagnoses FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all diagnoses"
  ON public.diagnoses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert their own diagnoses"
  ON public.diagnoses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own diagnoses"
  ON public.diagnoses FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own diagnoses"
  ON public.diagnoses FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete any diagnosis"
  ON public.diagnoses FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- Policies: reports
-- =========================================================
CREATE POLICY "Users can view their own reports"
  ON public.reports FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all reports"
  ON public.reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert their own reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reports"
  ON public.reports FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- =========================================================
-- Policies: system_logs
-- =========================================================
CREATE POLICY "Admins can view logs"
  ON public.system_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert their own logs"
  ON public.system_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- =========================================================
-- Signup trigger: create profile + auto-promote admin
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_default_admin BOOLEAN := lower(NEW.email) = 'shernanjerk@gmail.com';
BEGIN
  INSERT INTO public.profiles (id, email, name, approved)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    is_default_admin
  );

  IF is_default_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- updated_at trigger for profiles
-- =========================================================
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
