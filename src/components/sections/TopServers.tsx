import { useState, useEffect } from 'react';
import SectionHeader from './SectionHeader';
import { ExternalLink, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ServerItem {
  id: string;
  name: string;
  season: string;
  part: string;
  expRate: string;
  features: string[];
  bannerUrl: string;
  website: string;
}

const mockServers: ServerItem[] = [
  { 
    id: '1', 
    name: 'Asteria MU', 
    season: 'SEASON 20', 
    part: 'PART 2-3', 
    expRate: '99999x',
    features: ['LONG-TERM SERVER', 'NEW 5TH QUEST/CLASSES', 'NEW EVENTS', 'NEW MAPS'],
    bannerUrl: 'https://images.unsplash.com/photo-1614854262318-831574f15f1f?w=468&h=60&fit=crop',
    website: 'asteriamu.com'
  },
  { 
    id: '2', 
    name: 'Phoenix MU', 
    season: 'SEASON 19', 
    part: 'PART 2', 
    expRate: '5000x',
    features: ['PVP FOCUSED', 'CUSTOM WINGS', 'CASTLE SIEGE'],
    bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=468&h=60&fit=crop',
    website: 'phoenixmu.net'
  },
  { 
    id: '3', 
    name: 'Legend MU', 
    season: 'SEASON 17', 
    part: 'PART 1-2', 
    expRate: '1000x',
    features: ['CLASSIC GAMEPLAY', 'BALANCED PVP', 'ACTIVE GM'],
    bannerUrl: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=468&h=60&fit=crop',
    website: 'legendmu.com'
  },
  { 
    id: '4', 
    name: 'Dragon MU', 
    season: 'SEASON 18', 
    part: 'PART 3', 
    expRate: '3000x',
    features: ['NEW MAPS', 'CUSTOM ITEMS', 'WEEKLY EVENTS'],
    bannerUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=468&h=60&fit=crop',
    website: 'dragonmu.net'
  },
  { 
    id: '5', 
    name: 'Elite MU', 
    season: 'SEASON 21', 
    part: 'PART 1', 
    expRate: '50000x',
    features: ['LATEST VERSION', 'PREMIUM SUPPORT', 'UNIQUE FEATURES'],
    bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=468&h=60&fit=crop',
    website: 'elitemu.com'
  },
];

const TopServers = () => {
  const [servers, setServers] = useState<ServerItem[]>([]);

  useEffect(() => {
    const shuffled = [...mockServers].sort(() => Math.random() - 0.5);
    setServers(shuffled);
  }, []);

  return (
    <div className="glass-card overflow-hidden flex flex-col">
      <SectionHeader 
        title="Top 50 MU Online Servers" 
        badge={<span className="text-xs text-secondary">0 eligible</span>}
      />
      <div className="flex-1 p-2 space-y-2 overflow-y-auto scrollbar-thin">
        {servers.map((server, index) => (
          <div key={server.id}>
            <a
              href={`https://${server.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="server-item block rounded-lg overflow-hidden border border-border/30 bg-muted/20 group"
            >
              <div className="relative">
                <img 
                  src={server.bannerUrl} 
                  alt={server.name}
                  className="w-full h-16 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent" />
                <div className="absolute inset-0 p-2 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-display text-sm font-bold text-primary">
                        {server.name} {server.season} {server.part} - {server.expRate}
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        FULL {server.season} {server.part} - EXP {server.expRate} - {server.features.slice(0, 2).join(' - ')}
                      </p>
                    </div>
                    <ExternalLink size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[9px] text-muted-foreground/70 truncate">
                    {server.features.join(' - ')}
                  </p>
                </div>
              </div>
            </a>
            {/* Upgrade CTA after each server */}
            {index < servers.length - 1 && (
              <button className="w-full py-1 mt-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
                <Plus size={10} />
                <span>Upgrade to Premium</span>
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="p-2 border-t border-border/30">
        <Button variant="outline" size="sm" className="w-full text-xs">
          View All 50 Servers
        </Button>
      </div>
    </div>
  );
};

export default TopServers;
