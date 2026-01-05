import SectionHeader from './SectionHeader';
import { ExternalLink } from 'lucide-react';

interface Partner {
  id: string;
  name: string;
  info: string;
  imageUrl: string;
  website: string;
}

const partners: Partner[] = [
  { id: '1', name: 'Map Aquitas Templa', info: 'CHAOSMU X100 - S21 P1-2', imageUrl: 'https://images.unsplash.com/photo-1614854262318-831574f15f1f?w=100&h=60&fit=crop', website: 'chaosmu.com' },
  { id: '2', name: 'Map Aquitas Templa', info: 'CHAOSMU X100 - S21 P1-2 - OPEN 21 NOV', imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=100&h=60&fit=crop', website: 'chaosmu.com' },
  { id: '3', name: 'Map Aquitas Templa', info: 'CHAOSMU X100 - S21 P1-2 - OPEN 21 NOV', imageUrl: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=100&h=60&fit=crop', website: 'chaosmu.com' },
  { id: '4', name: 'Map Aquitas Templa', info: 'CHAOSMU X100 - S21 P1-2 - OPEN 21 NOV', imageUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=100&h=60&fit=crop', website: 'chaosmu.com' },
];

const PartnersSection = () => {
  return (
    <div className="glass-card overflow-hidden">
      <SectionHeader 
        title="MU Online Partners" 
        badge={<span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded live-indicator ml-2">LIVE</span>}
      />
      <div className="p-2 space-y-2 max-h-[350px] overflow-y-auto scrollbar-thin">
        {partners.map((partner) => (
          <a
            key={partner.id}
            href={`https://${partner.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <div className="flex gap-2 p-1.5 bg-muted/30 rounded border border-border/30 hover:border-secondary/50 transition-colors">
              <img 
                src={partner.imageUrl} 
                alt={partner.name}
                className="w-20 h-12 object-cover rounded shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground truncate">{partner.name}</p>
                <p className="text-xs font-semibold text-secondary truncate">{partner.info}</p>
              </div>
              <ExternalLink size={10} className="text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default PartnersSection;
