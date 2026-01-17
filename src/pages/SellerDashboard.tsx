import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { SEOHead } from '@/components/SEOHead';
import Header from '@/components/layout/Header';
import { StripeConnectCard } from '@/components/seller/StripeConnectCard';
import { ListingAnalytics } from '@/components/seller/ListingAnalytics';
import { categoryIcons, categoryLabels } from '@/lib/categories';
import { 
  Plus, Package, Eye, EyeOff, Trash2, Edit, 
  Loader2, CreditCard, DollarSign, TrendingUp, ArrowRight, User, BarChart2
} from 'lucide-react';

interface Listing {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price_usd: number | null;
  is_published: boolean;
  is_active: boolean;
  expires_at: string | null;
  image_url: string | null;
}

interface SellerCategory {
  category: string;
}

interface EarningsStats {
  total_earned_cents: number;
  sales_count: number;
  pending_amount: number;
}

const SellerDashboard = () => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedListingForAnalytics, setSelectedListingForAnalytics] = useState<Listing | null>(null);
  const [earningsStats, setEarningsStats] = useState<EarningsStats>({
    total_earned_cents: 0,
    sales_count: 0,
    pending_amount: 0,
  });
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

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

  // Handle Stripe callback messages
  useEffect(() => {
    if (searchParams.get('stripe_success') === 'true') {
      toast({ title: 'Success', description: 'Your Stripe account has been connected!' });
    } else if (searchParams.get('stripe_refresh') === 'true') {
      toast({ title: 'Info', description: 'Please complete your Stripe onboarding.' });
    }
  }, [searchParams, toast]);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);

    // Fetch seller categories
    const { data: catData } = await supabase
      .from('seller_categories')
      .select('category')
      .eq('user_id', user.id);

    if (catData) {
      setCategories(catData.map((c: SellerCategory) => c.category));
    }

    // Fetch listings
    const { data: listingsData } = await supabase
      .from('listings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (listingsData) {
      setListings(listingsData);
    }

    // Fetch earnings stats
    const { data: statsData } = await supabase
      .from('user_stats')
      .select('total_earned_cents, sales_count')
      .eq('user_id', user.id)
      .single();

    // Fetch pending payouts
    const { data: pendingPayouts } = await supabase
      .from('seller_payouts')
      .select('net_amount_cents')
      .eq('user_id', user.id)
      .eq('status', 'pending');

    const pendingAmount = pendingPayouts?.reduce((sum, p) => sum + p.net_amount_cents, 0) || 0;

    setEarningsStats({
      total_earned_cents: statsData?.total_earned_cents || 0,
      sales_count: statsData?.sales_count || 0,
      pending_amount: pendingAmount,
    });

    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Listing removed successfully' });
      fetchData();
    }
  };

  const filteredListings = activeTab === 'all' 
    ? listings 
    : listings.filter(l => l.category === activeTab);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (categories.length === 0) {
    navigate('/seller-onboarding');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Seller Dashboard - MU Online Hub"
        description="Manage your listings and track your sales on MU Online Hub."
      />
      <Header />

      <main className="container py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-gradient-gold">
              Seller Dashboard
            </h1>
            <p className="text-muted-foreground">Manage your listings and earnings</p>
          </div>
          <Button asChild className="btn-fantasy-primary">
            <Link to="/seller-dashboard/create">
              <Plus className="w-4 h-4 mr-2" />
              Create Listing
            </Link>
          </Button>
        </div>

        {/* Earnings Summary Card */}
        <Card className="glass-card mb-8">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" />
                Earnings Summary
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to="/seller/earnings">
                  View Details
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold text-primary">
                  ${(earningsStats.total_earned_cents / 100).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">Total Earned</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold text-yellow-400">
                  ${(earningsStats.pending_amount / 100).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">Pending Payout</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold text-green-400">
                  {earningsStats.sales_count}
                </p>
                <p className="text-xs text-muted-foreground">Total Sales</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <Link 
                  to={`/seller/profile/${user?.id}`} 
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <User className="w-4 h-4" />
                  View Public Profile
                </Link>
                <p className="text-xs text-muted-foreground mt-1">See how buyers see you</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Stripe Connect Card */}
          <div className="lg:col-span-1">
            <StripeConnectCard />
          </div>

          {/* Quick Stats */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <p className="text-2xl font-bold text-primary">{listings.length}</p>
                  <p className="text-xs text-muted-foreground">Total Listings</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <p className="text-2xl font-bold text-green-400">
                    {listings.filter(l => l.is_published).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Published</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <p className="text-2xl font-bold text-yellow-400">
                    {listings.filter(l => !l.is_published).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Drafts</p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="pt-6">
                  <p className="text-2xl font-bold text-muted-foreground">{categories.length}</p>
                  <p className="text-xs text-muted-foreground">Categories</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            variant={activeTab === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('all')}
          >
            All ({listings.length})
          </Button>
          {categories.map(cat => {
            const Icon = categoryIcons[cat] || Package;
            const count = listings.filter(l => l.category === cat).length;
            return (
              <Button
                key={cat}
                variant={activeTab === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab(cat)}
                className="flex items-center gap-2"
              >
                <Icon className="w-4 h-4" />
                {categoryLabels[cat] || cat} ({count})
              </Button>
            );
          })}
        </div>

        {/* Listings Grid */}
        {filteredListings.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-display text-lg font-semibold mb-2">No Listings Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first listing to start selling on the marketplace.
              </p>
              <Button asChild className="btn-fantasy-primary">
                <Link to="/seller-dashboard/create">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Listing
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredListings.map(listing => {
              const Icon = categoryIcons[listing.category] || Package;
              const isExpired = listing.expires_at && new Date(listing.expires_at) < new Date();
              
              return (
                <Card key={listing.id} className="glass-card overflow-hidden">
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
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-primary" />
                        <Badge variant="outline" className="text-xs">
                          {categoryLabels[listing.category] || listing.category}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        {listing.is_published ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                            <Eye className="w-3 h-3 mr-1" />
                            Live
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <EyeOff className="w-3 h-3 mr-1" />
                            Draft
                          </Badge>
                        )}
                      </div>
                    </div>
                    <CardTitle className="text-base mt-2">{listing.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {listing.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {listing.description}
                      </p>
                    )}
                    {listing.price_usd && (
                      <p className="text-lg font-bold text-primary mb-3">
                        ${listing.price_usd.toFixed(2)}
                      </p>
                    )}
                    {listing.expires_at && (
                      <p className={`text-xs mb-3 ${isExpired ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {isExpired ? 'Expired' : `Expires: ${new Date(listing.expires_at).toLocaleDateString()}`}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild className="flex-1">
                        <Link to={`/seller-dashboard/edit/${listing.id}`}>
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Link>
                      </Button>
                      {!listing.is_published && (
                        <Button size="sm" asChild className="flex-1 btn-fantasy-primary">
                          <Link to={`/seller-dashboard/publish/${listing.id}`}>
                            <CreditCard className="w-4 h-4 mr-1" />
                            Publish
                          </Link>
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setSelectedListingForAnalytics(
                          selectedListingForAnalytics?.id === listing.id ? null : listing
                        )}
                      >
                        <BarChart2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDelete(listing.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {selectedListingForAnalytics?.id === listing.id && (
                      <div className="mt-4">
                        <ListingAnalytics 
                          listingId={listing.id} 
                          listingTitle={listing.title} 
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default SellerDashboard;