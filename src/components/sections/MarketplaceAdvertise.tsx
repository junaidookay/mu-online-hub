import { useState, useEffect } from 'react';
import SectionHeader from './SectionHeader';
import { ExternalLink } from 'lucide-react';

interface AdItem {
  id: string;
  title: string;
  serverInfo: string;
  website: string;
  bannerUrl: string;
  vipLevel?: 'gold' | 'diamond';
}

const mockAds: AdItem[] = [
  { id: '1', title: 'Arcana GRAND OPENING', serverInfo: 'xp rates 9000 x', website: 'arcana-files.com', bannerUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=268&h=60&fit=crop', vipLevel: 'gold' },
  { id: '2', title: 'MU Premium Files', serverInfo: 'Season 17 Part 2', website: 'mupremium.net', bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=268&h=60&fit=crop', vipLevel: 'diamond' },
  { id: '3', title: 'Dragon MU Store', serverInfo: 'Custom Systems', website: 'dragonmu-store.com', bannerUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=268&h=60&fit=crop' },
  { id: '4', title: 'Phoenix Files', serverInfo: 'All Seasons', website: 'phoenix-files.net', bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=268&h=60&fit=crop', vipLevel: 'gold' },
  { id: '5', title: 'Legend Systems', serverInfo: 'PvP & PvM', website: 'legend-systems.com', bannerUrl: 'https://images.unsplash.com/photo-1493711662062-fa541f7f76e7?w=268&h=60&fit=crop' },
  { id: '6', title: 'Elite Antihack', serverInfo: 'Protection v3.0', website: 'elite-antihack.net', bannerUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=268&h=60&fit=crop', vipLevel: 'diamond' },
];

const MarketplaceAdvertise = () => {
  const [ads, setAds] = useState<AdItem[]>([]);

  useEffect(() => {
    // Fair rotation - shuffle on each visit
    const shuffled = [...mockAds].sort(() => Math.random() - 0.5);
    setAds(shuffled);
  }, []);

  return (
    <div className="glass-card overflow-hidden">
      <SectionHeader 
        title="MU Online Marketplace Advertise" 
        subtitle="Websites, Server Files, Antihack etc."
      />
      <div className="p-2 space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
        {ads.map((ad) => (
          <a
            key={ad.id}
            href={`https://${ad.website || 'example.com'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ad-banner block relative group"
          >
            <div className="flex items-center gap-2 p-1.5 bg-muted/30 rounded border border-border/30">
              {ad.vipLevel && (
                <span className={`vip-badge ${ad.vipLevel === 'gold' ? 'vip-gold' : 'vip-diamond'} shrink-0`}>
                  VIP
                </span>
              )}
              <img 
                src={ad.bannerUrl} 
                alt={ad.title}
                className="w-16 h-8 object-cover rounded shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{ad.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{ad.serverInfo}</p>
              </div>
              <ExternalLink size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default MarketplaceAdvertise;
