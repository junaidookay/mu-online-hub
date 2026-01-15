import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/SEOHead';
import Header from '@/components/layout/Header';
import { UserBadges } from '@/components/user/UserBadges';
import { Loader2, Package, Star, ShoppingBag, TrendingUp, ExternalLink, User } from 'lucide-react';
import { format } from 'date-fns';

interface Purchase {
  id: string;
  amount: number;
  status: string;
  duration_days: number;
  created_at: string;
  completed_at: string | null;
  listing: {
    id: string;
    title: string;
    image_url: string | null;
    category: string;
  } | null;
  seller_profile?: {
    display_name: string | null;
    user_id: string;
  } | null;
}

interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  created_at: string;
  listing: {
    id: string;
    title: string;
  } | null;
}

interface BuyerStats {
  total_spent_cents: number;
  purchases_count: number;
  buyer_xp: number;
  buyer_level: number;
  badges: string[];
}

const BuyerDashboard = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<BuyerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);

    // Fetch purchases with listings
    const { data: purchasesData } = await supabase
      .from('listing_purchases')
      .select(`
        id,
        amount,
        status,
        duration_days,
        created_at,
        completed_at,
        seller_id,
        listing_id
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (purchasesData) {
      // Fetch listing and seller details for each purchase
      const enrichedPurchases = await Promise.all(
        purchasesData.map(async (purchase) => {
          const { data: listing } = await supabase
            .from('listings')
            .select('id, title, image_url, category')
            .eq('id', purchase.listing_id)
            .single();

          let sellerProfile = null;
          if (purchase.seller_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('display_name, user_id')
              .eq('user_id', purchase.seller_id)
              .single();
            sellerProfile = profile;
          }

          return {
            ...purchase,
            listing,
            seller_profile: sellerProfile
          };
        })
      );
      setPurchases(enrichedPurchases);
    }

    // Fetch reviews left by user
    const { data: reviewsData } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        title,
        content,
        created_at,
        listing_id
      `)
      .eq('reviewer_id', user.id)
      .order('created_at', { ascending: false });

    if (reviewsData) {
      const enrichedReviews = await Promise.all(
        reviewsData.map(async (review) => {
          const { data: listing } = await supabase
            .from('listings')
            .select('id, title')
            .eq('id', review.listing_id)
            .single();
          return { ...review, listing };
        })
      );
      setReviews(enrichedReviews);
    }

    // Fetch buyer stats
    const { data: statsData } = await supabase
      .from('user_stats')
      .select('total_spent_cents, purchases_count, buyer_xp, buyer_level, badges')
      .eq('user_id', user.id)
      .single();

    if (statsData) {
      setStats(statsData);
    } else {
      setStats({
        total_spent_cents: 0,
        purchases_count: 0,
        buyer_xp: 0,
        buyer_level: 1,
        badges: []
      });
    }

    setIsLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'failed': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Buyer Dashboard - MU Online Hub"
        description="View your purchase history, reviews, and buyer stats on MU Online Hub."
      />
      <Header />

      <main className="container py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-gradient-gold">
              Buyer Dashboard
            </h1>
            <p className="text-muted-foreground">Track your purchases and reviews</p>
          </div>
          <Button asChild className="btn-fantasy-primary">
            <Link to="/marketplace">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Browse Marketplace
            </Link>
          </Button>
        </div>

        {/* Stats & Badges */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="glass-card lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Buyer Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    ${((stats?.total_spent_cents || 0) / 100).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Spent</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold text-green-400">
                    {stats?.purchases_count || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Purchases</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold text-purple-400">
                    {stats?.buyer_xp || 0} XP
                  </p>
                  <p className="text-xs text-muted-foreground">Experience</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-400">
                    Lvl {stats?.buyer_level || 1}
                  </p>
                  <p className="text-xs text-muted-foreground">Buyer Level</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Your Badges</CardTitle>
            </CardHeader>
            <CardContent>
              <UserBadges 
                badges={stats?.badges || []}
                buyerLevel={stats?.buyer_level || 1}
              />
              {(!stats?.badges || stats.badges.length === 0) && (
                <p className="text-sm text-muted-foreground">
                  Keep purchasing to earn badges!
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Purchase History */}
        <Card className="glass-card mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Purchase History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {purchases.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">No purchases yet</p>
                <Button asChild variant="outline">
                  <Link to="/marketplace">Browse Marketplace</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {purchases.map((purchase) => (
                  <div 
                    key={purchase.id} 
                    className="flex items-center gap-4 p-4 border border-border/50 rounded-lg hover:bg-muted/20 transition-colors"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {purchase.listing?.image_url ? (
                        <img 
                          src={purchase.listing.image_url} 
                          alt={purchase.listing.title} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium truncate">
                            {purchase.listing?.title || 'Listing unavailable'}
                          </h3>
                          {purchase.seller_profile && (
                            <Link 
                              to={`/seller/profile/${purchase.seller_profile.user_id}`}
                              className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                              <User className="w-3 h-3" />
                              {purchase.seller_profile.display_name || 'Unknown Seller'}
                            </Link>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(purchase.created_at), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">
                            ${(purchase.amount / 100).toFixed(2)}
                          </p>
                          <Badge className={getStatusColor(purchase.status || 'pending')}>
                            {purchase.status || 'pending'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {purchase.listing && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/marketplace/${purchase.listing.id}`}>
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reviews Left */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Reviews You've Left
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reviews.length === 0 ? (
              <div className="text-center py-8">
                <Star className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  You haven't left any reviews yet. Purchase something and share your experience!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div 
                    key={review.id} 
                    className="p-4 border border-border/50 rounded-lg"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Link 
                          to={`/marketplace/${review.listing?.id}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {review.listing?.title || 'Listing unavailable'}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(review.created_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${
                              star <= review.rating 
                                ? 'fill-yellow-500 text-yellow-500' 
                                : 'text-muted-foreground'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.title && (
                      <h4 className="font-semibold text-sm mb-1">{review.title}</h4>
                    )}
                    {review.content && (
                      <p className="text-sm text-muted-foreground">{review.content}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default BuyerDashboard;
