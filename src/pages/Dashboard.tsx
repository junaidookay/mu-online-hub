import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trash2, 
  Loader2, 
  Server,
  Megaphone,
  ExternalLink,
  LayoutGrid
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { SEOHead } from '@/components/SEOHead';
import { MySlotListings } from '@/components/dashboard/MySlotListings';
import type { Tables } from '@/integrations/supabase/types';
import { normalizeExternalUrl } from '@/lib/utils';

type ServerType = Tables<'servers'>;
type AdvertisementType = Tables<'advertisements'>;

const Dashboard = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [servers, setServers] = useState<ServerType[]>([]);
  const [ads, setAds] = useState<AdvertisementType[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchParams, setSearchParams] = useSearchParams();
  const [isActivating, setIsActivating] = useState(false);

  // Handle payment success - activate draft directly (no webhook needed)
  useEffect(() => {
    const activateDraft = async () => {
      const paymentStatus = searchParams.get('payment');
      const draftId = searchParams.get('draftId');
      const draftType = searchParams.get('draftType');
      const slotId = searchParams.get('slot');
      const durationDays = searchParams.get('durationDays');

      // Clear params first to prevent re-running
      if (paymentStatus) {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('payment');
        newParams.delete('draftId');
        newParams.delete('draftType');
        newParams.delete('slot');
        newParams.delete('durationDays');
        setSearchParams(newParams, { replace: true });
      }

      if (paymentStatus === 'success' && draftId && draftType && slotId && durationDays) {
        setIsActivating(true);
        try {
          const response = await supabase.functions.invoke('activate-draft', {
            body: {
              draftId,
              draftType,
              slotId: parseInt(slotId),
              durationDays: parseInt(durationDays),
            },
          });

          if (response.error || response.data?.error) {
            console.error('Activation error:', response.error || response.data?.error);
            toast({
              title: 'Activation Issue',
              description: 'Payment received but listing activation may be delayed. Please refresh in a moment.',
              variant: 'destructive',
            });
          } else {
            toast({
              title: 'Listing Published!',
              description: 'Your listing is now live and visible on the homepage.',
            });
          }
        } catch (err) {
          console.error('Activation failed:', err);
          toast({
            title: 'Processing',
            description: 'Your payment was successful. Your listing will be activated shortly.',
          });
        } finally {
          setIsActivating(false);
        }
      } else if (paymentStatus === 'success') {
        // Generic success without draft info
        toast({
          title: 'Payment Successful!',
          description: 'Your premium feature has been activated.',
        });
      } else if (paymentStatus === 'cancelled') {
        toast({
          title: 'Payment Cancelled',
          description: 'Your payment was cancelled. No charges were made.',
          variant: 'destructive',
        });
      }
    };

    activateDraft();
  }, [searchParams, setSearchParams, toast]);

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
      <SEOHead 
        title="Dashboard - MU Online Hub"
        description="Manage your MU Online servers and advertisements from your personal dashboard."
      />
      <Header />
      <div className="container py-6">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-gradient-gold mb-2">My Dashboard</h1>
          <p className="text-muted-foreground">Manage your servers and advertisements</p>
        </div>

        <Tabs defaultValue="homepage" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="homepage" className="gap-2">
              <LayoutGrid size={16} />
              Homepage Listings
            </TabsTrigger>
            <TabsTrigger value="servers" className="gap-2">
              <Server size={16} />
              My Servers ({servers.length})
            </TabsTrigger>
            <TabsTrigger value="ads" className="gap-2">
              <Megaphone size={16} />
              My Ads ({ads.length})
            </TabsTrigger>
          </TabsList>

          {/* Homepage Listings Tab */}
          <TabsContent value="homepage" className="space-y-6">
            <MySlotListings />
          </TabsContent>

          {/* Servers Tab */}
          <TabsContent value="servers" className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="font-display text-lg font-semibold mb-4">Your Servers</h3>
              <div className="space-y-3">
                {servers.length === 0 ? (
                  <p className="text-muted-foreground">No servers yet.</p>
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
                          {(() => {
                            const href = normalizeExternalUrl(server.website);
                            if (!href) return null;
                            return (
                              <a 
                                href={href} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-secondary flex items-center gap-1 hover:underline"
                              >
                                {server.website} <ExternalLink size={10} />
                              </a>
                            );
                          })()}
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
              <h3 className="font-display text-lg font-semibold mb-4">Your Advertisements</h3>
              <div className="space-y-3">
                {ads.length === 0 ? (
                  <p className="text-muted-foreground">No advertisements yet.</p>
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
