-- Create table for user payment methods (for buyers to save their preferred payment methods)
CREATE TABLE public.user_payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('stripe', 'paypal')),
  is_default BOOLEAN DEFAULT false,
  stripe_customer_id TEXT,
  stripe_payment_method_id TEXT,
  paypal_email TEXT,
  last_four TEXT,
  card_brand TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for seller payment preferences (which methods they accept)
CREATE TABLE public.seller_payment_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  stripe_enabled BOOLEAN DEFAULT false,
  paypal_enabled BOOLEAN DEFAULT false,
  paypal_email TEXT,
  preferred_method TEXT CHECK (preferred_method IN ('stripe', 'paypal')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for admin payment configuration
CREATE TABLE public.payment_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key TEXT NOT NULL UNIQUE,
  config_value TEXT,
  is_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_payment_methods
CREATE POLICY "Users can view their own payment methods"
ON public.user_payment_methods
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payment methods"
ON public.user_payment_methods
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payment methods"
ON public.user_payment_methods
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own payment methods"
ON public.user_payment_methods
FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for seller_payment_settings
CREATE POLICY "Sellers can view their own payment settings"
ON public.seller_payment_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Sellers can create their own payment settings"
ON public.seller_payment_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Sellers can update their own payment settings"
ON public.seller_payment_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Public can view seller payment settings to know payment options
CREATE POLICY "Anyone can view seller payment settings"
ON public.seller_payment_settings
FOR SELECT
USING (true);

-- RLS policies for payment_config (admin only via is_admin function)
CREATE POLICY "Admins can view payment config"
ON public.payment_config
FOR SELECT
USING (public.is_admin());

CREATE POLICY "Admins can manage payment config"
ON public.payment_config
FOR ALL
USING (public.is_admin());

-- Insert default payment config rows
INSERT INTO public.payment_config (config_key, config_value, is_enabled) VALUES
('stripe', NULL, true),
('paypal', NULL, false);

-- Add triggers for updated_at
CREATE TRIGGER update_user_payment_methods_updated_at
BEFORE UPDATE ON public.user_payment_methods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seller_payment_settings_updated_at
BEFORE UPDATE ON public.seller_payment_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();