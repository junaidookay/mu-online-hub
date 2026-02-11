import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import { SEOHead } from '@/components/SEOHead';
import { Star, Crown, ExternalLink, Loader2, ChevronRight, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (user) fetchUserVotes();
  }, [user]);

  // Subscribe to realtime vote changes
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
    const { data: serverData } = await supabase
      .from('servers')
      .select('*')
      .eq('is_active', true);
    if (serverData) setServers(serverData);
    await fetchVoteCounts();
    setIsLoading(false);
  };

  const fetchVoteCounts = async () => {
    const { data } = await supabase
      .from('server_votes')
      .select('server_id')
      .eq('vote_month', currentMonth)
      .eq('vote_year', currentYear);

    if (data) {
      const counts: Record<string, number> = {};
      data.forEach(v => { counts[v.server_id] = (counts[v.server_id] || 0) + 1; });
      setVoteCounts(counts);
    }
  };

  const fetchUserVotes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('server_votes')
      .select('server_id')
      .eq('user_id', user.id)
      .eq('vote_month', currentMonth)
      .eq('vote_year', currentYear);
    if (data) {
      setUserVotes(new Set(data.map(v => v.server_id)));
    }
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
      user_id: user.id,
      server_id: serverId,
      vote_month: currentMonth,
      vote_year: currentYear,
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

  const rankedServers: RankedServer[] = useMemo(() => {
    return servers
      .map(s => ({ ...s, vote_count: voteCounts[s.id] || 0 }))
      .sort((a, b) => b.vote_count - a.vote_count)
      .slice(0, 50);
  }, [servers, voteCounts]);

  const monthName = now.toLocaleString('default', { month: 'long' });

  return (
    <>
      <SEOHead
        title={`Top 50 MU Online Servers - ${monthName} ${currentYear} | MU Online Hub`}
        description={`Vote for the best MU Online servers! Monthly rankings for ${monthName} ${currentYear}. Find and support your favorite servers.`}
      />
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold text-primary mb-2">Top 50 MU Online Servers</h1>
              <p className="text-muted-foreground">Monthly Rankings — {monthName} {currentYear}</p>
            </div>
            <div className="glass-card px-4 py-2 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-muted-foreground">Votes reset monthly</span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : rankedServers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No servers found. Be the first to add your server!</div>
          ) : (
            <div className="space-y-2">
              {rankedServers.map((server, index) => {
                const rank = index + 1;
                const voted = userVotes.has(server.id);
                const isTop3 = rank <= 3;

                return (
                  <div
                    key={server.id}
                    className={`glass-card overflow-hidden ${isTop3 ? 'glow-border-gold' : ''} ${server.is_premium ? 'border-yellow-500/30' : ''}`}
                  >
                    <div className="flex items-center gap-4 p-3">
                      {/* Rank */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-display font-bold text-lg ${
                        rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                        rank === 2 ? 'bg-gray-400/20 text-gray-300' :
                        rank === 3 ? 'bg-orange-500/20 text-orange-400' :
                        'bg-muted/30 text-muted-foreground'
                      }`}>
                        #{rank}
                      </div>

                      {/* Banner */}
                      <Link to={`/servers/${server.slug || server.id}`} className="flex-1 flex items-center gap-3 min-w-0 group">
                        {server.banner_url ? (
                          <img src={server.banner_url} alt="" className="w-20 h-12 object-cover rounded shrink-0" />
                        ) : (
                          <div className="w-20 h-12 bg-gradient-to-r from-primary/20 to-secondary/20 rounded shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-display font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                              {server.name}
                            </h3>
                            {server.is_premium && <Crown className="w-4 h-4 text-yellow-400 shrink-0" />}
                            {(server as any).is_featured && <Star className="w-4 h-4 text-secondary shrink-0 fill-secondary" />}
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {server.season} {server.part} - {server.exp_rate}
                          </p>
                        </div>
                        <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" />
                      </Link>

                      {/* Vote Count */}
                      <div className="text-center shrink-0 w-16">
                        <p className="font-display font-bold text-lg text-secondary">{server.vote_count}</p>
                        <p className="text-[10px] text-muted-foreground">votes</p>
                      </div>

                      {/* Vote Button */}
                      <Button
                        size="sm"
                        variant={voted ? 'outline' : 'default'}
                        className={`shrink-0 gap-1 ${voted ? '' : 'btn-fantasy-primary'}`}
                        onClick={() => handleVote(server.id, server.name)}
                        disabled={votingId === server.id || voted}
                      >
                        <Star className={`w-3 h-3 ${voted ? 'fill-current' : ''}`} />
                        {voted ? 'Voted' : 'Vote'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default Top50;
