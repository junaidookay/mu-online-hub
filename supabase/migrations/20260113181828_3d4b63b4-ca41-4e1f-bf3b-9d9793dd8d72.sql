-- First, add new values to the seller_category enum
-- Note: We need to add the new categories
ALTER TYPE public.seller_category ADD VALUE IF NOT EXISTS 'mu_websites';
ALTER TYPE public.seller_category ADD VALUE IF NOT EXISTS 'mu_server_files';
ALTER TYPE public.seller_category ADD VALUE IF NOT EXISTS 'mu_protection';
ALTER TYPE public.seller_category ADD VALUE IF NOT EXISTS 'mu_app_developer';
ALTER TYPE public.seller_category ADD VALUE IF NOT EXISTS 'mu_launchers';
ALTER TYPE public.seller_category ADD VALUE IF NOT EXISTS 'mu_installers';
ALTER TYPE public.seller_category ADD VALUE IF NOT EXISTS 'mu_hosting';
ALTER TYPE public.seller_category ADD VALUE IF NOT EXISTS 'server_development';
ALTER TYPE public.seller_category ADD VALUE IF NOT EXISTS 'design_branding';
ALTER TYPE public.seller_category ADD VALUE IF NOT EXISTS 'skins_customization';
ALTER TYPE public.seller_category ADD VALUE IF NOT EXISTS 'media';
ALTER TYPE public.seller_category ADD VALUE IF NOT EXISTS 'promotion';
ALTER TYPE public.seller_category ADD VALUE IF NOT EXISTS 'streaming';
ALTER TYPE public.seller_category ADD VALUE IF NOT EXISTS 'content_creators';
ALTER TYPE public.seller_category ADD VALUE IF NOT EXISTS 'event_master';
ALTER TYPE public.seller_category ADD VALUE IF NOT EXISTS 'marketing_growth';

-- Add stripe_account_id to profiles for Stripe Connect
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_account_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_onboarding_complete boolean DEFAULT false;