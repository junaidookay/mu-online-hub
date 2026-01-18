import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SEOHead } from '@/components/SEOHead';
import Header from '@/components/layout/Header';
import { 
  Loader2, ArrowLeft, ArrowUpRight, ArrowDownLeft, 
  CreditCard, Wallet, Package, Calendar, DollarSign,
  TrendingUp, TrendingDown
} from 'lucide-react';
import { format } from 'date-fns';

interface Purchase {
  id: string;
  amount: number;
  status: string;
  currency: string;
  created_at: string;
  completed_at: string | null;
  listing_id: string;
  seller_id: string | null;
  listing?: {
    title: string;
    category: string;
  };
  seller_profile?: {
    display_name: string | null;
  };
}

interface Payout {
  id: string;
  amount_cents: number;
  net_amount_cents: number;
  platform_fee_cents: number | null;
  status: string;
  created_at: string;
  paid_at: string | null;
  listing_id: string | null;
  listing?: {
    title: string;
  };
  buyer_profile?: {
    display_name: string | null;
  };
}

const TransactionHistory = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'purchases' | 'sales'>('purchases');
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user]);

  const fetchTransactions = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Fetch purchases (money spent)
      const { data: purchasesData } = await supabase
        .from('listing_purchases')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (purchasesData) {
        const enrichedPurchases = await Promise.all(
          purchasesData.map(async (purchase) => {
            const { data: listing } = await supabase
              .from('listings')
              .select('title, category')
              .eq('id', purchase.listing_id)
              .single();

            let sellerProfile = null;
            if (purchase.seller_id) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('display_name')
                .eq('user_id', purchase.seller_id)
                .single();
              sellerProfile = profile;
            }

            return { ...purchase, listing, seller_profile: sellerProfile };
          })
        );
        setPurchases(enrichedPurchases);
      }

      // Fetch payouts (money received as seller)
      const { data: payoutsData } = await supabase
        .from('seller_payouts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (payoutsData) {
        const enrichedPayouts = await Promise.all(
          payoutsData.map(async (payout) => {
            let listing = null;
            if (payout.listing_id) {
              const { data } = await supabase
                .from('listings')
                .select('title')
                .eq('id', payout.listing_id)
                .single();
              listing = data;
            }

            return { ...payout, listing };
          })
        );
        setPayouts(enrichedPayouts);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return 'bg-green-500/20 text-green-400';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'failed':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const totalSpent = purchases
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalEarned = payouts
    .filter(p => p.status === 'paid' || p.status === 'completed')
    .reduce((sum, p) => sum + p.net_amount_cents, 0);

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
        title="Transaction History - MU Online Hub"
        description="View your payment history, purchases, and earnings on MU Online Hub."
      />
      <Header />

      <main className="container py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" asChild>
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-gradient-gold">
              Transaction History
            </h1>
            <p className="text-muted-foreground">View all your payments and earnings</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-500/20 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Spent</p>
                  <p className="text-2xl font-bold text-red-400">
                    ${(totalSpent / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Earned</p>
                  <p className="text-2xl font-bold text-green-400">
                    ${(totalEarned / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'purchases' | 'sales')}>
          <TabsList className="mb-6">
            <TabsTrigger value="purchases" className="gap-2">
              <ArrowUpRight className="w-4 h-4" />
              Purchases ({purchases.length})
            </TabsTrigger>
            <TabsTrigger value="sales" className="gap-2">
              <ArrowDownLeft className="w-4 h-4" />
              Sales ({payouts.length})
            </TabsTrigger>
          </TabsList>

          {/* Purchases Tab */}
          <TabsContent value="purchases">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-red-400" />
                  Your Purchases
                </CardTitle>
              </CardHeader>
              <CardContent>
                {purchases.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No purchases yet</p>
                    <Button asChild className="mt-4" variant="outline">
                      <Link to="/marketplace">Browse Marketplace</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {purchases.map((purchase) => (
                      <div 
                        key={purchase.id}
                        className="flex items-center justify-between p-4 bg-muted/20 rounded-lg border border-border/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-red-500/20 rounded-lg">
                            <ArrowUpRight className="w-5 h-5 text-red-400" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {purchase.listing?.title || 'Unknown Listing'}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(purchase.created_at), 'MMM dd, yyyy')}
                              {purchase.seller_profile?.display_name && (
                                <>
                                  <span>•</span>
                                  <span>Seller: {purchase.seller_profile.display_name}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-400">
                            -${(purchase.amount / 100).toFixed(2)}
                          </p>
                          <Badge className={getStatusColor(purchase.status || 'pending')}>
                            {purchase.status || 'pending'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sales Tab */}
          <TabsContent value="sales">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownLeft className="w-5 h-5 text-green-400" />
                  Your Sales & Earnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {payouts.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No sales yet</p>
                    <Button asChild className="mt-4" variant="outline">
                      <Link to="/seller-dashboard">Go to Seller Dashboard</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {payouts.map((payout) => (
                      <div 
                        key={payout.id}
                        className="flex items-center justify-between p-4 bg-muted/20 rounded-lg border border-border/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-green-500/20 rounded-lg">
                            <ArrowDownLeft className="w-5 h-5 text-green-400" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {payout.listing?.title || 'Sale'}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(payout.created_at), 'MMM dd, yyyy')}
                              {payout.platform_fee_cents && payout.platform_fee_cents > 0 && (
                                <>
                                  <span>•</span>
                                  <span>Fee: ${(payout.platform_fee_cents / 100).toFixed(2)}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-400">
                            +${(payout.net_amount_cents / 100).toFixed(2)}
                          </p>
                          <Badge className={getStatusColor(payout.status || 'pending')}>
                            {payout.status || 'pending'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default TransactionHistory;
