import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import SectionHeader from './SectionHeader';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useClickTracking } from '@/hooks/useClickTracking';
import type { Tables } from '@/integrations/supabase/types';

type Advertisement = Tables<'advertisements'>;

const fallbackServices = [
  { id: '1', title: 'Pro Video Maker', description: 'Trailers & Intros', website: 'pro-video.net', banner_url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=268&h=60&fit=crop', vip_level: 'gold' as const },
  { id: '2', title: 'MU Streamer Elite', description: 'Live Coverage', website: 'mu-streamer.com', banner_url: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=268&h=60&fit=crop', vip_level: 'diamond' as const },
  { id: '3', title: 'Custom Configs', description: 'All Seasons', website: 'custom-configs.net', banner_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=268&h=60&fit=crop', vip_level: 'none' as const },
];

const ServicesAdvertise = () => {
  const [services, setServices] = useState<Advertisement[]>([]);
  const { trackAdClick } = useClickTracking();

  useEffect(() => {
    const fetchServices = async () => {
      const { data } = await supabase
        .from('advertisements')
        .select('*')
        .eq('is_active', true)
        .eq('ad_type', 'services')
        .order('rotation_order');
      
      if (data && data.length > 0) {
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setServices(shuffled);
      }
    };
    fetchServices();
  }, []);

  const allServices = services.length > 0 ? services : fallbackServices;
  const displayServices = allServices.slice(0, 10);

  return (
    <div className="glass-card overflow-hidden flex flex-col">
      <SectionHeader 
        title="MU Online Services Advertise" 
        subtitle="Configurations, Streamer, Custom, Video, Banner"
      />
      <div className="flex-1 p-2 space-y-2 overflow-y-auto scrollbar-thin">
        {displayServices.map((service) => (
          <Link
            key={service.id}
            to={`/services-ads/${(service as any).slug || service.id}`}
            onClick={() => trackAdClick(service.id, service.website)}
            className="ad-banner block relative group"
          >
            <div className="flex items-center gap-2 p-1.5 bg-muted/30 rounded border border-border/30">
              {service.vip_level && service.vip_level !== 'none' && (
                <span className={`vip-badge ${service.vip_level === 'gold' ? 'vip-gold' : 'vip-diamond'} shrink-0`}>
                  VIP
                </span>
              )}
              {service.banner_url && (
                <img 
                  src={service.banner_url} 
                  alt={service.title}
                  className="w-16 h-8 object-cover rounded shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{service.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{service.description}</p>
              </div>
              <ExternalLink size={12} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          </Link>
        ))}
      </div>
      <div className="p-2 border-t border-border/30">
        <Button variant="outline" size="sm" className="w-full text-xs" asChild>
          <Link to="/services-ads">View All Service Ads</Link>
        </Button>
      </div>
    </div>
  );
};

export default ServicesAdvertise;
