import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useListingViews = (listingId: string | undefined) => {
  const { user } = useAuth();
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!listingId || hasTracked.current) return;

    const trackView = async () => {
      // Generate a simple hash for anonymous tracking
      const ipHash = Math.random().toString(36).substring(2, 15);

      const { error } = await supabase.from('listing_views').insert({
        listing_id: listingId,
        viewer_id: user?.id || null,
        ip_hash: ipHash,
      });

      if (!error) {
        hasTracked.current = true;
      }
    };

    // Small delay to avoid counting quick bounces
    const timeout = setTimeout(trackView, 2000);

    return () => clearTimeout(timeout);
  }, [listingId, user]);
};
