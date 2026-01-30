import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import SectionHeader from './SectionHeader';
import { ExternalLink, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClickTracking } from '@/hooks/useClickTracking';
import type { Tables } from '@/integrations/supabase/types';
import { normalizeExternalUrl } from '@/lib/utils';

type ServerType = Tables<'servers'>;

const fallbackServers = [
  { id: '1', name: 'Asteria MU', season: 'SEASON 20', part: 'PART 2-3', exp_rate: '99999x', features: ['LONG-TERM SERVER', 'NEW 5TH QUEST/CLASSES'], banner_url: 'https://images.unsplash.com/photo-1614854262318-831574f15f1f?w=468&h=60&fit=crop', website: 'asteriamu.com' },
  { id: '2', name: 'Phoenix MU', season: 'SEASON 19', part: 'PART 2', exp_rate: '5000x', features: ['PVP FOCUSED', 'CUSTOM WINGS'], banner_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=468&h=60&fit=crop', website: 'phoenixmu.net' },
  { id: '3', name: 'Legend MU', season: 'SEASON 17', part: 'PART 1-2', exp_rate: '1000x', features: ['CLASSIC GAMEPLAY', 'BALANCED PVP'], banner_url: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=468&h=60&fit=crop', website: 'legendmu.com' },
];

const TopServers = () => {
  const [servers, setServers] = useState<ServerType[]>([]);
  const { trackServerClick } = useClickTracking();
  useEffect(() => {
    const fetchServers = async () => {
      const { data } = await supabase
        .from('servers')
        .select('*')
        .eq('slot_id', 3)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (data && data.length > 0) {
        // Fair rotation - shuffle on each visit
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setServers(shuffled);
      }
    };
    fetchServers();
  }, []);

  const allServers = servers.length > 0 ? servers : fallbackServers;
  const displayServers = allServers.slice(0, 10);

  return (
    <div className="glass-card overflow-hidden flex flex-col">
      <SectionHeader 
        title="Top 50 MU Online Servers" 
        badge={<span className="text-xs text-secondary">{allServers.length} active</span>}
      />
      <div className="flex-1 p-2 space-y-2 overflow-y-auto scrollbar-thin">
        {displayServers.map((server, index) => {
          const href = normalizeExternalUrl(server.website);
          const CardComponent = href ? 'a' : 'div';
          const cardProps = href
            ? ({
                href,
                target: '_blank',
                rel: 'noopener noreferrer',
                onClick: () => 'id' in server && trackServerClick(server.id, href),
              } as const)
            : undefined;

          return (
            <div key={server.id}>
              <CardComponent
                {...cardProps}
                className="server-item block rounded-lg overflow-hidden border border-border/30 bg-muted/20 group"
              >
              <div className="relative">
                {server.banner_url ? (
                  <img 
                    src={server.banner_url} 
                    alt={server.name}
                    className="w-full h-16 object-cover"
                  />
                ) : (
                  <div className="w-full h-16 bg-gradient-to-r from-primary/20 to-secondary/20" />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent" />
                <div className="absolute inset-0 p-2 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-display text-sm font-bold text-primary">
                        {server.name} {server.season} {server.part} - {server.exp_rate}
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        FULL {server.season} {server.part} - EXP {server.exp_rate}
                      </p>
                    </div>
                    <ExternalLink size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[9px] text-muted-foreground/70 truncate">
                    {server.features?.join(' - ') || 'MU Online Server'}
                  </p>
                </div>
              </div>
              </CardComponent>
            {/* Upgrade CTA after each server */}
            {index < displayServers.length - 1 && (
              <button className="w-full py-1 mt-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
                <Plus size={10} />
                <span>Upgrade to Premium</span>
              </button>
            )}
            </div>
          );
        })}
      </div>
      <div className="p-2 border-t border-border/30">
        <Button variant="outline" size="sm" className="w-full text-xs" asChild>
          <a href="/servers">View All Servers</a>
        </Button>
      </div>
    </div>
  );
};

export default TopServers;
