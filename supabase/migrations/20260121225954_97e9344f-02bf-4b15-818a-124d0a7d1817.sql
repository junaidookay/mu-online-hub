-- Add slot_id to pricing_packages to link each package to a homepage slot
ALTER TABLE public.pricing_packages ADD COLUMN IF NOT EXISTS slot_id INTEGER;

-- Add slot_id to servers table
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS slot_id INTEGER;

-- Add slot_id to premium_text_servers table
ALTER TABLE public.premium_text_servers ADD COLUMN IF NOT EXISTS slot_id INTEGER;

-- Add slot_id to premium_banners table
ALTER TABLE public.premium_banners ADD COLUMN IF NOT EXISTS slot_id INTEGER;

-- Add slot_id to advertisements table
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS slot_id INTEGER;

-- Add slot_id to rotating_promos table
ALTER TABLE public.rotating_promos ADD COLUMN IF NOT EXISTS slot_id INTEGER;

-- Delete existing pricing packages to replace with slot-based ones
DELETE FROM public.pricing_packages;

-- Insert new slot-based packages
-- Slot 1: Marketplace Advertise
INSERT INTO public.pricing_packages (name, description, product_type, duration_days, price_cents, features, display_order, slot_id) VALUES
('Marketplace Ad - 7 Days', 'Premium advertising for marketplace listings', 'marketplace_ad', 7, 999, ARRAY['Create your listing', 'Activate your listing', 'Add your banner', 'Promote your product'], 1, 1),
('Marketplace Ad - 15 Days', 'Premium advertising for marketplace listings', 'marketplace_ad', 15, 1799, ARRAY['Create your listing', 'Activate your listing', 'Add your banner', 'Promote your product'], 2, 1),
('Marketplace Ad - 30 Days', 'Premium advertising for marketplace listings', 'marketplace_ad', 30, 2999, ARRAY['Create your listing', 'Activate your listing', 'Add your banner', 'Promote your product'], 3, 1);

-- Slot 2: Services Advertise
INSERT INTO public.pricing_packages (name, description, product_type, duration_days, price_cents, features, display_order, slot_id) VALUES
('Services Ad - 7 Days', 'Premium advertising for services listings', 'services_ad', 7, 999, ARRAY['Create your listing', 'Activate your listing', 'Add your banner', 'Promote your skill'], 4, 2),
('Services Ad - 15 Days', 'Premium advertising for services listings', 'services_ad', 15, 1799, ARRAY['Create your listing', 'Activate your listing', 'Add your banner', 'Promote your skill'], 5, 2),
('Services Ad - 30 Days', 'Premium advertising for services listings', 'services_ad', 30, 2999, ARRAY['Create your listing', 'Activate your listing', 'Add your banner', 'Promote your skill'], 6, 2);

-- Slot 3: Top 50 Servers
INSERT INTO public.pricing_packages (name, description, product_type, duration_days, price_cents, features, display_order, slot_id) VALUES
('Top 50 Server - 7 Days', 'Premium advertising for Top 50 slot', 'top50_server', 7, 1499, ARRAY['Create your listing', 'Activate your listing', 'Add your banner', 'Add server info', 'Promote your server'], 7, 3),
('Top 50 Server - 15 Days', 'Premium advertising for Top 50 slot', 'top50_server', 15, 2699, ARRAY['Create your listing', 'Activate your listing', 'Add your banner', 'Add server info', 'Promote your server'], 8, 3),
('Top 50 Server - 30 Days', 'Premium advertising for Top 50 slot', 'top50_server', 30, 4499, ARRAY['Create your listing', 'Activate your listing', 'Add your banner', 'Add server info', 'Promote your server'], 9, 3);

-- Slot 4: Premium Text Servers
INSERT INTO public.pricing_packages (name, description, product_type, duration_days, price_cents, features, display_order, slot_id) VALUES
('Premium Text Server - 7 Days', 'Premium advertising for text listing', 'premium_text', 7, 799, ARRAY['6 slots monthly', 'Add server info', 'VIP tag', 'Rotational placement', 'Promote your server'], 10, 4),
('Premium Text Server - 15 Days', 'Premium advertising for text listing', 'premium_text', 15, 1399, ARRAY['6 slots monthly', 'Add server info', 'VIP tag', 'Rotational placement', 'Promote your server'], 11, 4),
('Premium Text Server - 30 Days', 'Premium advertising for text listing', 'premium_text', 30, 2299, ARRAY['6 slots monthly', 'Add server info', 'VIP tag', 'Rotational placement', 'Promote your server'], 12, 4);

-- Slot 5: Main Banner
INSERT INTO public.pricing_packages (name, description, product_type, duration_days, price_cents, features, display_order, slot_id) VALUES
('Main Banner - 7 Days', 'Premium advertising main banner slot', 'main_banner', 7, 2499, ARRAY['3 slots monthly', 'Add server banner', 'Premium carousel display', 'Promote your server', 'Be 1 of the top 3'], 13, 5),
('Main Banner - 15 Days', 'Premium advertising main banner slot', 'main_banner', 15, 4499, ARRAY['3 slots monthly', 'Add server banner', 'Premium carousel display', 'Promote your server', 'Be 1 of the top 3'], 14, 5),
('Main Banner - 30 Days', 'Premium advertising main banner slot', 'main_banner', 30, 7499, ARRAY['3 slots monthly', 'Add server banner', 'Premium carousel display', 'Promote your server', 'Be 1 of the top 3'], 15, 5);

-- Slot 6: Upcoming & Recent Servers (FREE)
INSERT INTO public.pricing_packages (name, description, product_type, duration_days, price_cents, features, display_order, slot_id) VALUES
('Upcoming Server - FREE', 'Free advertising for upcoming servers', 'upcoming_server', 30, 0, ARRAY['Any server', '3 rotation earliest to open', '3 rotation online already', 'No banner'], 16, 6);

-- Slot 7: Partner Discounts
INSERT INTO public.pricing_packages (name, description, product_type, duration_days, price_cents, features, display_order, slot_id) VALUES
('Partner Discount - 7 Days', 'Premium advertising for discounts & promotions', 'partner_discount', 7, 1299, ARRAY['3 slots monthly', 'Add server banner', 'Promotional content', 'Time-limited visibility', 'Be 1 of the top 3'], 17, 7),
('Partner Discount - 15 Days', 'Premium advertising for discounts & promotions', 'partner_discount', 15, 2299, ARRAY['3 slots monthly', 'Add server banner', 'Promotional content', 'Time-limited visibility', 'Be 1 of the top 3'], 18, 7),
('Partner Discount - 30 Days', 'Premium advertising for discounts & promotions', 'partner_discount', 30, 3799, ARRAY['3 slots monthly', 'Add server banner', 'Promotional content', 'Time-limited visibility', 'Be 1 of the top 3'], 19, 7);

-- Slot 8: Server Events
INSERT INTO public.pricing_packages (name, description, product_type, duration_days, price_cents, features, display_order, slot_id) VALUES
('Server Event - 7 Days', 'Premium advertising for server events', 'server_event', 7, 999, ARRAY['Limited text info', 'Event date display', 'Event-based visibility', 'Promote any event'], 20, 8),
('Server Event - 15 Days', 'Premium advertising for server events', 'server_event', 15, 1799, ARRAY['Limited text info', 'Event date display', 'Event-based visibility', 'Promote any event'], 21, 8),
('Server Event - 30 Days', 'Premium advertising for server events', 'server_event', 30, 2999, ARRAY['Limited text info', 'Event date display', 'Event-based visibility', 'Promote any event'], 22, 8);

-- Create slot_purchases table to track which slots users have purchased
CREATE TABLE IF NOT EXISTS public.slot_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  package_id UUID REFERENCES public.pricing_packages(id),
  slot_id INTEGER NOT NULL,
  product_type TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on slot_purchases
ALTER TABLE public.slot_purchases ENABLE ROW LEVEL SECURITY;

-- RLS policies for slot_purchases
CREATE POLICY "Users can view their own slot purchases"
  ON public.slot_purchases FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Service role can manage slot purchases"
  ON public.slot_purchases FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for quick lookup
CREATE INDEX IF NOT EXISTS idx_slot_purchases_user ON public.slot_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_slot_purchases_slot ON public.slot_purchases(slot_id);
CREATE INDEX IF NOT EXISTS idx_slot_purchases_active ON public.slot_purchases(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_pricing_packages_slot ON public.pricing_packages(slot_id);