import { useState, useEffect } from 'react';
import { Wrench, Search, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useClickTracking } from '@/hooks/useClickTracking';
import { normalizeExternalUrl } from '@/lib/utils';

interface Advertisement {
  id: string;
  title: string;
  description: string | null;
  website: string;
  banner_url: string | null;
  vip_level: 'none' | 'gold' | 'diamond' | null;
}

const categories = [
  { id: 'all', label: 'All Services' },
  { id: 'configurations', label: 'Configurations' },
  { id: 'streaming', label: 'Streaming' },
  { id: 'videos', label: 'Videos' },
  { id: 'banners', label: 'Banners' },
];

const Services = () => {
  const [services, setServices] = useState<Advertisement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const { trackAdClick } = useClickTracking();

  useEffect(() => {
    const fetchServices = async () => {
      const { data } = await supabase
        .from('advertisements')
        .select('*')
        .eq('ad_type', 'services')
        .eq('is_active', true)
        .order('vip_level', { ascending: false });
      
      if (data) setServices(data);
    };
    fetchServices();
  }, []);

  const filteredServices = services.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="MU Online Services - Professional Server Solutions"
        description="Find professional MU Online services including configurations, streaming, promotional videos, and custom banners from verified providers."
        keywords="MU Online services, configurations, streaming, promotional videos, banners"
      />
      <Header />
      
      <main className="container py-8">
        {/* Hero Section */}
        <div className="glass-card p-6 md:p-8 mb-8 text-center glow-border-cyan">
          <Wrench className="w-12 h-12 text-secondary mx-auto mb-4" />
          <h1 className="font-display text-2xl md:text-3xl font-bold text-glow-cyan mb-3">
            MU Online Services
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
            Professional services to boost your MU Online server. Get expert configurations, 
            streaming promotion, custom videos, and stunning banners.
          </p>
          <Button asChild className="btn-fantasy-primary bg-gradient-to-b from-secondary/90 to-secondary text-secondary-foreground">
            <Link to="/seller-onboarding">List Your Service</Link>
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="glass-card p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={activeCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => {
            const href = normalizeExternalUrl(service.website);
            const CardComponent = href ? 'a' : 'div';
            const cardProps = href
              ? ({
                  href,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  onClick: () => trackAdClick(service.id, href),
                } as const)
              : undefined;

            return (
              <CardComponent
                key={service.id}
                {...cardProps}
                className="glass-card overflow-hidden group hover:glow-border-cyan transition-all"
              >
                {service.banner_url && (
                  <div className="aspect-video relative overflow-hidden">
                    <img 
                      src={service.banner_url} 
                      alt={service.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    {service.vip_level && service.vip_level !== 'none' && (
                      <Badge className={`absolute top-2 right-2 ${service.vip_level === 'diamond' ? 'vip-diamond' : 'vip-gold'}`}>
                        {service.vip_level.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-display font-semibold text-foreground group-hover:text-secondary transition-colors">
                      {service.title}
                    </h3>
                    <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  {service.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                  )}
                </div>
              </CardComponent>
            );
          })}
        </div>

        {filteredServices.length === 0 && (
          <div className="glass-card p-8 text-center">
            <p className="text-muted-foreground mb-4">No services found matching your search.</p>
            <Button asChild className="btn-fantasy-primary bg-gradient-to-b from-secondary/90 to-secondary">
              <Link to="/seller-onboarding">Be the first to list!</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Services;
