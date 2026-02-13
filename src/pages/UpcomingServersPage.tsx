import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import { SEOHead } from '@/components/SEOHead';
import { Calendar, ChevronRight, Loader2, Globe, MessageSquare, Crown, Star, ThumbsUp, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { Tables } from '@/integrations/supabase/types';

type ServerType = Tables<'servers'>;

const UpcomingServersPage = () => {
  const [servers, setServers] = useState<ServerType[]>([]);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const now = useMemo(() => new Date(), []);
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  useEffect(() => {
    const fetchData = async () => {
      const [serversRes, votesRes] = await Promise.all([
        supabase.from('servers').select('*').eq('is_active', true).order('open_date', { ascending: true }),
        supabase.from('server_votes').select('server_id').eq('vote_month', currentMonth).eq('vote_year', currentYear),
      ]);
      if (serversRes.data) setServers(serversRes.data);
      if (votesRes.data) {
        const counts: Record<string, number> = {};
        votesRes.data.forEach(v => { counts[v.server_id] = (counts[v.server_id] || 0) + 1; });
        setVoteCounts(counts);
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    if (!searchTerm) return servers;
    const term = searchTerm.toLowerCase();
    return servers.filter(s => s.name.toLowerCase().includes(term) || s.season.toLowerCase().includes(term));
  }, [servers, searchTerm]);

  const today = useMemo(() => {
    const d = new Date(now); d.setHours(0, 0, 0, 0); return d;
  }, [now]);
  const tomorrow = useMemo(() => { const d = new Date(today); d.setDate(d.getDate() + 1); return d; }, [today]);
  const dayAfterTomorrow = useMemo(() => { const d = new Date(today); d.setDate(d.getDate() + 2); return d; }, [today]);
  const next7 = useMemo(() => { const d = new Date(today); d.setDate(d.getDate() + 7); return d; }, [today]);
  const prev7 = useMemo(() => { const d = new Date(today); d.setDate(d.getDate() - 7); return d; }, [today]);

  const categorize = (srvs: ServerType[]) => {
    const todayServers: ServerType[] = [];
    const tomorrowServers: ServerType[] = [];
    const next7Servers: ServerType[] = [];
    const prev7Servers: ServerType[] = [];
    const olderOpened: ServerType[] = [];
    const farFuture: ServerType[] = [];

    srvs.forEach(s => {
      if (!s.open_date) {
        olderOpened.push(s);
        return;
      }
      const d = new Date(s.open_date);
      d.setHours(0, 0, 0, 0);

      if (d.getTime() === today.getTime()) todayServers.push(s);
      else if (d.getTime() === tomorrow.getTime()) tomorrowServers.push(s);
      else if (d > tomorrow && d <= next7) next7Servers.push(s);
      else if (d >= prev7 && d < today) prev7Servers.push(s);
      else if (d < prev7) olderOpened.push(s);
      else farFuture.push(s);
    });

    return { todayServers, tomorrowServers, next7Servers, prev7Servers, olderOpened, farFuture };
  };

  const categories = useMemo(() => categorize(filtered), [filtered]);

  // Top 10 by votes for sidebar
  const top10 = useMemo(() => {
    return [...servers]
      .map(s => ({ ...s, vc: voteCounts[s.id] || 0 }))
      .sort((a, b) => b.vc - a.vc)
      .slice(0, 10);
  }, [servers, voteCounts]);

  // Popular tags
  const popularRates = ['x10', 'x50', 'x100', 'x500', 'x1000'];
  const popularSeasons = useMemo(() => {
    const seasonSet = new Set(servers.map(s => s.season));
    return Array.from(seasonSet).sort().slice(0, 8);
  }, [servers]);

  const ServerRow = ({ server, showDate = true }: { server: ServerType; showDate?: boolean }) => {
    const isUpcoming = server.open_date && new Date(server.open_date) > now;
    return (
      <Link
        to={`/servers/${server.slug || server.id}`}
        className="flex items-center gap-3 p-2.5 rounded-lg border border-border/30 bg-muted/10 hover:border-primary/40 hover:bg-muted/20 transition-all group"
      >
        {server.is_premium && (
          <Badge className="bg-yellow-500/20 text-yellow-400 text-[10px] px-1.5 py-0 shrink-0">VIP</Badge>
        )}
        <div className="flex items-center gap-1.5 shrink-0">
          <Globe className="w-3.5 h-3.5 text-muted-foreground" />
          {server.discord_link && <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />}
        </div>
        <span className="font-semibold text-sm text-foreground truncate flex-1 group-hover:text-primary transition-colors">
          {server.name}
        </span>
        <span className="text-xs text-muted-foreground shrink-0">{server.exp_rate} - {server.season}</span>
        {showDate && server.open_date && (
          <Badge variant={isUpcoming ? 'default' : 'secondary'} className="text-[10px] shrink-0">
            {isUpcoming ? 'Open' : 'Opened'} {new Date(server.open_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}
          </Badge>
        )}
        <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </Link>
    );
  };

  const Section = ({ title, servers: srvs, color = 'primary' }: { title: string; servers: ServerType[]; color?: string }) => {
    const [showAll, setShowAll] = useState(false);
    const display = showAll ? srvs : srvs.slice(0, 10);
    if (srvs.length === 0) {
      return (
        <div className="mb-6">
          <h2 className={`font-display text-sm font-bold uppercase tracking-wider text-${color} mb-3`}>{title}</h2>
          <div className="glass-card p-4 text-center text-sm text-muted-foreground">No servers in this category</div>
        </div>
      );
    }
    return (
      <div className="mb-6">
        <h2 className={`font-display text-sm font-bold uppercase tracking-wider text-${color} mb-3`}>{title}</h2>
        <div className="space-y-1.5">
          {display.map(s => <ServerRow key={s.id} server={s} />)}
        </div>
        {srvs.length > 10 && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full mt-2 py-2 text-xs text-primary hover:text-primary/80 border border-border/30 rounded-lg transition-colors"
          >
            See more ({srvs.length - 10} more)
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <SEOHead
        title="Upcoming & Recently Opened MU Online Servers | MU Online Hub"
        description="Find upcoming and recently opened MU Online private servers. Browse by opening date."
      />
      <div className="min-h-screen bg-background">
        <Header />

        {/* Hero */}
        <div className="border-b border-border/30 bg-gradient-to-b from-muted/30 to-transparent">
          <div className="container mx-auto px-4 py-8 text-center">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-gradient-gold uppercase tracking-wide mb-2">
              Upcoming and Recently Opened Private MU Online Servers
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              A curated MU Online server list — find what's launching soon and what's already live.
            </p>
          </div>
        </div>

        {/* Premium banners carousel */}
        <div className="container mx-auto px-4 py-4">
          <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-2">
            {servers.filter(s => s.is_premium && s.banner_url).slice(0, 5).map(s => (
              <Link key={s.id} to={`/servers/${s.slug || s.id}`} className="shrink-0 w-48 h-24 rounded-lg overflow-hidden border border-border/30 hover:border-primary/50 transition-colors">
                <img src={s.banner_url!} alt={s.name} className="w-full h-full object-cover" />
              </Link>
            ))}
          </div>
        </div>

        <main className="container mx-auto px-4 py-6">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_260px] gap-6">
              {/* Left Column — Coming Soon sections */}
              <div>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                    <Input
                      placeholder="Search by name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 bg-muted/30 text-sm h-9"
                    />
                  </div>
                </div>
                <Section title="Top Servers Coming Soon" servers={categories.farFuture} />
                <Section title="Today" servers={categories.todayServers} />
                <Section title="Tomorrow" servers={categories.tomorrowServers} />
                <Section title="Next 7 Days" servers={categories.next7Servers} />
              </div>

              {/* Center Column — Already opened */}
              <div>
                <Section title="Top Servers Already Opened" servers={categories.prev7Servers} color="secondary" />
                <Section title="Previous 7 Days" servers={categories.prev7Servers} color="secondary" />
                <Section title="Week Ago and More" servers={categories.olderOpened} color="secondary" />
              </div>

              {/* Right Column — Top 10 + Tags */}
              <div>
                <div className="glass-card p-4 mb-6">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider text-primary mb-3">Top-10 User Choice</h3>
                  <div className="space-y-2">
                    {top10.map((server, i) => (
                      <Link
                        key={server.id}
                        to={`/servers/${server.slug || server.id}`}
                        className="flex items-center gap-2 group"
                      >
                        <span className={`font-display font-bold text-sm w-6 ${i < 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="text-sm text-foreground truncate flex-1 group-hover:text-primary transition-colors">
                          {server.name}
                        </span>
                        <div className="flex items-center gap-1 text-secondary shrink-0">
                          <ThumbsUp className="w-3 h-3" />
                          <span className="text-xs font-bold">{server.vc}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-4">
                  <h3 className="font-display text-sm font-bold uppercase tracking-wider text-primary mb-3">Popular Tags</h3>
                  <div className="mb-3">
                    <p className="text-[10px] text-muted-foreground uppercase mb-1.5">Rate:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {popularRates.map(r => (
                        <button
                          key={r}
                          onClick={() => setSearchTerm(r)}
                          className="px-2 py-1 text-[10px] bg-muted/50 rounded border border-border/30 hover:border-primary/50 hover:text-primary transition-colors"
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase mb-1.5">Season:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {popularSeasons.map(s => (
                        <button
                          key={s}
                          onClick={() => setSearchTerm(s)}
                          className="px-2 py-1 text-[10px] bg-muted/50 rounded border border-border/30 hover:border-primary/50 hover:text-primary transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer Stats */}
        <div className="border-t border-border/30 mt-8">
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon="🎮" title="About" subtitle="MU Online Hub — Community Rankings & Listings" />
              <StatCard icon="🕐" title="Server Time" subtitle={now.toLocaleTimeString()} highlight />
              <StatsNumbers total={servers.length} upcoming={servers.filter(s => s.open_date && new Date(s.open_date) > now).length} />
              <VoteResetCountdown />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

const StatCard = ({ icon, title, subtitle, highlight }: { icon: string; title: string; subtitle: string; highlight?: boolean }) => (
  <div className="glass-card p-4">
    <span className="text-2xl">{icon}</span>
    <h4 className="font-display font-bold text-sm uppercase mt-2">{title}</h4>
    <p className={`text-xs mt-1 ${highlight ? 'font-mono text-lg text-secondary' : 'text-muted-foreground'}`}>{subtitle}</p>
  </div>
);

const StatsNumbers = ({ total, upcoming }: { total: number; upcoming: number }) => (
  <div className="glass-card p-4">
    <span className="text-2xl">📊</span>
    <h4 className="font-display font-bold text-sm uppercase mt-2">Statistics</h4>
    <div className="grid grid-cols-2 gap-2 mt-2">
      <div className="text-center p-1.5 bg-muted/30 rounded">
        <p className="font-display font-bold text-secondary">{total}</p>
        <p className="text-[9px] text-muted-foreground uppercase">Total</p>
      </div>
      <div className="text-center p-1.5 bg-muted/30 rounded">
        <p className="font-display font-bold text-secondary">{upcoming}</p>
        <p className="text-[9px] text-muted-foreground uppercase">Upcoming</p>
      </div>
    </div>
  </div>
);

const VoteResetCountdown = () => {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const diff = nextMonth.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="glass-card p-4">
      <span className="text-2xl">🔄</span>
      <h4 className="font-display font-bold text-sm uppercase mt-2">Votes Reset</h4>
      <p className="font-mono text-lg text-accent mt-1">{days}d. {String(hours).padStart(2, '0')}:{String(mins).padStart(2, '0')}</p>
      <p className="text-[9px] text-muted-foreground">Monthly reset on 1st day</p>
    </div>
  );
};

export default UpcomingServersPage;
