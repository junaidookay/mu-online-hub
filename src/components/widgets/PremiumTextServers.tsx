import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import SectionHeader from '@/components/sections/SectionHeader';

interface TextServer {
  id: string;
  name: string;
  exp_rate: string;
  version: string;
  open_date: string | null;
  website: string;
}

const PremiumTextServers = () => {
  const [servers, setServers] = useState<TextServer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const fetchServers = async () => {
      const { data } = await supabase
        .from('premium_text_servers')
        .select('*')
        .eq('is_active', true)
        .order('rotation_order');
      
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
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isPaused, servers.length]);

  const displayServers = servers.length > 0 ? servers : [
    { id: '1', name: 'SKAVORAMU.COM', exp_rate: 'x200', version: 'S6', open_date: 'Open 21.10', website: 'skavoramu.com' },
    { id: '2', name: 'MU-HARDCORE.COM', exp_rate: 'x2', version: 'S6', open_date: 'Open 11.10', website: 'mu-hardcore.com' },
  ];

  return (
    <div 
      className="glass-card overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <SectionHeader title="Premium Text Servers" />
      <div className="p-2 space-y-1">
        {displayServers.map((server, index) => (
          <a
            key={server.id}
            href={`https://${server.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-between p-2 rounded border transition-all ${
              index === currentIndex 
                ? 'border-primary/50 bg-primary/10 pulse-glow' 
                : 'border-border/30 bg-muted/20 hover:border-border/50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="vip-badge vip-gold">VIP</span>
              <span className="text-xs font-semibold text-foreground">{server.name}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span>{server.exp_rate}</span>
              <span>{server.version}</span>
              <span>{server.open_date || ''}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default PremiumTextServers;
