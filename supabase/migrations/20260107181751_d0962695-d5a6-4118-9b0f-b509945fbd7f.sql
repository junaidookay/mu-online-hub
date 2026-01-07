-- Add click tracking table for ads
CREATE TABLE public.ad_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_id UUID NOT NULL REFERENCES public.advertisements(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;

-- Anyone can insert clicks (anonymous tracking)
CREATE POLICY "Anyone can record ad clicks"
ON public.ad_clicks FOR INSERT
WITH CHECK (true);

-- Admins and ad owners can view clicks
CREATE POLICY "Ad owners and admins can view clicks"
ON public.ad_clicks FOR SELECT
USING (
  public.is_admin() OR 
  EXISTS (
    SELECT 1 FROM public.advertisements 
    WHERE advertisements.id = ad_clicks.ad_id 
    AND advertisements.user_id = auth.uid()
  )
);

-- Add click count to servers table for tracking
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;

-- Create index for efficient click counting
CREATE INDEX idx_ad_clicks_ad_id ON public.ad_clicks(ad_id);
CREATE INDEX idx_ad_clicks_clicked_at ON public.ad_clicks(clicked_at);

-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;