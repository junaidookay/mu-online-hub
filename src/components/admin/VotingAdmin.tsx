import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Star, ThumbsUp, Minus, Plus, Search } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type ServerType = Tables<'servers'>;

export const VotingAdmin = () => {
  const { toast } = useToast();
  const [servers, setServers] = useState<ServerType[]>([]);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [serversRes, votesRes] = await Promise.all([
      supabase.from('servers').select('*').order('name'),
      supabase.from('server_votes').select('server_id')
        .eq('vote_month', currentMonth).eq('vote_year', currentYear),
    ]);

    if (serversRes.data) setServers(serversRes.data);
    if (votesRes.data) {
      const counts: Record<string, number> = {};
      votesRes.data.forEach(v => { counts[v.server_id] = (counts[v.server_id] || 0) + 1; });
      setVoteCounts(counts);
    }
    setLoading(false);
  };

  const toggleVoting = async (server: ServerType) => {
    const { error } = await supabase
      .from('servers')
      .update({ voting_enabled: !server.voting_enabled })
      .eq('id', server.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Updated', description: `Voting ${server.voting_enabled ? 'disabled' : 'enabled'} for ${server.name}` });
      fetchData();
    }
  };

  const toggleFeatured = async (server: ServerType) => {
    const { error } = await supabase
      .from('servers')
      .update({ is_featured: !server.is_featured })
      .eq('id', server.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Updated', description: `${server.name} ${server.is_featured ? 'unfeatured' : 'featured'}` });
      fetchData();
    }
  };

  const adjustVotes = async (serverId: string, delta: number) => {
    setAdjustingId(serverId);
    if (delta > 0) {
      // Add a vote from a system user
      const { error } = await supabase.from('server_votes').insert({
        user_id: '00000000-0000-0000-0000-000000000000',
        server_id: serverId,
        vote_month: currentMonth,
        vote_year: currentYear,
      });
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        setVoteCounts(prev => ({ ...prev, [serverId]: (prev[serverId] || 0) + 1 }));
      }
    } else {
      // Remove the latest vote for this server this month
      const { data } = await supabase
        .from('server_votes')
        .select('id')
        .eq('server_id', serverId)
        .eq('vote_month', currentMonth)
        .eq('vote_year', currentYear)
        .limit(1);
      if (data && data.length > 0) {
        await supabase.from('server_votes').delete().eq('id', data[0].id);
        setVoteCounts(prev => ({ ...prev, [serverId]: Math.max(0, (prev[serverId] || 0) - 1) }));
      }
    }
    setAdjustingId(null);
  };

  const filtered = servers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Top 50 Voting Management</h3>
        <p className="text-sm text-muted-foreground">
          {now.toLocaleString('default', { month: 'long' })} {currentYear}
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input
          placeholder="Search servers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 bg-muted/50"
        />
      </div>

      <div className="glass-card overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_100px_120px] gap-2 p-3 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase">
          <span>Server</span>
          <span className="text-center">Votes</span>
          <span className="text-center">Voting</span>
          <span className="text-center">Featured</span>
        </div>
        <div className="divide-y divide-border/30">
          {filtered.map((server) => (
            <div key={server.id} className="grid grid-cols-[1fr_100px_100px_120px] gap-2 p-3 items-center">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{server.name}</p>
                <p className="text-[10px] text-muted-foreground">{server.season} {server.part}</p>
              </div>

              <div className="flex items-center justify-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={adjustingId === server.id || (voteCounts[server.id] || 0) === 0}
                  onClick={() => adjustVotes(server.id, -1)}
                >
                  <Minus size={12} />
                </Button>
                <span className="font-display font-bold text-sm w-8 text-center text-secondary">
                  {voteCounts[server.id] || 0}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={adjustingId === server.id}
                  onClick={() => adjustVotes(server.id, 1)}
                >
                  <Plus size={12} />
                </Button>
              </div>

              <div className="flex justify-center">
                <Switch
                  checked={server.voting_enabled ?? true}
                  onCheckedChange={() => toggleVoting(server)}
                />
              </div>

              <div className="flex justify-center">
                <Button
                  variant={server.is_featured ? 'default' : 'outline'}
                  size="sm"
                  className={`gap-1 text-xs ${server.is_featured ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : ''}`}
                  onClick={() => toggleFeatured(server)}
                >
                  <Star className={`w-3 h-3 ${server.is_featured ? 'fill-current' : ''}`} />
                  {server.is_featured ? 'Featured' : 'Feature'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-4">No servers found</p>
      )}
    </div>
  );
};
