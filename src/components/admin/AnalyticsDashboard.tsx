import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, Store, Package, CreditCard, TrendingUp, 
  UserPlus, ShoppingCart, Calendar, Loader2 
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell 
} from 'recharts';

interface AnalyticsData {
  totalSellers: number;
  totalBuyers: number;
  totalListings: number;
  publishedListings: number;
  totalPurchases: number;
  totalRevenue: number;
  recentSellers: Array<{ id: string; email: string | null; display_name: string | null; created_at: string }>;
  recentListings: Array<{ id: string; title: string; category: string; created_at: string }>;
  recentPurchases: Array<{ id: string; amount: number; status: string | null; created_at: string }>;
  listingsByCategory: Array<{ category: string; count: number }>;
  purchasesByDay: Array<{ date: string; count: number; revenue: number }>;
  sellersByDay: Array<{ date: string; count: number }>;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const categoryLabels: Record<string, string> = {
  websites: 'Websites',
  server_files: 'Server Files',
  antihack: 'Antihack',
  launchers: 'Launchers',
  custom_scripts: 'Custom Scripts',
};

export const AnalyticsDashboard = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      // Fetch all data in parallel
      const [
        sellersRes,
        buyersRes,
        listingsRes,
        purchasesRes,
        sellerCategoriesRes,
      ] = await Promise.all([
        supabase.from('profiles').select('id, email, display_name, created_at, user_type').eq('user_type', 'seller'),
        supabase.from('profiles').select('id, email, display_name, created_at, user_type').eq('user_type', 'buyer'),
        supabase.from('listings').select('*'),
        supabase.from('listing_purchases').select('*'),
        supabase.from('seller_categories').select('*'),
      ]);

      const sellers = sellersRes.data || [];
      const buyers = buyersRes.data || [];
      const listings = listingsRes.data || [];
      const purchases = purchasesRes.data || [];

      // Calculate listings by category
      const categoryCount: Record<string, number> = {};
      listings.forEach(l => {
        categoryCount[l.category] = (categoryCount[l.category] || 0) + 1;
      });
      const listingsByCategory = Object.entries(categoryCount).map(([category, count]) => ({
        category: categoryLabels[category] || category,
        count: count as number,
      }));

      // Calculate purchases by day (last 7 days)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return date.toISOString().split('T')[0];
      }).reverse();

      const purchasesByDay = last7Days.map(date => {
        const dayPurchases = purchases.filter(p => 
          p.created_at.startsWith(date) && p.status === 'completed'
        );
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: dayPurchases.length,
          revenue: dayPurchases.reduce((sum, p) => sum + (p.amount / 100), 0),
        };
      });

      // Calculate sellers by day (last 7 days)
      const sellersByDay = last7Days.map(date => {
        const daySellers = sellers.filter(s => 
          s.created_at.startsWith(date)
        );
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: daySellers.length,
        };
      });

      // Recent items
      const recentSellers = sellers
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      const recentListings = listings
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      const recentPurchases = purchases
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      const completedPurchases = purchases.filter(p => p.status === 'completed');
      const totalRevenue = completedPurchases.reduce((sum, p) => sum + (p.amount / 100), 0);

      setData({
        totalSellers: sellers.length,
        totalBuyers: buyers.length,
        totalListings: listings.length,
        publishedListings: listings.filter(l => l.is_published).length,
        totalPurchases: completedPurchases.length,
        totalRevenue,
        recentSellers,
        recentListings,
        recentPurchases,
        listingsByCategory,
        purchasesByDay,
        sellersByDay,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
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
        Failed to load analytics data.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{data.totalSellers}</p>
                <p className="text-xs text-muted-foreground">Sellers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-chart-2" />
              <div>
                <p className="text-2xl font-bold">{data.totalBuyers}</p>
                <p className="text-xs text-muted-foreground">Buyers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-chart-3" />
              <div>
                <p className="text-2xl font-bold">{data.totalListings}</p>
                <p className="text-xs text-muted-foreground">Listings</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-chart-4" />
              <div>
                <p className="text-2xl font-bold">{data.publishedListings}</p>
                <p className="text-xs text-muted-foreground">Published</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-chart-5" />
              <div>
                <p className="text-2xl font-bold">{data.totalPurchases}</p>
                <p className="text-xs text-muted-foreground">Purchases</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">${data.totalRevenue.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground">Revenue</p>
              </div>
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
              Revenue (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.purchasesByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Listings by Category */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="w-4 h-4" />
              Listings by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.listingsByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="category"
                    label={({ category, count }) => `${category}: ${count}`}
                    labelLine={false}
                  >
                    {data.listingsByCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* New Sellers Over Time */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              New Sellers (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.sellersByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Purchases Over Time */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Purchases (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.purchasesByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sellers */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Recent Sellers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentSellers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sellers yet</p>
            ) : (
              data.recentSellers.map((seller) => (
                <div key={seller.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <div>
                    <p className="text-sm font-medium">{seller.display_name || 'Unknown'}</p>
                    <p className="text-xs text-muted-foreground">{seller.email}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(seller.created_at).toLocaleDateString()}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Listings */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="w-4 h-4" />
              Recent Listings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentListings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No listings yet</p>
            ) : (
              data.recentListings.map((listing) => (
                <div key={listing.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <div>
                    <p className="text-sm font-medium line-clamp-1">{listing.title}</p>
                    <p className="text-xs text-muted-foreground">{categoryLabels[listing.category]}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(listing.created_at).toLocaleDateString()}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Purchases */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Recent Purchases
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentPurchases.length === 0 ? (
              <p className="text-sm text-muted-foreground">No purchases yet</p>
            ) : (
              data.recentPurchases.map((purchase) => (
                <div key={purchase.id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <div>
                    <p className="text-sm font-medium">${(purchase.amount / 100).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground capitalize">{purchase.status}</p>
                  </div>
                  <Badge 
                    variant={purchase.status === 'completed' ? 'default' : 'secondary'} 
                    className="text-xs"
                  >
                    <Calendar className="w-3 h-3 mr-1" />
                    {new Date(purchase.created_at).toLocaleDateString()}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
