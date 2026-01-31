-- Fix rotating_promos RLS so authenticated sellers can create and manage their own promos/events

ALTER TABLE public.rotating_promos ENABLE ROW LEVEL SECURITY;

-- Drop any prior policies (names changed over time)
DROP POLICY IF EXISTS "Active promos are viewable by everyone" ON public.rotating_promos;
DROP POLICY IF EXISTS "Only admins can manage promos" ON public.rotating_promos;
DROP POLICY IF EXISTS "Anyone can view active promos" ON public.rotating_promos;
DROP POLICY IF EXISTS "Users can create their own promos" ON public.rotating_promos;
DROP POLICY IF EXISTS "Users can update their own promos" ON public.rotating_promos;
DROP POLICY IF EXISTS "Users can delete their own promos" ON public.rotating_promos;
DROP POLICY IF EXISTS "Admins can manage all promos" ON public.rotating_promos;

-- Public can see active promos; owners/admin can see their own (including drafts)
CREATE POLICY "Rotating promos are viewable by viewers and owners"
ON public.rotating_promos
FOR SELECT
USING (
  is_active = true
  OR auth.uid() = user_id
  OR public.is_admin()
);

-- Admins can manage all promos
CREATE POLICY "Admins can manage all rotating promos"
ON public.rotating_promos
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Users can create Slot 7/8 promos only when they have an active purchase
CREATE POLICY "Users can create their own rotating promos"
ON public.rotating_promos
FOR INSERT
WITH CHECK (
  public.is_admin()
  OR (
    auth.uid() = user_id
    AND slot_id IN (7, 8)
    AND EXISTS (
      SELECT 1
      FROM public.slot_purchases sp
      WHERE sp.user_id = auth.uid()
        AND sp.slot_id = rotating_promos.slot_id
        AND sp.is_active = true
        AND (sp.expires_at IS NULL OR sp.expires_at > now())
    )
    AND (
      (slot_id = 7 AND promo_type = 'discount' AND listing_id IS NOT NULL AND listing_type IN ('marketplace', 'services') AND is_active = false)
      OR (slot_id = 8 AND promo_type = 'event')
    )
  )
);

-- Owners/admin can update (users only for Slot 7/8 with active purchase)
CREATE POLICY "Users can update their own rotating promos"
ON public.rotating_promos
FOR UPDATE
USING (
  public.is_admin()
  OR (auth.uid() = user_id AND slot_id IN (7, 8))
)
WITH CHECK (
  public.is_admin()
  OR (
    auth.uid() = user_id
    AND slot_id IN (7, 8)
    AND EXISTS (
      SELECT 1
      FROM public.slot_purchases sp
      WHERE sp.user_id = auth.uid()
        AND sp.slot_id = rotating_promos.slot_id
        AND sp.is_active = true
        AND (sp.expires_at IS NULL OR sp.expires_at > now())
    )
    AND (
      (slot_id = 7 AND promo_type = 'discount' AND listing_id IS NOT NULL AND listing_type IN ('marketplace', 'services') AND is_active = false)
      OR (slot_id = 8 AND promo_type = 'event')
    )
  )
);

-- Owners/admin can delete (users only for Slot 7/8)
CREATE POLICY "Users can delete their own rotating promos"
ON public.rotating_promos
FOR DELETE
USING (
  public.is_admin()
  OR (auth.uid() = user_id AND slot_id IN (7, 8))
);
