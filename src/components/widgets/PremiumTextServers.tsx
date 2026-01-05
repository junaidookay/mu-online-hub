import { useState, useEffect } from 'react';
import SectionHeader from '@/components/sections/SectionHeader';

interface TextServer {
  id: string;
  name: string;
  expRate: string;
  version: string;
  openDate: string;
  website: string;
}

const textServers: TextServer[] = [
  { id: '1', name: 'SKAVORAMU.COM', expRate: 'x200', version: 'S6', openDate: 'Open 21.10', website: 'skavoramu.com' },
  { id: '2', name: 'MU-HARDCORE.COM', expRate: 'x2', version: 'S6', openDate: 'Open 11.10', website: 'mu-hardcore.com' },
  { id: '3', name: 'STELLARMU.COM', expRate: 'x100', version: 'S3', openDate: 'Open 01.10', website: 'stellarmu.com' },
  { id: '4', name: 'REBMUBC', expRate: 'x100', version: 'S7', openDate: 'Open 10.09', website: 'rebmubc.com' },
  { id: '5', name: 'LEGENDMU.NET', expRate: 'x500', version: 'S5', openDate: 'Open 05.09', website: 'legendmu.net' },
];

const PremiumTextServers = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % textServers.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <div 
      className="glass-card overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <SectionHeader title="Premium Text Servers" />
      <div className="p-2 space-y-1">
        {textServers.map((server, index) => (
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
              <span>{server.expRate}</span>
              <span>{server.version}</span>
              <span>{server.openDate}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default PremiumTextServers;
