import { useState, useEffect } from 'react';
import SectionHeader from './SectionHeader';
import { ExternalLink } from 'lucide-react';

interface ServiceItem {
  id: string;
  title: string;
  serviceInfo: string;
  website: string;
  bannerUrl: string;
  vipLevel?: 'gold' | 'diamond';
}

const mockServices: ServiceItem[] = [
  { id: '1', title: 'Pro Video Maker', serviceInfo: 'Trailers & Intros', website: 'pro-video.net', bannerUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=268&h=60&fit=crop', vipLevel: 'gold' },
  { id: '2', title: 'MU Streamer Elite', serviceInfo: 'Live Coverage', website: 'mu-streamer.com', bannerUrl: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=268&h=60&fit=crop', vipLevel: 'diamond' },
  { id: '3', title: 'Custom Configs', serviceInfo: 'All Seasons', website: 'custom-configs.net', bannerUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=268&h=60&fit=crop' },
  { id: '4', title: 'Banner Design Studio', serviceInfo: 'Premium Graphics', website: 'banner-studio.com', bannerUrl: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=268&h=60&fit=crop', vipLevel: 'gold' },
  { id: '5', title: 'Voting System Pro', serviceInfo: 'Multi-Platform', website: 'voting-pro.net', bannerUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=268&h=60&fit=crop' },
  { id: '6', title: 'MU Support 24/7', serviceInfo: 'Configurations', website: 'mu-support.com', bannerUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=268&h=60&fit=crop', vipLevel: 'diamond' },
];

const ServicesAdvertise = () => {
  const [services, setServices] = useState<ServiceItem[]>([]);

  useEffect(() => {
    const shuffled = [...mockServices].sort(() => Math.random() - 0.5);
    setServices(shuffled);
  }, []);

  return (
    <div className="glass-card overflow-hidden">
      <SectionHeader 
        title="MU Online Services Advertise" 
        subtitle="Configurations, Streamer, Custom, Video, Banner"
      />
      <div className="p-2 space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin">
        {services.map((service) => (
          <a
            key={service.id}
            href={`https://${service.website || 'example.com'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ad-banner block relative group"
          >
            <div className="flex items-center gap-2 p-1.5 bg-muted/30 rounded border border-border/30">
              {service.vipLevel && (
                <span className={`vip-badge ${service.vipLevel === 'gold' ? 'vip-gold' : 'vip-diamond'} shrink-0`}>
                  VIP
                </span>
              )}
              <img 
                src={service.bannerUrl} 
                alt={service.title}
                className="w-16 h-8 object-cover rounded shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{service.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{service.serviceInfo}</p>
              </div>
              <ExternalLink size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default ServicesAdvertise;
