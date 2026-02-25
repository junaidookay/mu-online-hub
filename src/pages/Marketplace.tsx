import { useState, useEffect } from 'react';
import { Store, Search, ExternalLink, Briefcase } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useClickTracking } from '@/hooks/useClickTracking';
import { MarketplaceListings } from '@/components/marketplace/MarketplaceListings';
import { marketplaceCategories, serviceCategories } from '@/lib/categories';
import { normalizeExternalUrl } from '@/lib/utils';

interface Advertisement {
  id: string;
  title: string;
  description: string | null;
  website: string;
  banner_url: string | null;
  vip_level: 'none' | 'gold' | 'diamond' | null;
  slug?: string | null;
}

const Marketplace = () => {
  const [searchParams] = useSearchParams();
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('marketplace');
  const { trackAdClick } = useClickTracking();

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (requestedTab === 'services' || requestedTab === 'marketplace') {
      setActiveTab(requestedTab);
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchAds = async () => {
      const { data } = await supabase
        .from('advertisements')
        .select('*')
        .eq('ad_type', activeTab)
        .eq('is_active', true)
        .order('vip_level', { ascending: false });
      
      if (data) setAds(data);
    };
    fetchAds();
  }, [activeTab]);

  useEffect(() => {
    const categoryIds = activeTab === 'marketplace'
      ? new Set(marketplaceCategories.map(c => c.id))
      : new Set(serviceCategories.map(c => c.id));
    setActiveCategory((prev) => (prev === 'all' || categoryIds.has(prev) ? prev : 'all'));
  }, [activeTab]);

  const filteredAds = ads.filter(ad => 
    ad.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ad.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="MU Online Marketplace - Digital Products & Services"
        description="Browse the ultimate marketplace for MU Online digital products and services. Find premium websites, server files, development services, and more from verified sellers."
        keywords="MU Online marketplace, server files, antihack, MU websites, custom tools, services"
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
            Discover premium digital products and professional services for your MU Online server. 
            From complete website packages to development services and marketing solutions.
          </p>
          <Button asChild className="btn-fantasy-primary">
            <Link to="/seller-onboarding">Start Selling</Link>
          </Button>
        </div>

        {/* Marketplace/Services Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
            <TabsTrigger value="marketplace" className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              MU Marketplace
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              MU Services
            </TabsTrigger>
          </TabsList>

          <TabsContent value="marketplace" className="mt-6">
            {/* Search & Filter */}
            <div className="glass-card p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-muted/30"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={activeCategory === 'all' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveCategory('all')}
                    className={activeCategory === 'all' ? "btn-fantasy-primary" : "btn-fantasy-outline"}
                  >
                    All
                  </Button>
                  {marketplaceCategories.map((cat) => (
                    <Button
                      key={cat.id}
                      variant={activeCategory === cat.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveCategory(cat.id)}
                      className={activeCategory === cat.id ? "btn-fantasy-primary" : "btn-fantasy-outline"}
                    >
                      <cat.icon className="w-3 h-3 mr-1" />
                      {cat.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sponsored Ads */}
            {filteredAds.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3 text-muted-foreground">Sponsored</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAds.map((ad) => {
                    const adSlug = ad.slug || ad.id;
                    const href = normalizeExternalUrl(ad.website);

                    return (
                      <Link
                        key={ad.id}
                        to={`/marketplace-ads/${adSlug}`}
                        onClick={() => trackAdClick(ad.id, href || ad.website)}
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
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Seller Listings */}
            <MarketplaceListings 
              searchQuery={searchQuery} 
              activeCategory={activeCategory} 
              categoryType="marketplace"
            />
          </TabsContent>

          <TabsContent value="services" className="mt-6">
            {/* Search & Filter for Services */}
            <div className="glass-card p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search services..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-muted/30"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={activeCategory === 'all' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveCategory('all')}
                    className={activeCategory === 'all' ? "btn-fantasy-primary" : "btn-fantasy-outline"}
                  >
                    All
                  </Button>
                  {serviceCategories.map((cat) => (
                    <Button
                      key={cat.id}
                      variant={activeCategory === cat.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveCategory(cat.id)}
                      className={activeCategory === cat.id ? "btn-fantasy-primary" : "btn-fantasy-outline"}
                    >
                      <cat.icon className="w-3 h-3 mr-1" />
                      {cat.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Sponsored Ads */}
            {filteredAds.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3 text-muted-foreground">Sponsored</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAds.map((ad) => {
                    const adSlug = ad.slug || ad.id;
                    const href = normalizeExternalUrl(ad.website);

                    return (
                      <Link
                        key={ad.id}
                        to={`/services-ads/${adSlug}`}
                        onClick={() => trackAdClick(ad.id, href || ad.website)}
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
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Service Listings */}
            <MarketplaceListings 
              searchQuery={searchQuery} 
              activeCategory={activeCategory}
              categoryType="services" 
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Marketplace;
