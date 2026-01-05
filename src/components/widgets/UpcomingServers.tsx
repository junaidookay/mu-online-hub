import { useState, useEffect } from 'react';
import SectionHeader from '@/components/sections/SectionHeader';

interface ServerWidget {
  id: string;
  name: string;
  expRate: string;
  version: string;
  openDate: string;
  website: string;
  isUpcoming: boolean;
}

const serversData: ServerWidget[] = [
  { id: '1', name: 'MUILLUMINATI.COM', expRate: 'x300', version: 'S4', openDate: 'Open 20.12', website: 'muilluminati.com', isUpcoming: true },
  { id: '2', name: 'VORTEX-MU.COM', expRate: 'x1000', version: 'S3', openDate: 'Open 18.12', website: 'vortex-mu.com', isUpcoming: true },
  { id: '3', name: 'MUILLUMINATI.COM', expRate: 'x100', version: 'S4', openDate: 'Open 20.12', website: 'muilluminati.com', isUpcoming: true },
  { id: '4', name: 'VORTEX-MU.COM', expRate: 'x1000', version: 'S3', openDate: 'Open 18.12', website: 'vortex-mu.com', isUpcoming: false },
  { id: '5', name: 'MUILLUMINATI.COM', expRate: 'x100', version: 'S4', openDate: 'Open 20.12', website: 'muilluminati.com', isUpcoming: false },
];

const UpcomingServers = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % serversData.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <div 
      className="glass-card overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <SectionHeader title="Upcoming & Recent" />
      <div className="p-2 space-y-1.5">
        {serversData.map((server, index) => (
          <a
            key={server.id}
            href={`https://${server.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`block p-2 rounded border transition-all ${
              index === currentIndex 
                ? 'border-secondary/50 bg-secondary/10 glow-border-cyan' 
                : 'border-border/30 bg-muted/20 hover:border-border/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${server.isUpcoming ? 'bg-green-500' : 'bg-blue-500'}`} />
                <span className="text-xs font-semibold text-foreground">{server.name}</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{server.openDate}</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded">{server.expRate}</span>
              <span className="text-[10px] text-muted-foreground">{server.version}</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default UpcomingServers;
