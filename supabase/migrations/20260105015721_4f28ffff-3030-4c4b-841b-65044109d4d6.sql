-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create enum for ad types
CREATE TYPE public.ad_type AS ENUM ('marketplace', 'services');

-- Create enum for vip levels
CREATE TYPE public.vip_level AS ENUM ('none', 'gold', 'diamond');

-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create servers table
CREATE TABLE public.servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  season TEXT NOT NULL,
  part TEXT NOT NULL,
  exp_rate TEXT NOT NULL,
  features TEXT[] DEFAULT '{}',
  website TEXT NOT NULL,
  banner_url TEXT,
  is_premium BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  open_date DATE,
  expires_at TIMESTAMP WITH TIME ZONE,
  rotation_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create advertisements table
CREATE TABLE public.advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ad_type ad_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  website TEXT NOT NULL,
  banner_url TEXT,
  vip_level vip_level DEFAULT 'none',
  is_active BOOLEAN DEFAULT true,
  rotation_order INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create premium text servers table
CREATE TABLE public.premium_text_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exp_rate TEXT NOT NULL,
  version TEXT NOT NULL,
  website TEXT NOT NULL,
  open_date TEXT,
  is_active BOOLEAN DEFAULT true,
  rotation_order INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create partners table (admin only)
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  info TEXT,
  website TEXT NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create arcana projects table (admin only)
CREATE TABLE public.arcana_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  info TEXT,
  website TEXT NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create premium banners table (admin only)
CREATE TABLE public.premium_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  website TEXT NOT NULL,
  image_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rotating promos table
CREATE TABLE public.rotating_promos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_type TEXT NOT NULL CHECK (promo_type IN ('discount', 'event')),
  text TEXT NOT NULL,
  highlight TEXT NOT NULL,
  link TEXT,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_text_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arcana_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotating_promos ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids infinite recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
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

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
$$;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles policies (admin only for management)
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Only admins can manage roles" ON public.user_roles
  FOR ALL USING (public.is_admin());

-- Servers policies
CREATE POLICY "Active servers are viewable by everyone" ON public.servers
  FOR SELECT USING (is_active = true OR auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can create their own servers" ON public.servers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own servers" ON public.servers
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete their own servers" ON public.servers
  FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- Advertisements policies
CREATE POLICY "Active ads are viewable by everyone" ON public.advertisements
  FOR SELECT USING (is_active = true OR auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can create their own ads" ON public.advertisements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ads" ON public.advertisements
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete their own ads" ON public.advertisements
  FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- Premium text servers policies
CREATE POLICY "Active premium text servers are viewable by everyone" ON public.premium_text_servers
  FOR SELECT USING (is_active = true OR auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can create their own premium text servers" ON public.premium_text_servers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own premium text servers" ON public.premium_text_servers
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can delete their own premium text servers" ON public.premium_text_servers
  FOR DELETE USING (auth.uid() = user_id OR public.is_admin());

-- Partners policies (admin only for management, public read for active)
CREATE POLICY "Active partners are viewable by everyone" ON public.partners
  FOR SELECT USING (is_active = true OR public.is_admin());

CREATE POLICY "Only admins can manage partners" ON public.partners
  FOR ALL USING (public.is_admin());

-- Arcana projects policies
CREATE POLICY "Active arcana projects are viewable by everyone" ON public.arcana_projects
  FOR SELECT USING (is_active = true OR public.is_admin());

CREATE POLICY "Only admins can manage arcana projects" ON public.arcana_projects
  FOR ALL USING (public.is_admin());

-- Premium banners policies
CREATE POLICY "Active premium banners are viewable by everyone" ON public.premium_banners
  FOR SELECT USING (is_active = true OR public.is_admin());

CREATE POLICY "Only admins can manage premium banners" ON public.premium_banners
  FOR ALL USING (public.is_admin());

-- Rotating promos policies
CREATE POLICY "Active promos are viewable by everyone" ON public.rotating_promos
  FOR SELECT USING (is_active = true OR public.is_admin());

CREATE POLICY "Only admins can manage promos" ON public.rotating_promos
  FOR ALL USING (public.is_admin());

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  
  -- Assign default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_servers_updated_at
  BEFORE UPDATE ON public.servers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_advertisements_updated_at
  BEFORE UPDATE ON public.advertisements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_arcana_projects_updated_at
  BEFORE UPDATE ON public.arcana_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_premium_banners_updated_at
  BEFORE UPDATE ON public.premium_banners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();