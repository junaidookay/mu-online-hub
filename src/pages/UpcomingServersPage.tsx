import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import { SEOHead } from '@/components/SEOHead';
import { Calendar, ExternalLink, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Tables } from '@/integrations/supabase/types';

type ServerType = Tables<'servers'>;

const UpcomingServersPage = () => {
  const [servers, setServers] = useState<ServerType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchServers = async () => {
      const { data } = await supabase
        .from('servers')
        .select('*')
        .eq('is_active', true)
        .order('open_date', { ascending: true });
      if (data) setServers(data);
      setIsLoading(false);
    };
    fetchServers();
  }, []);

  const now = useMemo(() => new Date(), []);
  const endOfWeek = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() + (7 - d.getDay()));
    return d;
  }, [now]);
  const endOfMonth = useMemo(() => new Date(now.getFullYear(), now.getMonth() + 1, 0), [now]);
  const next30 = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() + 30);
    return d;
  }, [now]);
  const thirtyDaysAgo = useMemo(() => {
    const d = new Date(now);
    d.setDate(d.getDate() - 30);
    return d;
  }, [now]);

  const latestServers = useMemo(() => [...servers].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10), [servers]);

  const openingThisWeek = useMemo(() => servers.filter(s => {
    if (!s.open_date) return false;
    const d = new Date(s.open_date);
    return d >= now && d <= endOfWeek;
  }), [servers, now, endOfWeek]);

  const openingThisMonth = useMemo(() => servers.filter(s => {
    if (!s.open_date) return false;
    const d = new Date(s.open_date);
    return d > endOfWeek && d <= endOfMonth;
  }), [servers, endOfWeek, endOfMonth]);

  const recentlyOpened = useMemo(() => servers.filter(s => {
    if (!s.open_date) return false;
    const d = new Date(s.open_date);
    return d < now && d >= thirtyDaysAgo;
  }), [servers, now, thirtyDaysAgo]);

  const next30Days = useMemo(() => servers.filter(s => {
    if (!s.open_date) return false;
    const d = new Date(s.open_date);
    return d > endOfMonth && d <= next30;
  }), [servers, endOfMonth, next30]);

  const ServerCard = ({ server }: { server: ServerType }) => {
    const isUpcoming = server.open_date && new Date(server.open_date) > now;
    return (
      <Link
        to={`/servers/${server.slug || server.id}`}
        className="block glass-card overflow-hidden group hover:border-primary/50 transition-colors"
      >
        <div className="relative">
          {server.banner_url ? (
            <img src={server.banner_url} alt={server.name} className="w-full h-20 object-cover" />
          ) : (
            <div className="w-full h-20 bg-gradient-to-r from-primary/20 to-secondary/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent" />
          <div className="absolute inset-0 p-3 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-display text-sm font-bold text-primary">{server.name}</h4>
                <p className="text-[10px] text-muted-foreground">{server.season} {server.part} - {server.exp_rate}</p>
              </div>
              <div className="flex items-center gap-1">
                {isUpcoming && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">Upcoming</span>
                )}
                <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[9px] text-muted-foreground/70 truncate">{server.features?.join(' - ') || ''}</p>
              {server.open_date && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(server.open_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  };

  const Section = ({ title, servers: sectionServers }: { title: string; servers: ServerType[] }) => {
    if (sectionServers.length === 0) return null;
    return (
      <div className="mb-8">
        <h2 className="font-display text-xl font-bold text-foreground mb-4">{title} ({sectionServers.length})</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {sectionServers.map(s => <ServerCard key={s.id} server={s} />)}
        </div>
      </div>
    );
  };

  return (
    <>
      <SEOHead
        title="Upcoming & Recent MU Online Servers | MU Online Hub"
        description="Discover upcoming and recently opened MU Online servers. Find new servers opening this week, this month, and beyond."
      />
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-primary mb-2">Upcoming & Recent Servers</h1>
            <p className="text-muted-foreground">Find new MU Online servers opening soon or recently launched</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <>
              <Section title="Latest Servers" servers={latestServers} />
              <Section title="Opening This Week" servers={openingThisWeek} />
              <Section title="Opening This Month" servers={openingThisMonth} />
              <Section title="Already Opened Recently" servers={recentlyOpened} />
              <Section title="Next 30 Days" servers={next30Days} />
              {servers.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">No servers found.</div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
};

export default UpcomingServersPage;
