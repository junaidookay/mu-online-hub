-- Create seller categories enum
CREATE TYPE public.seller_category AS ENUM ('websites', 'server_files', 'antihack', 'launchers', 'custom_scripts');

-- Create user_type enum for distinguishing buyers from sellers
CREATE TYPE public.user_type AS ENUM ('buyer', 'seller');

-- Add user_type to profiles
ALTER TABLE public.profiles ADD COLUMN user_type public.user_type DEFAULT 'buyer';

-- Create seller_categories table to track which categories a seller offers
CREATE TABLE public.seller_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category public.seller_category NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, category)
);

-- Enable RLS on seller_categories
ALTER TABLE public.seller_categories ENABLE ROW LEVEL SECURITY;

-- Create listings table for seller products/services
CREATE TABLE public.listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category public.seller_category NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price_usd DECIMAL(10,2),
  image_url TEXT,
  website TEXT,
  is_published BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on listings
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- Create listing_packages for premium publishing
CREATE TABLE public.listing_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  duration_days INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  features TEXT[],
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on listing_packages
ALTER TABLE public.listing_packages ENABLE ROW LEVEL SECURITY;

-- Create listing_purchases to track premium purchases for listings
CREATE TABLE public.listing_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  package_id UUID REFERENCES public.listing_packages(id),
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'pending',
  duration_days INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on listing_purchases
ALTER TABLE public.listing_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies for seller_categories
CREATE POLICY "Users can view their own seller categories"
ON public.seller_categories FOR SELECT
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Sellers can create their own categories"
ON public.seller_categories FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sellers can delete their own categories"
ON public.seller_categories FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for listings
CREATE POLICY "Published listings are viewable by everyone"
ON public.listings FOR SELECT
USING (is_published = true OR auth.uid() = user_id OR is_admin());

CREATE POLICY "Sellers can create their own listings"
ON public.listings FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sellers can update their own listings"
ON public.listings FOR UPDATE
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Sellers can delete their own listings"
ON public.listings FOR DELETE
USING (auth.uid() = user_id OR is_admin());

-- RLS Policies for listing_packages
CREATE POLICY "Anyone can view active packages"
ON public.listing_packages FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage packages"
ON public.listing_packages FOR ALL
USING (is_admin());

-- RLS Policies for listing_purchases
CREATE POLICY "Users can view their own purchases"
ON public.listing_purchases FOR SELECT
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Service role can manage purchases"
ON public.listing_purchases FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at on listings
CREATE TRIGGER update_listings_updated_at
BEFORE UPDATE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default listing packages
INSERT INTO public.listing_packages (name, description, duration_days, price_cents, features, display_order)
VALUES
  ('7 Days', 'Advertise your listing for 7 days', 7, 999, ARRAY['Featured on marketplace', 'Homepage visibility', 'Priority placement'], 1),
  ('14 Days', 'Advertise your listing for 14 days', 14, 1799, ARRAY['Featured on marketplace', 'Homepage visibility', 'Priority placement', 'Extended reach'], 2),
  ('30 Days', 'Advertise your listing for 30 days', 30, 2999, ARRAY['Featured on marketplace', 'Homepage visibility', 'Priority placement', 'Maximum exposure', 'Badge highlight'], 3);