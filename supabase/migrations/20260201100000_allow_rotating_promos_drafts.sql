ALTER TABLE public.rotating_promos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create their own rotating promos" ON public.rotating_promos;
CREATE POLICY "Users can create their own rotating promos"
ON public.rotating_promos
FOR INSERT
WITH CHECK (
  public.is_admin()
  OR (
    auth.uid() = user_id
    AND slot_id IN (7, 8)
    AND (
      COALESCE(is_active, false) = false
      OR EXISTS (
        SELECT 1
        FROM public.slot_purchases sp
        WHERE sp.user_id = auth.uid()
          AND sp.slot_id = rotating_promos.slot_id
          AND sp.is_active = true
          AND (sp.expires_at IS NULL OR sp.expires_at > now())
      )
    )
    AND (
      (slot_id = 7 AND promo_type = 'discount' AND listing_id IS NOT NULL AND listing_type IN ('marketplace', 'services') AND COALESCE(is_active, false) = false)
      OR (slot_id = 8 AND promo_type = 'event')
    )
  )
);

DROP POLICY IF EXISTS "Users can update their own rotating promos" ON public.rotating_promos;
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
    AND (
      COALESCE(is_active, false) = false
      OR EXISTS (
        SELECT 1
        FROM public.slot_purchases sp
        WHERE sp.user_id = auth.uid()
          AND sp.slot_id = rotating_promos.slot_id
          AND sp.is_active = true
          AND (sp.expires_at IS NULL OR sp.expires_at > now())
      )
    )
    AND (
      (slot_id = 7 AND promo_type = 'discount' AND listing_id IS NOT NULL AND listing_type IN ('marketplace', 'services') AND COALESCE(is_active, false) = false)
      OR (slot_id = 8 AND promo_type = 'event')
    )
  )
);
