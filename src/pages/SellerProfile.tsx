import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import { SEOHead } from '@/components/SEOHead';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserBadges } from '@/components/user/UserBadges';
import { ReviewsSection } from '@/components/marketplace/ReviewsSection';
import { categoryLabels, categoryIcons } from '@/lib/categories';
import { 
  Loader2, 
  User, 
  Star, 
  Package, 
  DollarSign, 
  TrendingUp,
  Calendar,
  ExternalLink,
  ShoppingCart
} from 'lucide-react';
import { format } from 'date-fns';

interface SellerProfileData {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface SellerStats {
  sales_count: number;
  seller_level: number;
  seller_xp: number;
  badges: string[];
}

interface Listing {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price_usd: number | null;
  image_url: string | null;
  created_at: string;
}

interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  created_at: string;
  is_verified_purchase: boolean;
  listing_id: string;
  reviewer: {
    display_name: string | null;
    avatar_url: string | null;
    user_id?: string;
  } | null;
}

const SellerProfile = () => {
  const { sellerId } = useParams<{ sellerId: string }>();
  const [profile, setProfile] = useState<SellerProfileData | null>(null);
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    if (sellerId) {
      fetchSellerData();
    }
  }, [sellerId]);

  const fetchSellerData = async () => {
    setIsLoading(true);

    // Fetch seller profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url, created_at')
      .eq('user_id', sellerId)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    // Fetch seller stats
    const { data: statsData } = await supabase
      .from('user_stats')
      .select('sales_count, seller_level, seller_xp, badges')
      .eq('user_id', sellerId)
      .single();

    if (statsData) {
      setStats(statsData as SellerStats);
    }

    // Fetch seller's published listings
    const { data: listingsData } = await supabase
      .from('listings')
      .select('id, title, description, category, price_usd, image_url, created_at')
      .eq('user_id', sellerId)
      .eq('is_published', true)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (listingsData) {
      setListings(listingsData);
    }

    // Fetch reviews for this seller
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select('id, rating, title, content, created_at, is_verified_purchase, listing_id, reviewer_id')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (reviewsData) {
      const reviewerIds = Array.from(new Set(reviewsData.map((r) => r.reviewer_id)));
      const { data: reviewerProfiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', reviewerIds);

      const profileById = new Map((reviewerProfiles || []).map((p) => [p.user_id, p]));
      const normalizedReviews: Review[] = reviewsData.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        content: r.content,
        created_at: r.created_at,
        is_verified_purchase: Boolean(r.is_verified_purchase),
        listing_id: r.listing_id,
        reviewer: profileById.get(r.reviewer_id) || null,
      }));

      setReviews(normalizedReviews);
      // Calculate average rating
      if (reviewsData.length > 0) {
        const avg = reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length;
        setAverageRating(avg);
      }
    }

    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12 text-center">
          <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Seller Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This seller profile doesn't exist or has been removed.
          </p>
          <Button asChild>
            <Link to="/marketplace">Browse Marketplace</Link>
          </Button>
        </div>
      </div>
    );
  }

  const displayName = profile.display_name || 'Anonymous Seller';

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${displayName} - Seller Profile | MU Online Hub`}
        description={`View ${displayName}'s listings, reviews, and seller stats on MU Online Hub marketplace.`}
      />
      <Header />

      <main className="container py-8">
        {/* Seller Header */}
        <div className="glass-card p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
            {/* Avatar */}
            <div className="relative">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-24 h-24 rounded-full object-cover border-4 border-primary"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-4 border-border">
                  <User size={40} className="text-muted-foreground" />
                </div>
              )}
              {stats && stats.seller_level >= 5 && (
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                  <Star size={16} className="text-primary-foreground" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="font-display text-2xl md:text-3xl font-bold text-gradient-gold mb-2">
                {displayName}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  Member since {format(new Date(profile.created_at), 'MMM yyyy')}
                </span>
                <span className="flex items-center gap-1">
                  <Package size={14} />
                  {listings.length} listings
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp size={14} />
                  {stats?.sales_count || 0} sales
                </span>
                {averageRating > 0 && (
                  <span className="flex items-center gap-1">
                    <Star size={14} className="text-yellow-500" />
                    {averageRating.toFixed(1)} ({reviews.length} reviews)
                  </span>
                )}
              </div>

              {/* Badges */}
              {stats && (
                <UserBadges
                  sellerLevel={stats.seller_level}
                  badges={stats.badges || []}
                />
              )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="glass-card">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-primary">
                    {stats?.seller_level || 1}
                  </p>
                  <p className="text-xs text-muted-foreground">Level</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-400">
                    {stats?.sales_count || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Sales</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="listings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="listings">
              Listings ({listings.length})
            </TabsTrigger>
            <TabsTrigger value="reviews">
              Reviews ({reviews.length})
            </TabsTrigger>
          </TabsList>

          {/* Listings Tab */}
          <TabsContent value="listings">
            {listings.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-12 text-center">
                  <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Listings Yet</h3>
                  <p className="text-muted-foreground">
                    This seller hasn't published any listings yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings.map((listing) => {
                  const Icon = categoryIcons[listing.category] || Package;
                  return (
                    <Card key={listing.id} className="glass-card overflow-hidden hover:border-primary/50 transition-colors">
                      {listing.image_url && (
                        <div className="aspect-video overflow-hidden">
                          <img
                            src={listing.image_url}
                            alt={listing.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="w-4 h-4 text-primary" />
                          <Badge variant="outline" className="text-xs">
                            {categoryLabels[listing.category] || listing.category}
                          </Badge>
                        </div>
                        <CardTitle className="text-base line-clamp-1">
                          {listing.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {listing.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {listing.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          {listing.price_usd && (
                            <p className="text-lg font-bold text-primary">
                              ${listing.price_usd.toFixed(2)}
                            </p>
                          )}
                          <Button size="sm" asChild>
                            <Link to={`/marketplace/${listing.id}`}>
                              <ShoppingCart className="w-4 h-4 mr-1" />
                              View
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            {reviews.length === 0 ? (
              <Card className="glass-card">
                <CardContent className="py-12 text-center">
                  <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Reviews Yet</h3>
                  <p className="text-muted-foreground">
                    This seller hasn't received any reviews yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <Card key={review.id} className="glass-card">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          {review.reviewer?.avatar_url ? (
                            <img
                              src={review.reviewer.avatar_url}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <User size={20} className="text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                              {review.reviewer?.display_name || 'Anonymous'}
                            </span>
                            {review.is_verified_purchase && (
                              <Badge variant="secondary" className="text-xs">
                                Verified Purchase
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={14}
                                  className={
                                    star <= review.rating
                                      ? 'text-yellow-500 fill-yellow-500'
                                      : 'text-muted-foreground'
                                  }
                                />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(review.created_at), 'MMM dd, yyyy')}
                            </span>
                          </div>
                          {review.title && (
                            <h4 className="font-medium mb-1">{review.title}</h4>
                          )}
                          {review.content && (
                            <p className="text-sm text-muted-foreground">
                              {review.content}
                            </p>
                          )}
                          <Link
                            to={`/marketplace/${review.listing_id}`}
                            className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1"
                          >
                            View Listing <ExternalLink size={10} />
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default SellerProfile;
