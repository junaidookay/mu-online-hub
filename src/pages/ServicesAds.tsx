import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import { SEOHead } from '@/components/SEOHead';
import { ExternalLink, Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClickTracking } from '@/hooks/useClickTracking';
import type { Tables } from '@/integrations/supabase/types';

type Advertisement = Tables<'advertisements'>;

const fallbackServices = [
  { id: '1', title: 'Pro Video Maker', description: 'Trailers & Intros', website: 'pro-video.net', banner_url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=268&h=60&fit=crop', vip_level: 'gold' as const },
  { id: '2', title: 'MU Streamer Elite', description: 'Live Coverage', website: 'mu-streamer.com', banner_url: 'https://images.unsplash.com/photo-1598550476439-6847785fcea6?w=268&h=60&fit=crop', vip_level: 'diamond' as const },
  { id: '3', title: 'Custom Configs', description: 'All Seasons', website: 'custom-configs.net', banner_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=268&h=60&fit=crop', vip_level: 'none' as const },
];

const ServicesAds = () => {
  const [services, setServices] = useState<Advertisement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
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
        setServices(data);
      }
    };
    fetchServices();
  }, []);

  const displayServices = services.length > 0 ? services : fallbackServices;
  const filteredServices = displayServices.filter(service =>
    service.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    service.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <SEOHead 
        title="MU Online Services Ads | Arcana"
        description="Browse service advertisements for MU Online configurations, streaming, custom videos, banners and more."
      />
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-primary mb-2">MU Online Services Advertise</h1>
            <p className="text-muted-foreground">Configurations, Streamer, Custom, Video, Banner</p>
          </div>

          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="secondary">
              <Plus size={18} className="mr-2" />
              Place Your Ad
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredServices.map((service) => (
              <a
                key={service.id}
                href={`https://${service.website}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackAdClick(service.id, service.website)}
                className="ad-banner block relative group"
              >
                <div className="p-4 bg-muted/30 rounded-lg border border-border/30 hover:border-secondary/50 transition-colors">
                  {service.vip_level && service.vip_level !== 'none' && (
                    <span className={`vip-badge ${service.vip_level === 'gold' ? 'vip-gold' : 'vip-diamond'} mb-2 inline-block`}>
                      VIP {service.vip_level.toUpperCase()}
                    </span>
                  )}
                  {service.banner_url && (
                    <img 
                      src={service.banner_url} 
                      alt={service.title}
                      className="w-full h-32 object-cover rounded mb-3"
                    />
                  )}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{service.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{service.description}</p>
                    </div>
                    <ExternalLink size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                </div>
              </a>
            ))}
          </div>

          {filteredServices.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No services found matching your search.
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default ServicesAds;