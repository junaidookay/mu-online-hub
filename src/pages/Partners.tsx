import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import { SEOHead } from '@/components/SEOHead';
import { ExternalLink, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { Tables } from '@/integrations/supabase/types';
import { normalizeExternalUrl } from '@/lib/utils';

type Partner = Tables<'partners'>;

const fallbackPartners = [
  { id: '1', name: 'Map Aquitas Templa', info: 'CHAOSMU X100 - S21 P1-2', image_url: 'https://images.unsplash.com/photo-1614854262318-831574f15f1f?w=100&h=60&fit=crop', website: 'chaosmu.com' },
  { id: '2', name: 'Map Aquitas Templa', info: 'CHAOSMU X100 - S21 P1-2 - OPEN 21 NOV', image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=100&h=60&fit=crop', website: 'chaosmu.com' },
];

const Partners = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPartners = async () => {
      const { data } = await supabase
        .from('partners')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (data) {
        setPartners(data);
      }
    };
    fetchPartners();
  }, []);

  const displayPartners = partners.length > 0 ? partners : fallbackPartners;
  const filteredPartners = displayPartners.filter(partner =>
    partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    partner.info?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <SEOHead 
        title="MU Online Partners | Arcana"
        description="Browse our official MU Online partner servers and communities."
      />
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-primary mb-2">MU Online Partners</h1>
            <p className="text-muted-foreground">Official partner servers and communities</p>
          </div>

          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Search partners..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPartners.map((partner) => {
              const href = normalizeExternalUrl(partner.website);
              const CardComponent = href ? 'a' : 'div';
              const cardProps = href
                ? ({
                    href,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                  } as const)
                : undefined;

              return (
                <CardComponent
                  key={partner.id}
                  {...cardProps}
                  className="block group"
                >
                <div className="p-4 bg-muted/30 rounded-lg border border-border/30 hover:border-secondary/50 transition-colors">
                  <div className="flex gap-4">
                    {partner.image_url && (
                      <img 
                        src={partner.image_url} 
                        alt={partner.name}
                        className="w-24 h-16 object-cover rounded shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded live-indicator">LIVE</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{partner.name}</p>
                      <p className="text-base font-semibold text-secondary">{partner.info}</p>
                    </div>
                    <ExternalLink size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                  </div>
                </div>
                </CardComponent>
              );
            })}
          </div>

          {filteredPartners.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No partners found matching your search.
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default Partners;
