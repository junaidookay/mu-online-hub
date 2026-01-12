import { useState, useEffect } from 'react';
import { Store, Search, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useClickTracking } from '@/hooks/useClickTracking';
import { MarketplaceListings } from '@/components/marketplace/MarketplaceListings';

interface Advertisement {
  id: string;
  title: string;
  description: string | null;
  website: string;
  banner_url: string | null;
  vip_level: 'none' | 'gold' | 'diamond' | null;
}

const categories = [
  { id: 'all', label: 'All Products' },
  { id: 'websites', label: 'Websites' },
  { id: 'server_files', label: 'Server Files' },
  { id: 'antihack', label: 'Antihack' },
  { id: 'launchers', label: 'Launchers' },
  { id: 'custom_scripts', label: 'Custom Scripts' },
];

const Marketplace = () => {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const { trackAdClick } = useClickTracking();

  useEffect(() => {
    const fetchAds = async () => {
      const { data } = await supabase
        .from('advertisements')
        .select('*')
        .eq('ad_type', 'marketplace')
        .eq('is_active', true)
        .order('vip_level', { ascending: false });
      
      if (data) setAds(data);
    };
    fetchAds();
  }, []);

  const filteredAds = ads.filter(ad => 
    ad.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ad.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="MU Online Marketplace - Digital Products & Server Files"
        description="Browse the ultimate marketplace for MU Online digital products. Find premium websites, server files, antihack solutions, and custom tools from verified sellers."
        keywords="MU Online marketplace, server files, antihack, MU websites, custom tools"
      />
      <Header />
      
      <main className="container py-8">
        {/* Hero Section */}
        <div className="glass-card p-6 md:p-8 mb-8 text-center glow-border-gold">
          <Store className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="font-display text-2xl md:text-3xl font-bold text-gradient-gold mb-3">
            MU Online Marketplace
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
            Discover premium digital products for your MU Online server. From complete website packages 
            to server files, antihack solutions, and custom development tools.
          </p>
          <Button asChild className="btn-fantasy-primary">
            <Link to="/pricing">Advertise Your Product</Link>
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="glass-card p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
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
                  className={activeCategory === cat.id ? "btn-fantasy-primary" : "btn-fantasy-outline"}
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAds.map((ad) => (
            <a
              key={ad.id}
              href={ad.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackAdClick(ad.id, ad.website)}
              className="glass-card overflow-hidden group hover:glow-border-gold transition-all"
            >
              {ad.banner_url && (
                <div className="aspect-video relative overflow-hidden">
                  <img 
                    src={ad.banner_url} 
                    alt={ad.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  {ad.vip_level && ad.vip_level !== 'none' && (
                    <Badge className={`absolute top-2 right-2 ${ad.vip_level === 'diamond' ? 'vip-diamond' : 'vip-gold'}`}>
                      {ad.vip_level.toUpperCase()}
                    </Badge>
                  )}
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">
                    {ad.title}
                  </h3>
                  <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {ad.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{ad.description}</p>
                )}
              </div>
            </a>
          ))}
        </div>

        {/* Seller Listings */}
        <div className="mt-8">
          <MarketplaceListings searchQuery={searchQuery} activeCategory={activeCategory} />
        </div>

        {filteredAds.length === 0 && (
          <div className="glass-card p-8 text-center">
            <p className="text-muted-foreground mb-4">No products found matching your search.</p>
            <Button asChild className="btn-fantasy-primary">
              <Link to="/pricing">Be the first to advertise!</Link>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Marketplace;
