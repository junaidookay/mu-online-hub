import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import { SEOHead } from '@/components/SEOHead';
import { ExternalLink, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClickTracking } from '@/hooks/useClickTracking';
import type { Tables } from '@/integrations/supabase/types';
import { useNavigate } from 'react-router-dom';
import { getSlotRedirectUrl } from '@/lib/slotConfig';
import { normalizeExternalUrl } from '@/lib/utils';

type Advertisement = Tables<'advertisements'>;

const fallbackAds = [
  { id: '1', title: 'Arcana GRAND OPENING', description: 'xp rates 9000 x', website: 'arcana-files.com', banner_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=268&h=60&fit=crop', vip_level: 'gold' as const },
  { id: '2', title: 'MU Premium Files', description: 'Season 17 Part 2', website: 'mupremium.net', banner_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=268&h=60&fit=crop', vip_level: 'diamond' as const },
  { id: '3', title: 'Dragon MU Store', description: 'Custom Systems', website: 'dragonmu-store.com', banner_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=268&h=60&fit=crop', vip_level: 'none' as const },
];

const MarketplaceAds = () => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { trackAdClick } = useClickTracking();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAds = async () => {
      const { data } = await supabase
        .from('advertisements')
        .select('*')
        .eq('is_active', true)
        .eq('ad_type', 'marketplace')
        .order('rotation_order');
      
      if (data && data.length > 0) {
        setAds(data);
      }
    };
    fetchAds();
  }, []);

  const displayAds = ads.length > 0 ? ads : fallbackAds;
  const filteredAds = displayAds.filter(ad =>
    ad.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ad.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <SEOHead 
        title="MU Online Marketplace Ads | Arcana"
        description="Browse marketplace advertisements for MU Online websites, server files, antihack solutions and more."
      />
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-primary mb-2">MU Online Marketplace Advertise</h1>
            <p className="text-muted-foreground">Websites, Server Files, Antihack etc.</p>
          </div>

          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Search ads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="secondary" onClick={() => navigate(getSlotRedirectUrl(1))}>
              <Plus size={18} className="mr-2" />
              Place Your Ad
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAds.map((ad) => {
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
                <div className="p-4 bg-muted/30 rounded-lg border border-border/30 hover:border-primary/50 transition-colors">
                  {ad.vip_level && ad.vip_level !== 'none' && (
                    <span className={`vip-badge ${ad.vip_level === 'gold' ? 'vip-gold' : 'vip-diamond'} mb-2 inline-block`}>
                      VIP {ad.vip_level.toUpperCase()}
                    </span>
                  )}
                  {ad.banner_url && (
                    <img 
                      src={ad.banner_url} 
                      alt={ad.title}
                      className="w-full h-32 object-cover rounded mb-3"
                    />
                  )}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{ad.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{ad.description}</p>
                    </div>
                    <ExternalLink size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                </div>
                </CardComponent>
              );
            })}
          </div>

          {filteredAds.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No ads found matching your search.
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default MarketplaceAds;
