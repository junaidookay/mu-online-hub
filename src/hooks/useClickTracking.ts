import { supabase } from '@/integrations/supabase/client';

export const useClickTracking = () => {
  const trackAdClick = async (adId: string, website: string) => {
    // Track click asynchronously (don't block navigation)
    supabase.functions.invoke('track-click', {
      body: { adId },
    }).catch(console.error);

    // Navigate to website
    const url = website.startsWith('http') ? website : `https://${website}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const trackServerClick = async (serverId: string, website: string) => {
    // Track click asynchronously
    supabase.functions.invoke('track-click', {
      body: { serverId },
    }).catch(console.error);

    // Navigate to website
    const url = website.startsWith('http') ? website : `https://${website}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return { trackAdClick, trackServerClick };
};
