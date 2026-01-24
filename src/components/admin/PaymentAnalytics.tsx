import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, TrendingUp, DollarSign, RefreshCw,
  ArrowUpRight, ArrowDownRight, Wallet, Loader2
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

interface PaymentAnalyticsData {
  totalRevenue: number;
  stripeRevenue: number;
  paypalRevenue: number;
  totalTransactions: number;
  stripeTransactions: number;
  paypalTransactions: number;
  completedTransactions: number;
  pendingTransactions: number;
  revenueByDay: Array<{ date: string; stripe: number; paypal: number; total: number }>;
  transactionsByProvider: Array<{ name: string; value: number; color: string }>;
  recentTransactions: Array<{
    id: string;
    amount: number;
    provider: string;
    status: string;
    created_at: string;
    product_type: string;
  }>;
  averageTransactionValue: number;
  growthRate: number;
}

const STRIPE_COLOR = 'hsl(var(--chart-1))';
const PAYPAL_COLOR = 'hsl(var(--chart-2))';

export const PaymentAnalytics = () => {
  const [data, setData] = useState<PaymentAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      // Fetch from listing_purchases (marketplace transactions)
      const { data: listingPurchases } = await supabase
        .from('listing_purchases')
        .select('*')
        .order('created_at', { ascending: false });

      // Fetch from slot_purchases (slot transactions)
      const { data: slotPurchases } = await supabase
        .from('slot_purchases')
        .select('*, pricing_packages(price_cents)')
        .order('created_at', { ascending: false });

      // Fetch from payments table (unified payments log)
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      // Combine all transactions for analysis
      const allTransactions: Array<{
        id: string;
        amount: number;
        provider: string;
        status: string;
        created_at: string;
        product_type: string;
      }> = [];

      // Process listing purchases
      (listingPurchases || []).forEach(p => {
        const isPayPal = p.stripe_payment_intent_id?.startsWith('paypal_');
        allTransactions.push({
          id: p.id,
          amount: p.amount || 0,
          provider: isPayPal ? 'paypal' : 'stripe',
          status: p.status || 'pending',
          created_at: p.created_at,
          product_type: 'listing',
        });
      });

      // Process slot purchases
      (slotPurchases || []).forEach(p => {
        const isPayPal = p.stripe_payment_intent_id?.startsWith('paypal_');
        const amount = p.pricing_packages?.price_cents || 0;
        allTransactions.push({
          id: p.id,
          amount: amount,
          provider: isPayPal ? 'paypal' : 'stripe',
          status: p.is_active ? 'completed' : 'pending',
          created_at: p.created_at,
          product_type: p.product_type || 'slot',
        });
      });

      // Also check payments table for PayPal-specific entries
      (payments || []).forEach(p => {
        const metadata = p.metadata as Record<string, unknown> | null;
        const isPayPal = metadata?.payment_provider === 'paypal';
        if (isPayPal) {
          // Check if this payment is already tracked via other tables
          const paypalOrderId = metadata?.paypal_order_id;
          const existingIdx = allTransactions.findIndex(t => 
            t.provider === 'paypal' && 
            (t.id === p.id || t.id === paypalOrderId)
          );
          if (existingIdx === -1) {
            allTransactions.push({
              id: p.id,
              amount: p.amount || 0,
              provider: 'paypal',
              status: p.status || 'pending',
              created_at: p.created_at,
              product_type: p.product_type || 'unknown',
            });
          }
        }
      });

      // Calculate metrics
      const completedTransactions = allTransactions.filter(t => 
        t.status === 'completed' || t.status === 'active'
      );
      const pendingTransactions = allTransactions.filter(t => 
        t.status === 'pending'
      );

      const stripeTransactions = completedTransactions.filter(t => t.provider === 'stripe');
      const paypalTransactions = completedTransactions.filter(t => t.provider === 'paypal');

      const stripeRevenue = stripeTransactions.reduce((sum, t) => sum + (t.amount / 100), 0);
      const paypalRevenue = paypalTransactions.reduce((sum, t) => sum + (t.amount / 100), 0);
      const totalRevenue = stripeRevenue + paypalRevenue;

      // Revenue by day (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const revenueByDay = last7Days.map(date => {
        const dayTransactions = completedTransactions.filter(t => 
          t.created_at.startsWith(date)
        );
        const stripeDay = dayTransactions
          .filter(t => t.provider === 'stripe')
          .reduce((sum, t) => sum + (t.amount / 100), 0);
        const paypalDay = dayTransactions
          .filter(t => t.provider === 'paypal')
          .reduce((sum, t) => sum + (t.amount / 100), 0);

        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          stripe: stripeDay,
          paypal: paypalDay,
          total: stripeDay + paypalDay,
        };
      });

      // Provider breakdown for pie chart
      const transactionsByProvider = [
        { name: 'Stripe', value: stripeTransactions.length, color: STRIPE_COLOR },
        { name: 'PayPal', value: paypalTransactions.length, color: PAYPAL_COLOR },
      ].filter(p => p.value > 0);

      // Calculate growth rate (compare last 7 days vs previous 7 days)
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const fourteenDaysAgo = new Date(now);
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      const currentPeriodRevenue = completedTransactions
        .filter(t => new Date(t.created_at) >= sevenDaysAgo)
        .reduce((sum, t) => sum + (t.amount / 100), 0);
      
      const previousPeriodRevenue = completedTransactions
        .filter(t => {
          const date = new Date(t.created_at);
          return date >= fourteenDaysAgo && date < sevenDaysAgo;
        })
        .reduce((sum, t) => sum + (t.amount / 100), 0);

      const growthRate = previousPeriodRevenue > 0 
        ? ((currentPeriodRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100 
        : 0;

      // Average transaction value
      const averageTransactionValue = completedTransactions.length > 0
        ? totalRevenue / completedTransactions.length
        : 0;

      // Recent transactions (last 10)
      const recentTransactions = allTransactions
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);

      setData({
        totalRevenue,
        stripeRevenue,
        paypalRevenue,
        totalTransactions: allTransactions.length,
        stripeTransactions: stripeTransactions.length,
        paypalTransactions: paypalTransactions.length,
        completedTransactions: completedTransactions.length,
        pendingTransactions: pendingTransactions.length,
        revenueByDay,
        transactionsByProvider,
        recentTransactions,
        averageTransactionValue,
        growthRate,
      });
    } catch (error) {
      console.error('Error fetching payment analytics:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAnalytics();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Failed to load payment analytics.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Payment Analytics</h3>
          <p className="text-sm text-muted-foreground">
            Combined Stripe + PayPal transaction data
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">${data.totalRevenue.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
              </div>
            </div>
            {data.growthRate !== 0 && (
              <div className={`flex items-center gap-1 mt-2 text-xs ${data.growthRate > 0 ? 'text-green-500' : 'text-red-500'}`}>
                {data.growthRate > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(data.growthRate).toFixed(1)}% vs last week
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-1/10">
                <CreditCard className="w-5 h-5 text-chart-1" />
              </div>
              <div>
                <p className="text-2xl font-bold">${data.stripeRevenue.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Stripe Revenue</p>
              </div>
            </div>
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs">
                {data.stripeTransactions} transactions
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-2/10">
                <Wallet className="w-5 h-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">${data.paypalRevenue.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">PayPal Revenue</p>
              </div>
            </div>
            <div className="mt-2">
              <Badge variant="secondary" className="text-xs">
                {data.paypalTransactions} transactions
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-chart-3/10">
                <TrendingUp className="w-5 h-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-bold">${data.averageTransactionValue.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Avg Transaction</p>
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <Badge variant="default" className="text-xs">
                {data.completedTransactions} completed
              </Badge>
              <Badge variant="outline" className="text-xs">
                {data.pendingTransactions} pending
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Over Time */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Revenue by Provider (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.revenueByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }} 
                    stroke="hsl(var(--muted-foreground))" 
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                  />
                  <Legend />
                  <Bar 
                    dataKey="stripe" 
                    name="Stripe"
                    fill="hsl(var(--chart-1))" 
                    radius={[4, 4, 0, 0]} 
                    stackId="a"
                  />
                  <Bar 
                    dataKey="paypal" 
                    name="PayPal"
                    fill="hsl(var(--chart-2))" 
                    radius={[4, 4, 0, 0]} 
                    stackId="a"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Provider Breakdown */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Payment Provider Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {data.transactionsByProvider.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.transactionsByProvider}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value, percent }) => 
                        `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={false}
                    >
                      {data.transactionsByProvider.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No completed transactions yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total Revenue Trend */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Revenue Trend (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.revenueByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }} 
                    stroke="hsl(var(--muted-foreground))" 
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    stroke="hsl(var(--muted-foreground))"
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Total']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.recentTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No transactions yet
              </p>
            ) : (
              data.recentTransactions.map((transaction) => (
                <div 
                  key={transaction.id} 
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      transaction.provider === 'stripe' 
                        ? 'bg-chart-1/10' 
                        : 'bg-chart-2/10'
                    }`}>
                      {transaction.provider === 'stripe' ? (
                        <CreditCard className="w-4 h-4 text-chart-1" />
                      ) : (
                        <Wallet className="w-4 h-4 text-chart-2" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        ${(transaction.amount / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {transaction.product_type.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant={transaction.provider === 'stripe' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {transaction.provider}
                    </Badge>
                    <Badge 
                      variant={
                        transaction.status === 'completed' || transaction.status === 'active'
                          ? 'default' 
                          : 'outline'
                      }
                      className={`text-xs ${
                        transaction.status === 'completed' || transaction.status === 'active'
                          ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                          : ''
                      }`}
                    >
                      {transaction.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
