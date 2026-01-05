import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Trash2, 
  Loader2, 
  Server,
  Megaphone,
  Edit2,
  ExternalLink
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { Tables } from '@/integrations/supabase/types';

type ServerType = Tables<'servers'>;
type AdvertisementType = Tables<'advertisements'>;

const Dashboard = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [servers, setServers] = useState<ServerType[]>([]);
  const [ads, setAds] = useState<AdvertisementType[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newServer, setNewServer] = useState({
    name: '', season: '', part: '', exp_rate: '', website: '', banner_url: ''
  });
  const [newAd, setNewAd] = useState({
    ad_type: 'marketplace' as 'marketplace' | 'services',
    title: '', description: '', website: '', banner_url: ''
  });

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  const fetchUserData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [serversRes, adsRes] = await Promise.all([
        supabase.from('servers').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('advertisements').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);

      if (serversRes.data) setServers(serversRes.data);
      if (adsRes.data) setAds(adsRes.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load your data',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleAddServer = async () => {
    if (!user) return;
    if (!newServer.name || !newServer.season || !newServer.part || !newServer.exp_rate || !newServer.website) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('servers').insert([{
      user_id: user.id,
      name: newServer.name,
      season: newServer.season,
      part: newServer.part,
      exp_rate: newServer.exp_rate,
      website: newServer.website,
      banner_url: newServer.banner_url || null,
    }]);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Server added successfully' });
      setNewServer({ name: '', season: '', part: '', exp_rate: '', website: '', banner_url: '' });
      fetchUserData();
    }
  };

  const handleAddAd = async () => {
    if (!user) return;
    if (!newAd.title || !newAd.website) {
      toast({ title: 'Error', description: 'Please fill required fields', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('advertisements').insert([{
      user_id: user.id,
      ad_type: newAd.ad_type,
      title: newAd.title,
      description: newAd.description || null,
      website: newAd.website,
      banner_url: newAd.banner_url || null,
    }]);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Advertisement added successfully' });
      setNewAd({ ad_type: 'marketplace', title: '', description: '', website: '', banner_url: '' });
      fetchUserData();
    }
  };

  const handleToggleServer = async (id: string, currentValue: boolean | null) => {
    const { error } = await supabase
      .from('servers')
      .update({ is_active: !currentValue })
      .eq('id', id);
    if (!error) fetchUserData();
  };

  const handleToggleAd = async (id: string, currentValue: boolean | null) => {
    const { error } = await supabase
      .from('advertisements')
      .update({ is_active: !currentValue })
      .eq('id', id);
    if (!error) fetchUserData();
  };

  const handleDeleteServer = async (id: string) => {
    const { error } = await supabase.from('servers').delete().eq('id', id);
    if (!error) {
      toast({ title: 'Deleted', description: 'Server deleted successfully' });
      fetchUserData();
    }
  };

  const handleDeleteAd = async (id: string) => {
    const { error } = await supabase.from('advertisements').delete().eq('id', id);
    if (!error) {
      toast({ title: 'Deleted', description: 'Advertisement deleted successfully' });
      fetchUserData();
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-6">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-gradient-gold mb-2">My Dashboard</h1>
          <p className="text-muted-foreground">Manage your servers and advertisements</p>
        </div>

        <Tabs defaultValue="servers" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="servers" className="gap-2">
              <Server size={16} />
              My Servers ({servers.length})
            </TabsTrigger>
            <TabsTrigger value="ads" className="gap-2">
              <Megaphone size={16} />
              My Ads ({ads.length})
            </TabsTrigger>
          </TabsList>

          {/* Servers Tab */}
          <TabsContent value="servers" className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="font-display text-lg font-semibold mb-4">Add New Server</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label>Server Name *</Label>
                  <Input
                    placeholder="My Awesome MU"
                    value={newServer.name}
                    onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                    className="bg-muted/50"
                  />
                </div>
                <div>
                  <Label>Season *</Label>
                  <Input
                    placeholder="Season 20"
                    value={newServer.season}
                    onChange={(e) => setNewServer({ ...newServer, season: e.target.value })}
                    className="bg-muted/50"
                  />
                </div>
                <div>
                  <Label>Part *</Label>
                  <Input
                    placeholder="Part 2-3"
                    value={newServer.part}
                    onChange={(e) => setNewServer({ ...newServer, part: e.target.value })}
                    className="bg-muted/50"
                  />
                </div>
                <div>
                  <Label>Exp Rate *</Label>
                  <Input
                    placeholder="x9999"
                    value={newServer.exp_rate}
                    onChange={(e) => setNewServer({ ...newServer, exp_rate: e.target.value })}
                    className="bg-muted/50"
                  />
                </div>
                <div>
                  <Label>Website *</Label>
                  <Input
                    placeholder="www.myserver.com"
                    value={newServer.website}
                    onChange={(e) => setNewServer({ ...newServer, website: e.target.value })}
                    className="bg-muted/50"
                  />
                </div>
                <div>
                  <Label>Banner URL</Label>
                  <Input
                    placeholder="https://..."
                    value={newServer.banner_url}
                    onChange={(e) => setNewServer({ ...newServer, banner_url: e.target.value })}
                    className="bg-muted/50"
                  />
                </div>
              </div>
              <Button onClick={handleAddServer} className="btn-fantasy-primary gap-2">
                <Plus size={16} />
                Add Server
              </Button>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-display text-lg font-semibold mb-4">Your Servers</h3>
              <div className="space-y-3">
                {servers.length === 0 ? (
                  <p className="text-muted-foreground">No servers yet. Add your first server above!</p>
                ) : (
                  servers.map((server) => (
                    <div key={server.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-4 flex-1">
                        {server.banner_url && (
                          <img src={server.banner_url} alt={server.name} className="w-24 h-12 object-cover rounded" />
                        )}
                        <div>
                          <p className="font-semibold text-primary">{server.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {server.season} {server.part} - {server.exp_rate}
                          </p>
                          <a 
                            href={`https://${server.website}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-secondary flex items-center gap-1 hover:underline"
                          >
                            {server.website} <ExternalLink size={10} />
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-xs">
                          <p className={server.is_active ? 'text-green-400' : 'text-muted-foreground'}>
                            {server.is_active ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                        <Switch
                          checked={server.is_active ?? false}
                          onCheckedChange={() => handleToggleServer(server.id, server.is_active)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteServer(server.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* Ads Tab */}
          <TabsContent value="ads" className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="font-display text-lg font-semibold mb-4">Add New Advertisement</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label>Type *</Label>
                  <select
                    value={newAd.ad_type}
                    onChange={(e) => setNewAd({ ...newAd, ad_type: e.target.value as 'marketplace' | 'services' })}
                    className="w-full h-10 px-3 bg-muted/50 border border-border rounded-md"
                  >
                    <option value="marketplace">Marketplace (Files, Antihacks, etc.)</option>
                    <option value="services">Services (Videos, Configs, etc.)</option>
                  </select>
                </div>
                <div>
                  <Label>Title *</Label>
                  <Input
                    placeholder="My Product/Service"
                    value={newAd.title}
                    onChange={(e) => setNewAd({ ...newAd, title: e.target.value })}
                    className="bg-muted/50"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    placeholder="Brief description"
                    value={newAd.description}
                    onChange={(e) => setNewAd({ ...newAd, description: e.target.value })}
                    className="bg-muted/50"
                  />
                </div>
                <div>
                  <Label>Website *</Label>
                  <Input
                    placeholder="www.mysite.com"
                    value={newAd.website}
                    onChange={(e) => setNewAd({ ...newAd, website: e.target.value })}
                    className="bg-muted/50"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Banner URL (268x60 recommended)</Label>
                  <Input
                    placeholder="https://..."
                    value={newAd.banner_url}
                    onChange={(e) => setNewAd({ ...newAd, banner_url: e.target.value })}
                    className="bg-muted/50"
                  />
                </div>
              </div>
              <Button onClick={handleAddAd} className="btn-fantasy-primary gap-2">
                <Plus size={16} />
                Add Advertisement
              </Button>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-display text-lg font-semibold mb-4">Your Advertisements</h3>
              <div className="space-y-3">
                {ads.length === 0 ? (
                  <p className="text-muted-foreground">No advertisements yet. Create your first ad above!</p>
                ) : (
                  ads.map((ad) => (
                    <div key={ad.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-4 flex-1">
                        <span className={`text-xs px-2 py-1 rounded ${
                          ad.ad_type === 'marketplace' ? 'bg-primary/20 text-primary' : 'bg-secondary/20 text-secondary'
                        }`}>
                          {ad.ad_type}
                        </span>
                        {ad.banner_url && (
                          <img src={ad.banner_url} alt={ad.title} className="w-20 h-10 object-cover rounded" />
                        )}
                        <div>
                          <p className="font-semibold">{ad.title}</p>
                          <p className="text-xs text-muted-foreground">{ad.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-xs">
                          <p className={ad.is_active ? 'text-green-400' : 'text-muted-foreground'}>
                            {ad.is_active ? 'Active' : 'Inactive'}
                          </p>
                        </div>
                        <Switch
                          checked={ad.is_active ?? false}
                          onCheckedChange={() => handleToggleAd(ad.id, ad.is_active)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAd(ad.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
