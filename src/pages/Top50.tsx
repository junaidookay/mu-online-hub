import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import { SEOHead } from '@/components/SEOHead';
import { Star, Crown, Loader2, ChevronRight, ThumbsUp, Search, Globe, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type ServerType = Tables<'servers'>;

interface RankedServer extends ServerType {
  vote_count: number;
}

const Top50 = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [servers, setServers] = useState<ServerType[]>([]);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [userVotes, setUserVotes] = useState<Set<string>>(new Set());
  const [votingId, setVotingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('all');

  const now = useMemo(() => new Date(), []);
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (user) fetchUserVotes(); }, [user]);

  useEffect(() => {
    const channel = supabase
      .channel('server-votes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'server_votes' }, () => {
        fetchVoteCounts();
        if (user) fetchUserVotes();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchData = async () => {
    const { data: serverData } = await supabase.from('servers').select('*').eq('is_active', true);
    if (serverData) setServers(serverData);
    await fetchVoteCounts();
    setIsLoading(false);
  };

  const fetchVoteCounts = async () => {
    const { data } = await supabase.from('server_votes').select('server_id')
      .eq('vote_month', currentMonth).eq('vote_year', currentYear);
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach(v => { counts[v.server_id] = (counts[v.server_id] || 0) + 1; });
      setVoteCounts(counts);
    }
  };

  const fetchUserVotes = async () => {
    if (!user) return;
    const { data } = await supabase.from('server_votes').select('server_id')
      .eq('user_id', user.id).eq('vote_month', currentMonth).eq('vote_year', currentYear);
    if (data) setUserVotes(new Set(data.map(v => v.server_id)));
  };

  const handleVote = async (serverId: string, serverName: string) => {
    if (!user) {
      toast({ title: 'Login Required', description: 'Please login to vote.', variant: 'destructive' });
      return;
    }
    if (userVotes.has(serverId)) {
      toast({ title: 'Already Voted', description: 'You can only vote once per server per month.' });
      return;
    }
    setVotingId(serverId);
    const { error } = await supabase.from('server_votes').insert({
      user_id: user.id, server_id: serverId, vote_month: currentMonth, vote_year: currentYear,
    });
    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Already Voted', description: 'You already voted for this server this month.' });
        setUserVotes(prev => new Set(prev).add(serverId));
      } else {
        toast({ title: 'Error', description: 'Failed to vote.', variant: 'destructive' });
      }
    } else {
      setUserVotes(prev => new Set(prev).add(serverId));
      setVoteCounts(prev => ({ ...prev, [serverId]: (prev[serverId] || 0) + 1 }));
      toast({ title: 'Vote Recorded!', description: `You voted for ${serverName}` });
    }
    setVotingId(null);
  };

  const seasons = useMemo(() => {
    const s = new Set(servers.map(s => s.season));
    return Array.from(s).sort();
  }, [servers]);

  const upcomingCategories = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const next7 = new Date(today);
    next7.setDate(next7.getDate() + 7);
    const prev7 = new Date(today);
    prev7.setDate(prev7.getDate() - 7);

    const filtered = servers.filter((s) => {
      if (seasonFilter !== 'all' && s.season !== seasonFilter) return false;
      if (!term) return true;
      return s.name.toLowerCase().includes(term) || s.season.toLowerCase().includes(term);
    });

    const todayServers: ServerType[] = [];
    const tomorrowServers: ServerType[] = [];
    const next7Servers: ServerType[] = [];
    const prev7Servers: ServerType[] = [];
    const olderOpened: ServerType[] = [];
    const farFuture: ServerType[] = [];

    filtered.forEach((s) => {
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

    const byOpenDateAsc = (a: ServerType, b: ServerType) => {
      const ta = a.open_date ? new Date(a.open_date).getTime() : 0;
      const tb = b.open_date ? new Date(b.open_date).getTime() : 0;
      return ta - tb;
    };

    todayServers.sort(byOpenDateAsc);
    tomorrowServers.sort(byOpenDateAsc);
    next7Servers.sort(byOpenDateAsc);
    farFuture.sort(byOpenDateAsc);

    const byOpenDateDesc = (a: ServerType, b: ServerType) => {
      const ta = a.open_date ? new Date(a.open_date).getTime() : 0;
      const tb = b.open_date ? new Date(b.open_date).getTime() : 0;
      return tb - ta;
    };

    prev7Servers.sort(byOpenDateDesc);
    olderOpened.sort(byOpenDateDesc);

    return { todayServers, tomorrowServers, next7Servers, prev7Servers, olderOpened, farFuture };
  }, [now, servers, searchTerm, seasonFilter]);

  const rankedServers: RankedServer[] = useMemo(() => {
    let filtered = servers
      .filter(s => s.voting_enabled !== false)
      .map(s => ({ ...s, vote_count: voteCounts[s.id] || 0 }));

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s => s.name.toLowerCase().includes(term));
    }
    if (seasonFilter !== 'all') {
      filtered = filtered.filter(s => s.season === seasonFilter);
    }

    return filtered.sort((a, b) => b.vote_count - a.vote_count).slice(0, 50);
  }, [servers, voteCounts, searchTerm, seasonFilter]);

  const monthName = now.toLocaleString('default', { month: 'long' });

  // Stats
  const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);
  const upcomingCount = servers.filter(s => s.open_date && new Date(s.open_date) > now).length;

  // Vote reset countdown
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const resetDiff = nextMonth.getTime() - now.getTime();
  const resetDays = Math.floor(resetDiff / (1000 * 60 * 60 * 24));
  const resetHours = Math.floor((resetDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const resetMins = Math.floor((resetDiff % (1000 * 60 * 60)) / (1000 * 60));

  const ServerRow = ({ server }: { server: ServerType }) => {
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
        {server.open_date && (
          <Badge variant={new Date(server.open_date) > now ? 'default' : 'secondary'} className="text-[10px] shrink-0">
            {new Date(server.open_date) > now ? 'Open' : 'Opened'} {new Date(server.open_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })}
          </Badge>
        )}
        <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </Link>
    );
  };

  const UpcomingSection = ({ title, servers: srvs }: { title: string; servers: ServerType[] }) => {
    const [showAll, setShowAll] = useState(false);
    const display = showAll ? srvs : srvs.slice(0, 10);
    if (srvs.length === 0) {
      return (
        <div className="mb-6">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-primary mb-3">{title}</h2>
          <div className="glass-card p-4 text-center text-sm text-muted-foreground">No servers in this category</div>
        </div>
      );
    }

    return (
      <div className="mb-6">
        <h2 className="font-display text-sm font-bold uppercase tracking-wider text-primary mb-3">{title}</h2>
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
        title={`Top 50 MU Online Servers - ${monthName} ${currentYear} | MU Online Hub`}
        description={`Vote for the best MU Online servers! Monthly rankings for ${monthName} ${currentYear}.`}
      />
      <div className="min-h-screen bg-background">
        <Header />

        {/* Premium banners */}
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
          <div className="flex items-center gap-3 mb-8 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={16} />
              <Input
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-muted/30"
              />
            </div>
            <Select value={seasonFilter} onValueChange={setSeasonFilter}>
              <SelectTrigger className="w-[160px] bg-muted/30">
                <SelectValue placeholder="All seasons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All seasons</SelectItem>
                {seasons.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-10">
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-primary mb-4">
              Top 50 MU Online Servers
            </h2>

            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : rankedServers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No servers found.</div>
            ) : (
              <div className="space-y-1.5">
                {rankedServers.map((server, index) => {
                  const rank = index + 1;
                  const voted = userVotes.has(server.id);
                  const isTop3 = rank <= 3;
                  const showBanner = !!(server.is_premium && server.banner_url);

                  return (
                    <div
                      key={server.id}
                      className={`glass-card overflow-hidden transition-all ${isTop3 ? 'glow-border-gold' : ''} ${server.is_premium ? 'border-yellow-500/20' : ''}`}
                    >
                      <div className="flex items-center gap-3 p-3">
                        <span className={`font-display font-bold text-xl w-10 text-center shrink-0 ${
                          rank === 1 ? 'text-yellow-400' :
                          rank === 2 ? 'text-gray-300' :
                          rank === 3 ? 'text-orange-400' :
                          'text-muted-foreground'
                        }`}>
                          {String(rank).padStart(2, '0')}
                        </span>

                        {showBanner && (
                          <img
                            src={server.banner_url!}
                            alt={server.name}
                            className="w-24 h-12 object-cover rounded border border-border/30 shrink-0"
                          />
                        )}

                        <Link to={`/servers/${server.slug || server.id}`} className="flex-1 min-w-0 group">
                          <div className="flex items-center gap-2">
                            <h3 className="font-display font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                              {server.name}
                            </h3>
                            {server.is_premium && <Crown className="w-3.5 h-3.5 text-yellow-400 shrink-0" />}
                            {server.is_featured && <Star className="w-3.5 h-3.5 text-secondary shrink-0 fill-secondary" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {server.exp_rate} - {server.season}
                          </p>
                        </Link>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {server.website && (
                            <a href={`https://${server.website}`} target="_blank" rel="noopener noreferrer"
                              className="p-1.5 rounded bg-muted/30 hover:bg-muted/50 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                            </a>
                          )}
                          {server.discord_link && (
                            <a href={server.discord_link} target="_blank" rel="noopener noreferrer"
                              className="p-1.5 rounded bg-muted/30 hover:bg-muted/50 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-muted-foreground" />
                            </a>
                          )}
                        </div>

                        <button
                          onClick={() => handleVote(server.id, server.name)}
                          disabled={votingId === server.id || voted}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all shrink-0 ${
                            voted
                              ? 'bg-secondary/20 text-secondary cursor-default'
                              : 'bg-muted/30 hover:bg-primary/20 hover:text-primary cursor-pointer'
                          }`}
                        >
                          <ThumbsUp className={`w-3.5 h-3.5 ${voted ? 'fill-current' : ''}`} />
                          <span className="font-display">{server.vote_count}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h2 className="font-display text-sm font-bold uppercase tracking-wider text-primary mb-4">
              Upcoming & Recently Opened Servers
            </h2>

            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <UpcomingSection title="Top Servers Coming Soon" servers={upcomingCategories.farFuture} />
                  <UpcomingSection title="Today" servers={upcomingCategories.todayServers} />
                  <UpcomingSection title="Tomorrow" servers={upcomingCategories.tomorrowServers} />
                  <UpcomingSection title="Next 7 Days" servers={upcomingCategories.next7Servers} />
                </div>
                <div>
                  <UpcomingSection title="Previous 7 Days" servers={upcomingCategories.prev7Servers} />
                  <UpcomingSection title="Week Ago and More" servers={upcomingCategories.olderOpened} />
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Footer Stats */}
        <div className="border-t border-border/30 mt-8">
          <div className="container mx-auto px-4 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-card p-4">
                <span className="text-2xl">🎮</span>
                <h4 className="font-display font-bold text-sm uppercase mt-2">About</h4>
                <p className="text-xs text-muted-foreground mt-1">MU Online Hub — Community Rankings</p>
              </div>
              <div className="glass-card p-4">
                <span className="text-2xl">🕐</span>
                <h4 className="font-display font-bold text-sm uppercase mt-2">Server Time</h4>
                <p className="font-mono text-lg text-secondary mt-1">{now.toLocaleTimeString()}</p>
              </div>
              <div className="glass-card p-4">
                <span className="text-2xl">📊</span>
                <h4 className="font-display font-bold text-sm uppercase mt-2">Statistics</h4>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="text-center p-1.5 bg-muted/30 rounded">
                    <p className="font-display font-bold text-secondary">{servers.length}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">Total Servers</p>
                  </div>
                  <div className="text-center p-1.5 bg-muted/30 rounded">
                    <p className="font-display font-bold text-secondary">{totalVotes}</p>
                    <p className="text-[9px] text-muted-foreground uppercase">Total Votes</p>
                  </div>
                </div>
              </div>
              <div className="glass-card p-4">
                <span className="text-2xl">🔄</span>
                <h4 className="font-display font-bold text-sm uppercase mt-2">Votes Reset</h4>
                <p className="font-mono text-lg text-accent mt-1">{resetDays}d. {String(resetHours).padStart(2, '0')}:{String(resetMins).padStart(2, '0')}</p>
                <p className="text-[9px] text-muted-foreground">Monthly reset on 1st day</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Top50;
