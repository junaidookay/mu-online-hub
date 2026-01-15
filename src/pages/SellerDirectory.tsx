import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/SEOHead';
import Header from '@/components/layout/Header';
import { UserBadges, UserLevelBadge } from '@/components/user/UserBadges';
import { 
  Search, Star, User, TrendingUp, Award, Package, 
  Loader2, ShoppingBag, ArrowRight 
} from 'lucide-react';

interface SellerWithStats {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  stats: {
    seller_level: number;
    seller_xp: number;
    sales_count: number;
    total_earned_cents: number;
    badges: string[];
  } | null;
  listings_count: number;
  average_rating: number;
  reviews_count: number;
}

const SellerDirectory = () => {
  const [sellers, setSellers] = useState<SellerWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'sales' | 'level'>('rating');

  useEffect(() => {
    fetchSellers();
  }, []);

  const fetchSellers = async () => {
    setIsLoading(true);

    // Get all sellers (users with listings)
    const { data: sellersData } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .eq('user_type', 'seller');

    if (!sellersData) {
      setIsLoading(false);
      return;
    }

    // Enrich with stats, listings count, and reviews
    const enrichedSellers = await Promise.all(
      sellersData.map(async (seller) => {
        // Get stats
        const { data: stats } = await supabase
          .from('user_stats')
          .select('seller_level, seller_xp, sales_count, total_earned_cents, badges')
          .eq('user_id', seller.user_id)
          .single();

        // Get listings count
        const { count: listingsCount } = await supabase
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', seller.user_id)
          .eq('is_published', true);

        // Get reviews stats
        const { data: reviews } = await supabase
          .from('reviews')
          .select('rating')
          .eq('seller_id', seller.user_id);

        const reviewsCount = reviews?.length || 0;
        const averageRating = reviewsCount > 0
          ? reviews!.reduce((sum, r) => sum + r.rating, 0) / reviewsCount
          : 0;

        return {
          ...seller,
          stats: stats || null,
          listings_count: listingsCount || 0,
          average_rating: averageRating,
          reviews_count: reviewsCount
        };
      })
    );

    // Filter out sellers with no listings
    const activeSellers = enrichedSellers.filter(s => s.listings_count > 0);
    setSellers(activeSellers);
    setIsLoading(false);
  };

  const filteredSellers = sellers
    .filter(seller => {
      if (!searchQuery) return true;
      const name = seller.display_name?.toLowerCase() || '';
      return name.includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return b.average_rating - a.average_rating;
        case 'sales':
          return (b.stats?.sales_count || 0) - (a.stats?.sales_count || 0);
        case 'level':
          return (b.stats?.seller_level || 1) - (a.stats?.seller_level || 1);
        default:
          return 0;
      }
    });

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Find Sellers - MU Online Hub"
        description="Browse and discover top-rated sellers on MU Online Hub marketplace."
      />
      <Header />

      <main className="container py-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-gradient-gold mb-2">
            Find Sellers
          </h1>
          <p className="text-muted-foreground">
            Discover trusted sellers and browse their listings
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search sellers by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={sortBy === 'rating' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('rating')}
            >
              <Star className="w-4 h-4 mr-1" />
              Top Rated
            </Button>
            <Button
              variant={sortBy === 'sales' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('sales')}
            >
              <TrendingUp className="w-4 h-4 mr-1" />
              Most Sales
            </Button>
            <Button
              variant={sortBy === 'level' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('level')}
            >
              <Award className="w-4 h-4 mr-1" />
              Highest Level
            </Button>
          </div>
        </div>

        {/* Sellers Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredSellers.length === 0 ? (
          <div className="text-center py-16">
            <User className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-display text-lg font-semibold mb-2">No Sellers Found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Try a different search term.' : 'No sellers available yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSellers.map((seller) => (
              <Card key={seller.user_id} className="glass-card overflow-hidden hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {seller.avatar_url ? (
                        <img 
                          src={seller.avatar_url} 
                          alt={seller.display_name || 'Seller'} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-lg truncate">
                        {seller.display_name || 'Anonymous Seller'}
                      </h3>
                      <UserLevelBadge 
                        type="seller" 
                        level={seller.stats?.seller_level || 1} 
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="text-center p-2 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-center gap-1 text-yellow-500">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="font-bold">
                          {seller.average_rating > 0 ? seller.average_rating.toFixed(1) : '-'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{seller.reviews_count} reviews</p>
                    </div>
                    <div className="text-center p-2 bg-muted/30 rounded-lg">
                      <p className="font-bold text-primary">{seller.stats?.sales_count || 0}</p>
                      <p className="text-xs text-muted-foreground">Sales</p>
                    </div>
                    <div className="text-center p-2 bg-muted/30 rounded-lg">
                      <p className="font-bold text-green-400">{seller.listings_count}</p>
                      <p className="text-xs text-muted-foreground">Listings</p>
                    </div>
                  </div>

                  {/* Badges */}
                  {seller.stats?.badges && seller.stats.badges.length > 0 && (
                    <div className="mb-4">
                      <UserBadges badges={seller.stats.badges} compact />
                    </div>
                  )}

                  <Button asChild className="w-full" variant="outline">
                    <Link to={`/seller/profile/${seller.user_id}`}>
                      View Profile
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default SellerDirectory;
