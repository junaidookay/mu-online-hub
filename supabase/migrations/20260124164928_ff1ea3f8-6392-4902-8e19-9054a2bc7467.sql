-- Add user_id and listing_id columns to rotating_promos for Slot 7 Partner Discounts
-- This allows Slot 7 promos to be linked to existing marketplace/services listings

ALTER TABLE public.rotating_promos 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE public.rotating_promos 
ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES public.listings(id);

-- Add listing_type to know which type of listing is being promoted
ALTER TABLE public.rotating_promos 
ADD COLUMN IF NOT EXISTS listing_type TEXT CHECK (listing_type IN ('marketplace', 'services'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rotating_promos_user_id ON public.rotating_promos(user_id);
CREATE INDEX IF NOT EXISTS idx_rotating_promos_listing_id ON public.rotating_promos(listing_id);

-- Update RLS policies to allow users to manage their own promos
DROP POLICY IF EXISTS "Users can view all active promos" ON public.rotating_promos;
DROP POLICY IF EXISTS "Users can create their own promos" ON public.rotating_promos;
DROP POLICY IF EXISTS "Users can update their own promos" ON public.rotating_promos;
DROP POLICY IF EXISTS "Users can delete their own promos" ON public.rotating_promos;

-- Enable RLS
ALTER TABLE public.rotating_promos ENABLE ROW LEVEL SECURITY;

-- Anyone can view active promos
CREATE POLICY "Anyone can view active promos" 
ON public.rotating_promos 
FOR SELECT 
USING (is_active = true);

-- Users can create their own promos
CREATE POLICY "Users can create their own promos" 
ON public.rotating_promos 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own promos
CREATE POLICY "Users can update their own promos" 
ON public.rotating_promos 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own promos
CREATE POLICY "Users can delete their own promos" 
ON public.rotating_promos 
FOR DELETE 
USING (auth.uid() = user_id);

-- Admins can do everything
CREATE POLICY "Admins can manage all promos" 
ON public.rotating_promos 
FOR ALL 
USING (public.is_admin());