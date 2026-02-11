import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Calendar, User, Globe, Loader2, Crown, Star, MessageCircle, Zap, Clock } from 'lucide-react';
import Header from '@/components/layout/Header';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type ServerType = Tables<'servers'>;

interface OwnerProfile {
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

const ServerDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [server, setServer] = useState<ServerType | null>(null);
  const [owner, setOwner] = useState<OwnerProfile | null>(null);
  const [voteCount, setVoteCount] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  useEffect(() => {
    if (slug) fetchServer();
  }, [slug]);

  useEffect(() => {
    if (server) {
      fetchVotes();
      if (user) checkUserVote();
    }
  }, [server, user]);

  const fetchServer = async () => {
    setIsLoading(true);
    let { data } = await supabase.from('servers').select('*').eq('slug', slug!).maybeSingle();
    if (!data) {
      const { data: byId } = await supabase.from('servers').select('*').eq('id', slug!).maybeSingle();
      data = byId;
    }
    if (data) {
      setServer(data);
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, created_at')
        .eq('user_id', data.user_id)
        .maybeSingle();
      setOwner(profile);
    } else {
      setNotFound(true);
    }
    setIsLoading(false);
  };

  const fetchVotes = async () => {
    if (!server) return;
    const { count } = await supabase
      .from('server_votes')
      .select('*', { count: 'exact', head: true })
      .eq('server_id', server.id)
      .eq('vote_month', currentMonth)
      .eq('vote_year', currentYear);
    setVoteCount(count || 0);
  };

  const checkUserVote = async () => {
    if (!server || !user) return;
    const { data } = await supabase
      .from('server_votes')
      .select('id')
      .eq('server_id', server.id)
      .eq('user_id', user.id)
      .eq('vote_month', currentMonth)
      .eq('vote_year', currentYear)
      .maybeSingle();
    setHasVoted(!!data);
  };

  const handleVote = async () => {
    if (!user) {
      toast({ title: 'Login Required', description: 'Please login to vote.', variant: 'destructive' });
      return;
    }
    if (hasVoted) {
      toast({ title: 'Already Voted', description: 'You can only vote once per server per month.' });
      return;
    }
    if (!server) return;
    
    setIsVoting(true);
    const { error } = await supabase.from('server_votes').insert({
      user_id: user.id,
      server_id: server.id,
      vote_month: currentMonth,
      vote_year: currentYear,
    });

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Already Voted', description: 'You already voted for this server this month.' });
      } else {
        toast({ title: 'Error', description: 'Failed to vote. Please try again.', variant: 'destructive' });
      }
    } else {
      setHasVoted(true);
      setVoteCount(prev => prev + 1);
      toast({ title: 'Vote Recorded!', description: `You voted for ${server.name}` });
    }
    setIsVoting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (notFound || !server) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead title="Server Not Found" />
        <Header />
        <div className="container py-12 text-center">
          <h1 className="text-2xl font-display font-bold text-foreground mb-4">Server Not Found</h1>
          <p className="text-muted-foreground mb-6">This server may have been removed.</p>
          <Button asChild><Link to="/servers">Back to Servers</Link></Button>
        </div>
      </div>
    );
  }

  if (!server.is_active) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead title="Server Inactive" />
        <Header />
        <div className="container py-12 text-center">
          <h1 className="text-2xl font-display font-bold text-foreground mb-4">Server Inactive</h1>
          <p className="text-muted-foreground mb-6">This server listing is currently inactive.</p>
          <Button asChild><Link to="/servers">Back to Servers</Link></Button>
        </div>
      </div>
    );
  }

  const isUpcoming = server.open_date && new Date(server.open_date) > now;
  const serverStatus = server.is_premium ? 'Premium' : isUpcoming ? 'Upcoming' : 'Live';

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${server.name} - ${server.season} ${server.part} | MU Online Server`}
        description={`${server.name} MU Online Server - ${server.season} ${server.part}, EXP Rate: ${server.exp_rate}. ${(server as any).long_description || server.features?.join(', ') || ''}`}
      />
      <Header />

      <main className="container py-8">
        <Button variant="ghost" asChild className="mb-6 gap-2">
          <Link to="/servers"><ArrowLeft size={18} /> Back to Servers</Link>
        </Button>

        {/* Banner */}
        <div className={`glass-card overflow-hidden mb-6 ${server.is_premium ? 'glow-border-gold' : ''}`}>
          {server.banner_url ? (
            <div className="relative">
              <img src={server.banner_url} alt={server.name} className="w-full h-48 md:h-64 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div className="flex items-center gap-3">
                  {(server as any).logo_url && (
                    <img src={(server as any).logo_url} alt="" className="w-16 h-16 rounded-lg border-2 border-border object-cover" />
                  )}
                  <div>
                    <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{server.name}</h1>
                    <p className="text-muted-foreground">{server.season} {server.part} - {server.exp_rate}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge className={server.is_premium ? 'bg-yellow-500/20 text-yellow-400' : isUpcoming ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}>
                    {server.is_premium && <Crown className="w-3 h-3 mr-1" />}
                    {serverStatus}
                  </Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 bg-gradient-to-r from-primary/10 to-secondary/10">
              <div className="flex items-center gap-3">
                {(server as any).logo_url && (
                  <img src={(server as any).logo_url} alt="" className="w-16 h-16 rounded-lg border-2 border-border object-cover" />
                )}
                <div>
                  <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{server.name}</h1>
                  <p className="text-muted-foreground">{server.season} {server.part} - {server.exp_rate}</p>
                </div>
                <Badge className="ml-auto" variant="outline">{serverStatus}</Badge>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Server Info Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="glass-card p-4 text-center">
                <p className="text-xs text-muted-foreground">Season</p>
                <p className="font-display font-bold text-primary">{server.season}</p>
              </div>
              <div className="glass-card p-4 text-center">
                <p className="text-xs text-muted-foreground">Part</p>
                <p className="font-display font-bold text-primary">{server.part}</p>
              </div>
              <div className="glass-card p-4 text-center">
                <p className="text-xs text-muted-foreground">EXP Rate</p>
                <p className="font-display font-bold text-primary">{server.exp_rate}</p>
              </div>
              <div className="glass-card p-4 text-center">
                <p className="text-xs text-muted-foreground">Votes</p>
                <p className="font-display font-bold text-secondary">{voteCount}</p>
              </div>
            </div>

            {/* Description */}
            <div className="glass-card p-6">
              <h2 className="font-display text-lg font-bold mb-4">About This Server</h2>
              {(server as any).long_description ? (
                <p className="text-muted-foreground whitespace-pre-wrap">{(server as any).long_description}</p>
              ) : server.features && server.features.length > 0 ? (
                <div className="space-y-2">
                  {server.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-muted-foreground">
                      <Zap className="w-4 h-4 text-primary shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No additional details provided.</p>
              )}
            </div>

            {/* Features */}
            {server.features && server.features.length > 0 && (server as any).long_description && (
              <div className="glass-card p-6">
                <h2 className="font-display text-lg font-bold mb-4">Features</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {server.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-muted-foreground">
                      <Zap className="w-4 h-4 text-primary shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Vote & Visit */}
            <div className={`glass-card p-6 ${server.is_premium ? 'glow-border-gold' : ''}`}>
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground">Monthly Votes</p>
                <p className="font-display text-4xl font-bold text-secondary">{voteCount}</p>
              </div>
              <div className="space-y-3">
                {(server as any).voting_enabled !== false && (
                  <Button
                    className={`w-full gap-2 ${hasVoted ? 'btn-fantasy-outline' : 'btn-fantasy-primary'}`}
                    onClick={handleVote}
                    disabled={isVoting || hasVoted}
                  >
                    <Star className="w-4 h-4" />
                    {hasVoted ? 'Already Voted This Month' : isVoting ? 'Voting...' : 'Vote for This Server'}
                  </Button>
                )}
                <Button className="w-full btn-fantasy-outline gap-2" asChild>
                  <a href={`https://${server.website}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                    Visit Website
                  </a>
                </Button>
                {(server as any).discord_link && (
                  <Button variant="outline" className="w-full gap-2" asChild>
                    <a href={(server as any).discord_link} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="w-4 h-4" />
                      Join Discord
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Server Owner */}
            <div className="glass-card p-6">
              <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                <User className="w-4 h-4" />
                Server Owner
              </h3>
              <div className="flex items-center gap-3">
                {owner?.avatar_url ? (
                  <img src={owner.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{owner?.display_name || 'Anonymous'}</p>
                  {owner?.created_at && (
                    <p className="text-xs text-muted-foreground">Joined {new Date(owner.created_at).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Open Date */}
            {server.open_date && (
              <div className="glass-card p-4 border-l-4 border-green-500/50">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <strong className="text-green-400">Open Date:</strong>{' '}
                  {new Date(server.open_date).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Dates */}
            <div className="glass-card p-4">
              <div className="space-y-2 text-xs text-muted-foreground">
                <p className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Listed {new Date(server.created_at).toLocaleDateString()}
                </p>
                <p className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Updated {new Date(server.updated_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ServerDetail;
