import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import { SEOHead } from '@/components/SEOHead';
import { Star, Crown, Loader2, ChevronRight, ThumbsUp, Search, Globe, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  const now = new Date();
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
          {/* Search + Filter Bar */}
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
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

                return (
                  <div
                    key={server.id}
                    className={`glass-card overflow-hidden transition-all ${isTop3 ? 'glow-border-gold' : ''} ${server.is_premium ? 'border-yellow-500/20' : ''}`}
                  >
                    <div className="flex items-center gap-3 p-3">
                      {/* Rank */}
                      <span className={`font-display font-bold text-xl w-10 text-center shrink-0 ${
                        rank === 1 ? 'text-yellow-400' :
                        rank === 2 ? 'text-gray-300' :
                        rank === 3 ? 'text-orange-400' :
                        'text-muted-foreground'
                      }`}>
                        {String(rank).padStart(2, '0')}
                      </span>

                      {/* Server Info */}
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

                      {/* Action icons */}
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

                      {/* Vote Button + Count */}
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
