import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import { SEOHead } from '@/components/SEOHead';
import { ExternalLink, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useClickTracking } from '@/hooks/useClickTracking';
import type { Tables } from '@/integrations/supabase/types';

type ServerType = Tables<'servers'>;

const fallbackServers = [
  { id: '1', name: 'Asteria MU', season: 'SEASON 20', part: 'PART 2-3', exp_rate: '99999x', features: ['LONG-TERM SERVER', 'NEW 5TH QUEST/CLASSES'], banner_url: 'https://images.unsplash.com/photo-1614854262318-831574f15f1f?w=468&h=60&fit=crop', website: 'asteriamu.com' },
  { id: '2', name: 'Phoenix MU', season: 'SEASON 19', part: 'PART 2', exp_rate: '5000x', features: ['PVP FOCUSED', 'CUSTOM WINGS'], banner_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=468&h=60&fit=crop', website: 'phoenixmu.net' },
  { id: '3', name: 'Legend MU', season: 'SEASON 17', part: 'PART 1-2', exp_rate: '1000x', features: ['CLASSIC GAMEPLAY', 'BALANCED PVP'], banner_url: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=468&h=60&fit=crop', website: 'legendmu.com' },
];

const Servers = () => {
  const [servers, setServers] = useState<ServerType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { trackServerClick } = useClickTracking();

  useEffect(() => {
    const fetchServers = async () => {
      const { data } = await supabase
        .from('servers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (data && data.length > 0) {
        setServers(data);
      }
    };
    fetchServers();
  }, []);

  const displayServers = servers.length > 0 ? servers : fallbackServers;
  const filteredServers = displayServers.filter(server =>
    server.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    server.season.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <SEOHead 
        title="Top 50 MU Online Servers | Arcana"
        description="Browse the best MU Online private servers. Find your perfect server with our comprehensive listings."
      />
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-primary mb-2">Top 50 MU Online Servers</h1>
            <p className="text-muted-foreground">Browse all active MU Online servers</p>
          </div>

          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Search servers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="secondary">
              <Plus size={18} className="mr-2" />
              Add Your Server
            </Button>
          </div>

          <div className="space-y-3">
            {filteredServers.map((server) => (
              <a
                key={server.id}
                href={`https://${server.website}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => 'id' in server && trackServerClick(server.id, server.website)}
                className="server-item block rounded-lg overflow-hidden border border-border/30 bg-muted/20 group"
              >
                <div className="relative">
                  {server.banner_url ? (
                    <img 
                      src={server.banner_url} 
                      alt={server.name}
                      className="w-full h-20 object-cover"
                    />
                  ) : (
                    <div className="w-full h-20 bg-gradient-to-r from-primary/20 to-secondary/20" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/50 to-transparent" />
                  <div className="absolute inset-0 p-3 flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-display text-lg font-bold text-primary">
                          {server.name} {server.season} {server.part} - {server.exp_rate}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          FULL {server.season} {server.part} - EXP {server.exp_rate}
                        </p>
                      </div>
                      <ExternalLink size={18} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs text-muted-foreground/70">
                      {server.features?.join(' - ') || 'MU Online Server'}
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {filteredServers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No servers found matching your search.
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default Servers;