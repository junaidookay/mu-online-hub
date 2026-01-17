import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, TrendingUp, Users, Calendar, Loader2 } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';

interface ListingAnalyticsProps {
  listingId: string;
  listingTitle: string;
}

interface ViewStats {
  totalViews: number;
  uniqueViewers: number;
  todayViews: number;
  weeklyViews: number;
  dailyData: { date: string; views: number }[];
}

export const ListingAnalytics = ({ listingId, listingTitle }: ListingAnalyticsProps) => {
  const [stats, setStats] = useState<ViewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [listingId]);

  const fetchAnalytics = async () => {
    setIsLoading(true);

    // Fetch all views for this listing
    const { data: views, error } = await supabase
      .from('listing_views')
      .select('*')
      .eq('listing_id', listingId);

    if (error) {
      console.error('Error fetching analytics:', error);
      setIsLoading(false);
      return;
    }

    const now = new Date();
    const todayStart = startOfDay(now);
    const weekAgo = subDays(now, 7);

    // Calculate stats
    const totalViews = views?.length || 0;
    const uniqueViewers = new Set(views?.map(v => v.viewer_id || v.ip_hash)).size;
    const todayViews = views?.filter(v => new Date(v.viewed_at) >= todayStart).length || 0;
    const weeklyViews = views?.filter(v => new Date(v.viewed_at) >= weekAgo).length || 0;

    // Generate daily data for chart (last 7 days)
    const dailyData: { date: string; views: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(now, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      const dayViews = views?.filter(v => {
        const viewDate = new Date(v.viewed_at);
        return viewDate >= dayStart && viewDate <= dayEnd;
      }).length || 0;

      dailyData.push({
        date: format(date, 'MMM d'),
        views: dayViews,
      });
    }

    setStats({
      totalViews,
      uniqueViewers,
      todayViews,
      weeklyViews,
      dailyData,
    });
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const chartConfig = {
    views: {
      label: 'Views',
      color: 'hsl(var(--primary))',
    },
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Analytics
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {listingTitle}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Views</span>
            </div>
            <p className="text-xl font-bold">{stats.totalViews}</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-green-400" />
              <span className="text-xs text-muted-foreground">Unique Viewers</span>
            </div>
            <p className="text-xl font-bold">{stats.uniqueViewers}</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-muted-foreground">Today</span>
            </div>
            <p className="text-xl font-bold">{stats.todayViews}</p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-muted-foreground">This Week</span>
            </div>
            <p className="text-xl font-bold">{stats.weeklyViews}</p>
          </div>
        </div>

        {stats.dailyData.some(d => d.views > 0) ? (
          <ChartContainer config={chartConfig} className="h-[150px]">
            <AreaChart data={stats.dailyData}>
              <defs>
                <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                fontSize={10}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                fontSize={10}
                stroke="hsl(var(--muted-foreground))"
                width={30}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="views"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#viewsGradient)"
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <div className="h-[150px] flex items-center justify-center text-sm text-muted-foreground">
            No view data to display yet
          </div>
        )}
      </CardContent>
    </Card>
  );
};
