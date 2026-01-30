import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Package, ShoppingCart, Star } from 'lucide-react';
import { categoryIcons, categoryLabels, marketplaceCategories, serviceCategories } from '@/lib/categories';

interface Listing {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price_usd: number | null;
  website: string | null;
  image_url: string | null;
  is_published: boolean;
  expires_at: string | null;
}

interface MarketplaceListingsProps {
  searchQuery?: string;
  activeCategory?: string;
  categoryType?: 'marketplace' | 'services';
}

// Get category IDs for each type
const marketplaceCategoryIds = marketplaceCategories.map(c => c.id);
const serviceCategoryIds = serviceCategories.map(c => c.id);

const getListingHref = (website: string | null) => {
  const value = website?.trim();
  if (!value) return null;

  const normalized = value
    .replace(/^https?\/\//i, (match) => (match.toLowerCase().startsWith('https') ? 'https://' : 'http://'))
    .replace(/^(https?):\/(?!\/)/i, '$1://')
    .replace(/^\/\//, 'https://')
    .replace(/^(https?:\/\/)https?:?\/\/+/i, '$1');

  if (/^(mailto:|tel:)/i.test(normalized)) return normalized;

  if (/^https?:\/\//i.test(normalized)) {
    try {
      return new URL(normalized).toString();
    } catch {
      return null;
    }
  }

  if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/i.test(normalized)) {
    try {
      return new URL(`https://${normalized}`).toString();
    } catch {
      return null;
    }
  }

  return null;
};

export const MarketplaceListings = ({ 
  searchQuery = '', 
  activeCategory = 'all',
  categoryType = 'marketplace'
}: MarketplaceListingsProps) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchListings();
  }, [categoryType]);

  const fetchListings = async () => {
    setIsLoading(true);
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('is_published', true)
      .eq('is_active', true)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('published_at', { ascending: false });

    if (data && !error) {
      setListings(data);
    }
    setIsLoading(false);
  };

  // Filter by category type first
  const categoryIds = categoryType === 'marketplace' ? marketplaceCategoryIds : serviceCategoryIds;
  
  const filteredListings = listings.filter(listing => {
    // Filter by category type
    const matchesCategoryType = (categoryIds as readonly string[]).includes(listing.category);
    
    const matchesSearch = !searchQuery || 
      listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = activeCategory === 'all' || 
      listing.category === activeCategory;
    
    return matchesCategoryType && matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="glass-card p-4 animate-pulse">
            <div className="aspect-video bg-muted/30 rounded mb-4"></div>
            <div className="h-4 bg-muted/30 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-muted/30 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (filteredListings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Package className="w-5 h-5 text-primary" />
        <h2 className="font-display text-lg font-semibold">Seller Listings</h2>
        <Badge variant="secondary" className="ml-auto">
          {filteredListings.length} listings
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredListings.map((listing) => {
          const Icon = categoryIcons[listing.category] || Package;
          const href = getListingHref(listing.website);
          
          const CardComponent = href ? 'a' : 'div';
          const cardProps = href
            ? ({
                href,
                target: '_blank',
                rel: 'noopener noreferrer',
              } as const)
            : undefined;

          return (
            <CardComponent
              key={listing.id}
              {...cardProps}
              className={`glass-card overflow-hidden group transition-all ${
                href ? 'hover:glow-border-gold cursor-pointer' : 'cursor-default'
              }`}
            >
              {listing.image_url ? (
                <div className="aspect-video relative overflow-hidden">
                  <img 
                    src={listing.image_url} 
                    alt={listing.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <Badge className="absolute top-2 left-2 bg-primary/90">
                    <Icon className="w-3 h-3 mr-1" />
                    {categoryLabels[listing.category]}
                  </Badge>
                </div>
              ) : (
                <div className="aspect-video bg-muted/20 flex items-center justify-center relative">
                  <Icon className="w-12 h-12 text-muted-foreground" />
                  <Badge className="absolute top-2 left-2 bg-primary/90">
                    {categoryLabels[listing.category]}
                  </Badge>
                </div>
              )}
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {listing.title}
                  </h3>
                  <ShoppingCart className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
                {listing.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{listing.description}</p>
                )}
                {listing.price_usd ? (
                  <p className="text-lg font-bold text-primary">
                    ${listing.price_usd.toFixed(2)}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Contact for price</p>
                )}
              </div>
            </CardComponent>
          );
        })}
      </div>
    </div>
  );
};
