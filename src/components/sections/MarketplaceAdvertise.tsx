import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import SectionHeader from './SectionHeader';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClickTracking } from '@/hooks/useClickTracking';
import type { Tables } from '@/integrations/supabase/types';
import { normalizeExternalUrl } from '@/lib/utils';

type Advertisement = Tables<'advertisements'>;

const fallbackAds = [
  { id: '1', title: 'Arcana GRAND OPENING', description: 'xp rates 9000 x', website: 'arcana-files.com', banner_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=268&h=60&fit=crop', vip_level: 'gold' as const },
  { id: '2', title: 'MU Premium Files', description: 'Season 17 Part 2', website: 'mupremium.net', banner_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=268&h=60&fit=crop', vip_level: 'diamond' as const },
  { id: '3', title: 'Dragon MU Store', description: 'Custom Systems', website: 'dragonmu-store.com', banner_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=268&h=60&fit=crop', vip_level: 'none' as const },
];

const MarketplaceAdvertise = () => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const { trackAdClick } = useClickTracking();

  useEffect(() => {
    const fetchAds = async () => {
      const { data } = await supabase
        .from('advertisements')
        .select('*')
        .eq('is_active', true)
        .eq('ad_type', 'marketplace')
        .order('rotation_order');
      
      if (data && data.length > 0) {
        // Fair rotation - shuffle on each visit
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setAds(shuffled);
      }
    };
    fetchAds();
  }, []);

  const allAds = ads.length > 0 ? ads : fallbackAds;
  const displayAds = allAds.slice(0, 10);

  return (
    <div className="glass-card overflow-hidden flex flex-col">
      <SectionHeader 
        title="MU Online Marketplace Advertise" 
        subtitle="Websites, Server Files, Antihack etc."
      />
      <div className="flex-1 p-2 space-y-2 overflow-y-auto scrollbar-thin">
        {displayAds.map((ad) => {
          const href = normalizeExternalUrl(ad.website);
          const CardComponent = href ? 'a' : 'div';
          const cardProps = href
            ? ({
                href,
                target: '_blank',
                rel: 'noopener noreferrer',
                onClick: () => trackAdClick(ad.id, href),
              } as const)
            : undefined;

          return (
            <CardComponent
              key={ad.id}
              {...cardProps}
              className="ad-banner block relative group"
            >
            <div className="flex items-center gap-2 p-1.5 bg-muted/30 rounded border border-border/30">
              {ad.vip_level && ad.vip_level !== 'none' && (
                <span className={`vip-badge ${ad.vip_level === 'gold' ? 'vip-gold' : 'vip-diamond'} shrink-0`}>
                  VIP
                </span>
              )}
              {ad.banner_url && (
                <img 
                  src={ad.banner_url} 
                  alt={ad.title}
                  className="w-16 h-8 object-cover rounded shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{ad.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{ad.description}</p>
              </div>
              <ExternalLink size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
            </CardComponent>
          );
        })}
      </div>
      <div className="p-2 border-t border-border/30">
        <Button variant="outline" size="sm" className="w-full text-xs" asChild>
          <a href="/marketplace-ads">View All Marketplace Ads</a>
        </Button>
      </div>
    </div>
  );
};

export default MarketplaceAdvertise;
