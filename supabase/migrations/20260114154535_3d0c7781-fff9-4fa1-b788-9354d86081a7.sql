-- Create reviews table for marketplace listings
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES public.listing_purchases(id),
  reviewer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_stats table for tracking XP and badges
CREATE TABLE public.user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_spent_cents INTEGER DEFAULT 0,
  total_earned_cents INTEGER DEFAULT 0,
  purchases_count INTEGER DEFAULT 0,
  sales_count INTEGER DEFAULT 0,
  buyer_xp INTEGER DEFAULT 0,
  seller_xp INTEGER DEFAULT 0,
  buyer_level INTEGER DEFAULT 1,
  seller_level INTEGER DEFAULT 1,
  badges TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create seller_payouts table for tracking payout history
CREATE TABLE public.seller_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  purchase_id UUID REFERENCES public.listing_purchases(id),
  listing_id UUID REFERENCES public.listings(id),
  amount_cents INTEGER NOT NULL,
  platform_fee_cents INTEGER DEFAULT 0,
  net_amount_cents INTEGER NOT NULL,
  stripe_transfer_id TEXT,
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_payouts ENABLE ROW LEVEL SECURITY;

-- Reviews policies
CREATE POLICY "Reviews are viewable by everyone" 
ON public.reviews FOR SELECT 
USING (true);

CREATE POLICY "Buyers can create reviews for their purchases" 
ON public.reviews FOR INSERT 
WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Buyers can update their own reviews" 
ON public.reviews FOR UPDATE 
USING (auth.uid() = reviewer_id);

CREATE POLICY "Buyers can delete their own reviews or admins" 
ON public.reviews FOR DELETE 
USING (auth.uid() = reviewer_id OR is_admin());

-- User stats policies
CREATE POLICY "User stats are viewable by everyone" 
ON public.user_stats FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own stats" 
ON public.user_stats FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all stats" 
ON public.user_stats FOR ALL 
USING (true);

-- Seller payouts policies
CREATE POLICY "Sellers can view their own payouts" 
ON public.seller_payouts FOR SELECT 
USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "Service role can manage payouts" 
ON public.seller_payouts FOR ALL 
USING (true);

-- Add seller_id column to listing_purchases for easier querying
ALTER TABLE public.listing_purchases ADD COLUMN IF NOT EXISTS seller_id UUID;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_listing_id ON public.reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_reviews_seller_id ON public.reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON public.reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON public.user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_payouts_user_id ON public.seller_payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_listing_purchases_seller_id ON public.listing_purchases(seller_id);

-- Create function to update user stats after purchase completion
CREATE OR REPLACE FUNCTION public.update_user_stats_on_purchase()
RETURNS TRIGGER AS $$
DECLARE
  xp_earned INTEGER;
  buyer_badges TEXT[];
  seller_badges TEXT[];
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Calculate XP (1 XP per dollar spent)
    xp_earned := NEW.amount / 100;
    
    -- Update buyer stats
    INSERT INTO public.user_stats (user_id, total_spent_cents, purchases_count, buyer_xp)
    VALUES (NEW.user_id, NEW.amount, 1, xp_earned)
    ON CONFLICT (user_id) DO UPDATE SET
      total_spent_cents = user_stats.total_spent_cents + NEW.amount,
      purchases_count = user_stats.purchases_count + 1,
      buyer_xp = user_stats.buyer_xp + xp_earned,
      buyer_level = CASE 
        WHEN user_stats.buyer_xp + xp_earned >= 1000 THEN 5
        WHEN user_stats.buyer_xp + xp_earned >= 500 THEN 4
        WHEN user_stats.buyer_xp + xp_earned >= 200 THEN 3
        WHEN user_stats.buyer_xp + xp_earned >= 100 THEN 2
        ELSE 1
      END,
      updated_at = now();
    
    -- Update seller stats if seller_id is set
    IF NEW.seller_id IS NOT NULL THEN
      INSERT INTO public.user_stats (user_id, total_earned_cents, sales_count, seller_xp)
      VALUES (NEW.seller_id, NEW.amount, 1, xp_earned)
      ON CONFLICT (user_id) DO UPDATE SET
        total_earned_cents = user_stats.total_earned_cents + NEW.amount,
        sales_count = user_stats.sales_count + 1,
        seller_xp = user_stats.seller_xp + xp_earned,
        seller_level = CASE 
          WHEN user_stats.seller_xp + xp_earned >= 1000 THEN 5
          WHEN user_stats.seller_xp + xp_earned >= 500 THEN 4
          WHEN user_stats.seller_xp + xp_earned >= 200 THEN 3
          WHEN user_stats.seller_xp + xp_earned >= 100 THEN 2
          ELSE 1
        END,
        updated_at = now();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for updating stats
CREATE TRIGGER on_purchase_completed
  AFTER UPDATE ON public.listing_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_stats_on_purchase();

-- Function to update badges based on thresholds
CREATE OR REPLACE FUNCTION public.update_user_badges()
RETURNS TRIGGER AS $$
DECLARE
  new_badges TEXT[] := '{}';
BEGIN
  -- Buyer badges
  IF NEW.total_spent_cents >= 10000 THEN -- $100+
    new_badges := array_append(new_badges, 'bronze_buyer');
  END IF;
  IF NEW.total_spent_cents >= 50000 THEN -- $500+
    new_badges := array_append(new_badges, 'silver_buyer');
  END IF;
  IF NEW.total_spent_cents >= 100000 THEN -- $1000+
    new_badges := array_append(new_badges, 'gold_buyer');
  END IF;
  
  -- Seller badges
  IF NEW.total_earned_cents >= 10000 THEN -- $100+
    new_badges := array_append(new_badges, 'bronze_seller');
  END IF;
  IF NEW.total_earned_cents >= 50000 THEN -- $500+
    new_badges := array_append(new_badges, 'silver_seller');
  END IF;
  IF NEW.total_earned_cents >= 100000 THEN -- $1000+
    new_badges := array_append(new_badges, 'gold_seller');
  END IF;
  
  -- Trusted badges
  IF NEW.sales_count >= 10 THEN
    new_badges := array_append(new_badges, 'trusted_seller');
  END IF;
  IF NEW.purchases_count >= 10 THEN
    new_badges := array_append(new_badges, 'loyal_buyer');
  END IF;
  
  NEW.badges := new_badges;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER on_stats_update_badges
  BEFORE UPDATE ON public.user_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_badges();