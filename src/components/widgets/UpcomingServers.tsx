import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import SectionHeader from '@/components/sections/SectionHeader';
import { normalizeExternalUrl } from '@/lib/utils';

interface ServerWidget {
  id: string;
  name: string;
  exp_rate: string;
  season: string;
  open_date: string | null;
  website: string;
}

const UpcomingServers = () => {
  const [servers, setServers] = useState<ServerWidget[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const fetchServers = async () => {
      // Fetch servers with slot_id = 6 (Upcoming & Recent) or filter by open_date
      const { data } = await supabase
        .from('servers')
        .select('*')
        .eq('slot_id', 6)
        .eq('is_active', true)
        .order('open_date', { ascending: true })
        .limit(10);
      
      if (data && data.length > 0) {
        setServers(data);
      }
    };
    fetchServers();
  }, []);

  useEffect(() => {
    if (isPaused || servers.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % servers.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [isPaused, servers.length]);

  const displayServers = servers.length > 0 ? servers : [
    { id: '1', name: 'MUILLUMINATI.COM', exp_rate: 'x300', season: 'S4', open_date: 'Open 20.12', website: 'muilluminati.com' },
    { id: '2', name: 'VORTEX-MU.COM', exp_rate: 'x1000', season: 'S3', open_date: 'Open 18.12', website: 'vortex-mu.com' },
  ];

  const isUpcoming = (openDate: string | null) => {
    if (!openDate) return false;
    return new Date(openDate) > new Date();
  };

  return (
    <div 
      className="glass-card overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <SectionHeader title="Upcoming & Recent" />
      <div className="p-2 space-y-1.5">
        {displayServers.map((server, index) => {
          const href = normalizeExternalUrl(server.website);
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
              key={server.id}
              {...cardProps}
              className={`block p-2 rounded border transition-all ${
                index === currentIndex 
                  ? 'border-secondary/50 bg-secondary/10 glow-border-cyan' 
                  : 'border-border/30 bg-muted/20 hover:border-border/50'
              }`}
            >
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full shrink-0 ${isUpcoming(server.open_date) ? 'bg-green-500' : 'bg-blue-500'}`} />
                <span className="text-xs font-semibold text-foreground truncate">{server.name}</span>
              </div>

              <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded">{server.exp_rate}</span>
                <span className="text-[10px] text-muted-foreground">{server.season}</span>
              </div>

              <div className="flex justify-end min-w-0">
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{server.open_date || ''}</span>
              </div>
            </div>
            </CardComponent>
          );
        })}
      </div>
    </div>
  );
};

export default UpcomingServers;
