-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('banners', 'banners', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('server-banners', 'server-banners', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('ad-banners', 'ad-banners', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

-- RLS policies for banners bucket (admin only for premium banners)
CREATE POLICY "Admin can upload premium banners"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'banners' AND public.is_admin());

CREATE POLICY "Admin can update premium banners"
ON storage.objects FOR UPDATE
USING (bucket_id = 'banners' AND public.is_admin());

CREATE POLICY "Admin can delete premium banners"
ON storage.objects FOR DELETE
USING (bucket_id = 'banners' AND public.is_admin());

CREATE POLICY "Anyone can view premium banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'banners');

-- RLS policies for server-banners bucket (users can manage their own)
CREATE POLICY "Users can upload server banners"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'server-banners' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their server banners"
ON storage.objects FOR UPDATE
USING (bucket_id = 'server-banners' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their server banners"
ON storage.objects FOR DELETE
USING (bucket_id = 'server-banners' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view server banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'server-banners');

-- RLS policies for ad-banners bucket (users can manage their own)
CREATE POLICY "Users can upload ad banners"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'ad-banners' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their ad banners"
ON storage.objects FOR UPDATE
USING (bucket_id = 'ad-banners' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their ad banners"
ON storage.objects FOR DELETE
USING (bucket_id = 'ad-banners' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view ad banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'ad-banners');

-- Create payments table for Stripe integration
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending',
  product_type TEXT NOT NULL,
  product_id UUID,
  duration_days INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);

-- Enable RLS on payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can view their own payments
CREATE POLICY "Users can view their own payments"
ON public.payments FOR SELECT
USING (auth.uid() = user_id);

-- System can insert payments (via edge function with service role)
CREATE POLICY "Service role can manage payments"
ON public.payments FOR ALL
USING (true)
WITH CHECK (true);

-- Create pricing_packages table
CREATE TABLE public.pricing_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  product_type TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  features TEXT[],
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on pricing_packages
ALTER TABLE public.pricing_packages ENABLE ROW LEVEL SECURITY;

-- Anyone can view active packages
CREATE POLICY "Anyone can view active packages"
ON public.pricing_packages FOR SELECT
USING (is_active = true);

-- Admin can manage packages
CREATE POLICY "Admin can manage packages"
ON public.pricing_packages FOR ALL
USING (public.is_admin());

-- Insert default pricing packages
INSERT INTO public.pricing_packages (name, description, product_type, duration_days, price_cents, features, display_order) VALUES
('Premium Listing - 7 Days', 'Get your server featured in the top listings', 'premium_listing', 7, 499, ARRAY['Top placement', 'Highlighted border', 'Priority display'], 1),
('Premium Listing - 15 Days', 'Get your server featured in the top listings', 'premium_listing', 15, 899, ARRAY['Top placement', 'Highlighted border', 'Priority display'], 2),
('Premium Listing - 30 Days', 'Get your server featured in the top listings', 'premium_listing', 30, 1499, ARRAY['Top placement', 'Highlighted border', 'Priority display'], 3),
('VIP Gold - 7 Days', 'Gold VIP badge and enhanced visibility', 'vip_gold', 7, 999, ARRAY['Gold VIP badge', 'Enhanced visibility', 'Featured in rotation'], 4),
('VIP Gold - 15 Days', 'Gold VIP badge and enhanced visibility', 'vip_gold', 15, 1799, ARRAY['Gold VIP badge', 'Enhanced visibility', 'Featured in rotation'], 5),
('VIP Gold - 30 Days', 'Gold VIP badge and enhanced visibility', 'vip_gold', 30, 2999, ARRAY['Gold VIP badge', 'Enhanced visibility', 'Featured in rotation'], 6),
('VIP Diamond - 7 Days', 'Diamond VIP with maximum exposure', 'vip_diamond', 7, 1999, ARRAY['Diamond VIP badge', 'Maximum exposure', 'Premium banner slot'], 7),
('VIP Diamond - 15 Days', 'Diamond VIP with maximum exposure', 'vip_diamond', 15, 3499, ARRAY['Diamond VIP badge', 'Maximum exposure', 'Premium banner slot'], 8),
('VIP Diamond - 30 Days', 'Diamond VIP with maximum exposure', 'vip_diamond', 30, 5999, ARRAY['Diamond VIP badge', 'Maximum exposure', 'Premium banner slot'], 9),
('Top Banner - 7 Days', 'Your banner at the top of the homepage', 'top_banner', 7, 2499, ARRAY['Homepage banner', 'Maximum visibility', 'Click tracking'], 10),
('Top Banner - 15 Days', 'Your banner at the top of the homepage', 'top_banner', 15, 4499, ARRAY['Homepage banner', 'Maximum visibility', 'Click tracking'], 11),
('Top Banner - 30 Days', 'Your banner at the top of the homepage', 'top_banner', 30, 7999, ARRAY['Homepage banner', 'Maximum visibility', 'Click tracking'], 12),
('Rotating Promo - 7 Days', 'Featured promotional message', 'rotating_promo', 7, 799, ARRAY['Rotating display', 'Custom message', 'Link included'], 13),
('Rotating Promo - 15 Days', 'Featured promotional message', 'rotating_promo', 15, 1399, ARRAY['Rotating display', 'Custom message', 'Link included'], 14),
('Rotating Promo - 30 Days', 'Featured promotional message', 'rotating_promo', 30, 2499, ARRAY['Rotating display', 'Custom message', 'Link included'], 15);