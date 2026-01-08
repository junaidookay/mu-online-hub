import { supabase } from '@/integrations/supabase/client';

export const useClickTracking = () => {
  const trackAdClick = (adId: string, _website: string) => {
    // Track click asynchronously (don't block navigation - anchor tag handles it)
    supabase.functions.invoke('track-click', {
      body: { adId },
    }).catch(console.error);
  };

  const trackServerClick = (serverId: string, _website: string) => {
    // Track click asynchronously (don't block navigation - anchor tag handles it)
    supabase.functions.invoke('track-click', {
      body: { serverId },
    }).catch(console.error);
  };

  return { trackAdClick, trackServerClick };
};