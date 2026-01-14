import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, DollarSign, TrendingUp, Clock, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

interface EarningsTransaction {
  id: string;
  amount_cents: number;
  platform_fee_cents: number;
  net_amount_cents: number;
  status: string;
  paid_at: string | null;
  created_at: string;
  listing: {
    title: string;
    category: string;
  } | null;
}

interface Purchase {
  id: string;
  amount: number;
  status: string;
  completed_at: string | null;
  created_at: string;
  listing: {
    title: string;
  } | null;
  buyer_profile?: {
    display_name: string | null;
  } | null;
}

interface UserStats {
  total_earned_cents: number;
  sales_count: number;
  seller_xp: number;
  seller_level: number;
}

export default function SellerEarnings() {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState<EarningsTransaction[]>([]);
  const [sales, setSales] = useState<Purchase[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchEarningsData();
    }
  }, [user]);

  const fetchEarningsData = async () => {
    setIsLoading(true);
    
    // Fetch payouts
    const { data: payoutsData } = await supabase
      .from('seller_payouts')
      .select(`
        id,
        amount_cents,
        platform_fee_cents,
        net_amount_cents,
        status,
        paid_at,
        created_at,
        listing:listings(title, category)
      `)
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    // Fetch completed sales (purchases where user is seller)
    const { data: salesData } = await supabase
      .from('listing_purchases')
      .select(`
        id,
        amount,
        status,
        completed_at,
        created_at,
        listing:listings(title)
      `)
      .eq('seller_id', user?.id)
      .order('created_at', { ascending: false });

    // Fetch user stats
    const { data: statsData } = await supabase
      .from('user_stats')
      .select('total_earned_cents, sales_count, seller_xp, seller_level')
      .eq('user_id', user?.id)
      .single();

    setPayouts((payoutsData as any) || []);
    setSales((salesData as any) || []);
    setStats(statsData);
    setIsLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
      case 'paid':
        return <Badge className="bg-green-500/20 text-green-400"><CheckCircle className="w-3 h-3 mr-1" /> Paid</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalEarned = stats?.total_earned_cents || 0;
  const pendingAmount = payouts
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.net_amount_cents, 0);
  const completedSales = sales.filter(s => s.status === 'completed').length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/seller" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="font-display text-3xl font-bold">Earnings & Payouts</h1>
          <p className="text-muted-foreground">Track your sales and payout history</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Earned</p>
                  <p className="text-2xl font-bold">${(totalEarned / 100).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending Payout</p>
                  <p className="text-2xl font-bold">${(pendingAmount / 100).toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed Sales</p>
                  <p className="text-2xl font-bold">{completedSales}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <span className="text-lg font-bold text-purple-500">{stats?.seller_level || 1}</span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Seller Level</p>
                  <p className="text-2xl font-bold">{stats?.seller_xp || 0} XP</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="sales" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sales">Sales History</TabsTrigger>
            <TabsTrigger value="payouts">Payout History</TabsTrigger>
          </TabsList>

          <TabsContent value="sales">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Sales History</CardTitle>
                <CardDescription>All purchases of your listings</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-muted/20 rounded animate-pulse" />
                    ))}
                  </div>
                ) : sales.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No sales yet</p>
                ) : (
                  <div className="space-y-4">
                    {sales.map(sale => (
                      <div key={sale.id} className="flex items-center justify-between p-4 border border-border/50 rounded-lg">
                        <div>
                          <p className="font-medium">{sale.listing?.title || 'Unknown Listing'}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(sale.created_at), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="font-bold text-primary">${(sale.amount / 100).toFixed(2)}</p>
                          {getStatusBadge(sale.status || 'pending')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payouts">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Payout History</CardTitle>
                <CardDescription>Track your Stripe payouts and transfers</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-muted/20 rounded animate-pulse" />
                    ))}
                  </div>
                ) : payouts.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No payouts yet</p>
                    <p className="text-sm text-muted-foreground">
                      Payouts are processed automatically when sales are completed through Stripe Connect.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {payouts.map(payout => (
                      <div key={payout.id} className="flex items-center justify-between p-4 border border-border/50 rounded-lg">
                        <div>
                          <p className="font-medium">{payout.listing?.title || 'Payout'}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(payout.created_at), 'MMM dd, yyyy HH:mm')}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Gross: ${(payout.amount_cents / 100).toFixed(2)} | 
                            Fee: ${(payout.platform_fee_cents / 100).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="font-bold text-green-500">${(payout.net_amount_cents / 100).toFixed(2)}</p>
                          {getStatusBadge(payout.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
