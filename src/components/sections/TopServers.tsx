import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import SectionHeader from './SectionHeader';
import { ChevronRight, Plus, Crown, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Tables } from '@/integrations/supabase/types';

type ServerType = Tables<'servers'>;
type RankedServer = {
  id: string;
  name: string;
  season: string;
  part: string;
  exp_rate: string;
  banner_url?: string | null;
  slug?: string | null;
  is_premium?: boolean | null;
  vote_count: number;
};

const TopServers = () => {
  const [servers, setServers] = useState<ServerType[]>([]);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  useEffect(() => {
    const fetchServers = async () => {
      const { data } = await supabase
        .from('servers')
        .select('*')
        .eq('is_active', true)
        .eq('slot_id', 3)
        .order('rotation_order', { ascending: true })
        .limit(50);
      
      if (data && data.length > 0) {
        setServers(data);
      }
    };
    const fetchVotes = async () => {
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
    fetchServers();
    fetchVotes();
  }, []);

  const rankedServers = useMemo<RankedServer[]>(() => {
    return servers
      .map((s) => ({ ...(s as unknown as Omit<RankedServer, 'vote_count'>), vote_count: voteCounts[s.id] || 0 }))
      .sort((a, b) => b.vote_count - a.vote_count)
      .slice(0, 5);
  }, [servers, voteCounts]);

  return (
    <div className="glass-card overflow-hidden flex flex-col">
      <SectionHeader 
        title="Top 50 MU Online Servers" 
        badge={<span className="text-xs text-secondary">{servers.length || 0} active</span>}
      />
      <div className="flex-1 p-2 space-y-2 overflow-y-auto scrollbar-thin">
        {rankedServers.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No paid Top 50 listings yet.
          </div>
        ) : (
          rankedServers.map((server, index) => (
            <div key={server.id}>
              <Link
                to={`/servers/${server.slug || server.id}`}
                className="server-item block rounded-lg overflow-hidden border border-border/30 bg-muted/20 group"
              >
                <div className="relative">
                  {server.banner_url ? (
                    <img
                      src={server.banner_url}
                      alt={server.name}
                      className="w-full h-16 object-cover"
                    />
                  ) : (
                    <div className="w-full h-16 bg-gradient-to-r from-primary/20 to-secondary/20" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent" />
                  <div className="absolute inset-0 p-2 flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-secondary">#{index + 1}</span>
                        <h4 className="font-display text-sm font-bold text-primary">
                          {server.name}
                        </h4>
                        {server.is_premium && <Crown className="w-3 h-3 text-yellow-400" />}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-secondary font-bold">{server.vote_count || 0}</span>
                        <Star className="w-3 h-3 text-secondary" />
                        <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {server.season} {server.part} - {server.exp_rate}
                    </p>
                  </div>
                </div>
              </Link>
              {index < rankedServers.length - 1 && (
                <button className="w-full py-1 mt-1 flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
                  <Plus size={10} />
                  <span>Upgrade to Premium</span>
                </button>
              )}
            </div>
          ))
        )}
      </div>
      <div className="p-2 border-t border-border/30">
        <Button variant="outline" size="sm" className="w-full text-xs" asChild>
          <Link to="/servers">Browse All Servers</Link>
        </Button>
      </div>
    </div>
  );
};

export default TopServers;
