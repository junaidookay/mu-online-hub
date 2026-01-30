import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import SectionHeader from './SectionHeader';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Tables } from '@/integrations/supabase/types';
import { normalizeExternalUrl } from '@/lib/utils';

type Partner = Tables<'partners'>;

const fallbackPartners = [
  { id: '1', name: 'Map Aquitas Templa', info: 'CHAOSMU X100 - S21 P1-2', image_url: 'https://images.unsplash.com/photo-1614854262318-831574f15f1f?w=100&h=60&fit=crop', website: 'chaosmu.com' },
  { id: '2', name: 'Map Aquitas Templa', info: 'CHAOSMU X100 - S21 P1-2 - OPEN 21 NOV', image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=100&h=60&fit=crop', website: 'chaosmu.com' },
];

const PartnersSection = () => {
  const [partners, setPartners] = useState<Partner[]>([]);

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

  const allPartners = partners.length > 0 ? partners : fallbackPartners;
  const displayPartners = allPartners.slice(0, 10);

  return (
    <div className="glass-card overflow-hidden flex flex-col">
      <SectionHeader 
        title="MU Online Partners" 
        badge={<span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded live-indicator ml-2">LIVE</span>}
      />
      <div className="flex-1 p-2 space-y-2 overflow-y-auto scrollbar-thin">
        {displayPartners.map((partner) => {
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
              <div className="flex gap-2 p-1.5 bg-muted/30 rounded border border-border/30 hover:border-secondary/50 transition-colors">
                {partner.image_url && (
                  <img 
                    src={partner.image_url} 
                    alt={partner.name}
                    className="w-20 h-12 object-cover rounded shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground truncate">{partner.name}</p>
                  <p className="text-xs font-semibold text-secondary truncate">{partner.info}</p>
                </div>
                <ExternalLink size={10} className="text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
              </div>
            </CardComponent>
          );
        })}
      </div>
      <div className="p-2 border-t border-border/30">
        <Button variant="outline" size="sm" className="w-full text-xs" asChild>
          <a href="/partners">View All Partners</a>
        </Button>
      </div>
    </div>
  );
};

export default PartnersSection;
