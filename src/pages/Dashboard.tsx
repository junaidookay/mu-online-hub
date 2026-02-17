import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/upload/ImageUpload';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trash2, 
  Loader2, 
  Server,
  Megaphone,
  ExternalLink,
  LayoutGrid,
  Plus
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { SEOHead } from '@/components/SEOHead';
import { MySlotListings } from '@/components/dashboard/MySlotListings';
import { marketplaceCategories, serviceCategories } from '@/lib/categories';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { normalizeExternalUrl } from '@/lib/utils';

const RichTextEditor = lazy(() => import('@/components/editor/RichTextEditor'));

type ServerType = Tables<'servers'>;
type AdvertisementType = Tables<'advertisements'>;
type ServerInsert = TablesInsert<'servers'>;
type AdvertisementInsert = TablesInsert<'advertisements'>;

const Dashboard = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [servers, setServers] = useState<ServerType[]>([]);
  const [ads, setAds] = useState<AdvertisementType[]>([]);
  const [loading, setLoading] = useState(true);
  const [homepageListingsRefreshToken, setHomepageListingsRefreshToken] = useState(0);

  const [newServer, setNewServer] = useState({
    name: '', season: '', part: '', exp_rate: '', website: '', banner_url: ''
  });
  const [newAd, setNewAd] = useState({
    ad_type: 'marketplace' as 'marketplace' | 'services',
    title: '', description: '', website: '', banner_url: '',
    short_description: '', full_description: '', video_url: '',
    delivery_time: '', price_range: '', location: '',
    experience_level: '', tags: '' as string, discord_link: '',
    supported_seasons: '', category: '' as string,
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const [isActivating, setIsActivating] = useState(false);

  // Handle payment success - activate draft directly (no webhook needed)
  useEffect(() => {
    const refreshTimeouts: number[] = [];

    const triggerHomepageListingsRefresh = () => {
      setHomepageListingsRefreshToken((t) => t + 1);
      refreshTimeouts.push(
        window.setTimeout(() => setHomepageListingsRefreshToken((t) => t + 1), 1500),
        window.setTimeout(() => setHomepageListingsRefreshToken((t) => t + 1), 4000)
      );
    };

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
          triggerHomepageListingsRefresh();
        }
      } else if (paymentStatus === 'success') {
        // Generic success without draft info
        toast({
          title: 'Payment Successful!',
          description: 'Your premium feature has been activated.',
        });
        if (draftId) triggerHomepageListingsRefresh();
      } else if (paymentStatus === 'cancelled') {
        toast({
          title: 'Payment Cancelled',
          description: 'Your payment was cancelled. No charges were made.',
          variant: 'destructive',
        });
      }
    };

    activateDraft();
    return () => {
      refreshTimeouts.forEach((t) => window.clearTimeout(t));
    };
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

  const handleAddServer = async () => {
    if (!user) return;
    if (!newServer.name || !newServer.season || !newServer.part || !newServer.exp_rate || !newServer.website) {
      toast({ title: 'Error', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    const payload: ServerInsert = {
      user_id: user.id,
      name: newServer.name,
      season: newServer.season,
      part: newServer.part,
      exp_rate: newServer.exp_rate,
      website: newServer.website,
      banner_url: newServer.banner_url || null,
    };

    const { error } = await supabase.from('servers').insert([payload]);

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

    const tagsArray = newAd.tags ? newAd.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const payload: AdvertisementInsert = {
      user_id: user.id,
      ad_type: newAd.ad_type as AdvertisementInsert['ad_type'],
      title: newAd.title,
      description: newAd.description || null,
      website: newAd.website,
      banner_url: newAd.banner_url || null,
      short_description: newAd.short_description || null,
      full_description: newAd.full_description || null,
      video_url: newAd.video_url || null,
      delivery_time: newAd.delivery_time || null,
      price_range: newAd.price_range || null,
      location: newAd.location || null,
      experience_level: newAd.experience_level || null,
      tags: tagsArray.length > 0 ? tagsArray : null,
      discord_link: newAd.discord_link || null,
      supported_seasons: newAd.supported_seasons || null,
      category: (newAd.category || null) as AdvertisementInsert['category'],
    };

    const { error } = await supabase.from('advertisements').insert([payload]);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Advertisement added successfully' });
      setNewAd({
        ad_type: 'marketplace', title: '', description: '', website: '', banner_url: '',
        short_description: '', full_description: '', video_url: '',
        delivery_time: '', price_range: '', location: '',
        experience_level: '', tags: '', discord_link: '',
        supported_seasons: '', category: '',
      });
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
            <MySlotListings refreshToken={homepageListingsRefreshToken} />
          </TabsContent>

          {/* Servers Tab */}
          <TabsContent value="servers" className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="font-display text-lg font-semibold mb-4">Add New Server</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label>Name *</Label>
                  <Input placeholder="My MU Server" value={newServer.name} onChange={(e) => setNewServer({ ...newServer, name: e.target.value })} className="bg-muted/50" />
                </div>
                <div>
                  <Label>Website *</Label>
                  <Input placeholder="www.mysite.com" value={newServer.website} onChange={(e) => setNewServer({ ...newServer, website: e.target.value })} className="bg-muted/50" />
                </div>
                <div>
                  <Label>Season *</Label>
                  <Input placeholder="Season 20" value={newServer.season} onChange={(e) => setNewServer({ ...newServer, season: e.target.value })} className="bg-muted/50" />
                </div>
                <div>
                  <Label>Part *</Label>
                  <Input placeholder="Part 2-3" value={newServer.part} onChange={(e) => setNewServer({ ...newServer, part: e.target.value })} className="bg-muted/50" />
                </div>
                <div>
                  <Label>EXP Rate *</Label>
                  <Input placeholder="9999x" value={newServer.exp_rate} onChange={(e) => setNewServer({ ...newServer, exp_rate: e.target.value })} className="bg-muted/50" />
                </div>
                <div className="md:col-span-2">
                  <Label>Banner Image</Label>
                  <ImageUpload
                    bucket="server-banners"
                    userId={user.id}
                    onUploadComplete={(url) => setNewServer({ ...newServer, banner_url: url })}
                    currentImageUrl={newServer.banner_url}
                    aspectRatio="banner"
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
              <h3 className="font-display text-lg font-semibold mb-4">Add New Advertisement</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label>Type *</Label>
                  <select
                    value={newAd.ad_type}
                    onChange={(e) => setNewAd({ ...newAd, ad_type: e.target.value as 'marketplace' | 'services' })}
                    className="w-full h-10 px-3 bg-muted/50 border border-border rounded-md text-foreground"
                  >
                    <option value="marketplace">Marketplace (Files, Antihacks, etc.)</option>
                    <option value="services">Services (Videos, Configs, etc.)</option>
                  </select>
                </div>
                <div>
                  <Label>Category</Label>
                  <select
                    value={newAd.category}
                    onChange={(e) => setNewAd({ ...newAd, category: e.target.value })}
                    className="w-full h-10 px-3 bg-muted/50 border border-border rounded-md text-foreground"
                  >
                    <option value="">Select category...</option>
                    {(newAd.ad_type === 'marketplace' ? marketplaceCategories : serviceCategories).map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Title *</Label>
                  <Input placeholder="My Product/Service" value={newAd.title} onChange={(e) => setNewAd({ ...newAd, title: e.target.value })} className="bg-muted/50" />
                </div>
                <div>
                  <Label>Website *</Label>
                  <Input placeholder="www.mysite.com" value={newAd.website} onChange={(e) => setNewAd({ ...newAd, website: e.target.value })} className="bg-muted/50" />
                </div>
                <div className="md:col-span-2">
                  <Label>Short Description (summary shown at top of listing)</Label>
                  <Input placeholder="A brief one-line summary..." value={newAd.short_description} onChange={(e) => setNewAd({ ...newAd, short_description: e.target.value })} className="bg-muted/50" />
                </div>
                <div className="md:col-span-2">
                  <Label>Full Description (rich text — shown below banner)</Label>
                  <Suspense fallback={<div className="h-[200px] border border-input rounded-md flex items-center justify-center text-muted-foreground">Loading editor...</div>}>
                    <RichTextEditor
                      content={newAd.full_description}
                      onChange={(html) => setNewAd({ ...newAd, full_description: html })}
                      placeholder="Write a detailed description with formatting..."
                    />
                  </Suspense>
                </div>
                <div>
                  <Label>Video URL (YouTube/Vimeo)</Label>
                  <Input placeholder="https://youtube.com/watch?v=..." value={newAd.video_url} onChange={(e) => setNewAd({ ...newAd, video_url: e.target.value })} className="bg-muted/50" />
                </div>
                <div>
                  <Label>Discord Link</Label>
                  <Input placeholder="https://discord.gg/..." value={newAd.discord_link} onChange={(e) => setNewAd({ ...newAd, discord_link: e.target.value })} className="bg-muted/50" />
                </div>
                <div>
                  <Label>Delivery Time</Label>
                  <Input placeholder="e.g. 1-3 days" value={newAd.delivery_time} onChange={(e) => setNewAd({ ...newAd, delivery_time: e.target.value })} className="bg-muted/50" />
                </div>
                <div>
                  <Label>Price Range</Label>
                  <Input placeholder="e.g. $50 - $200" value={newAd.price_range} onChange={(e) => setNewAd({ ...newAd, price_range: e.target.value })} className="bg-muted/50" />
                </div>
                <div>
                  <Label>Location</Label>
                  <Input placeholder="e.g. United States" value={newAd.location} onChange={(e) => setNewAd({ ...newAd, location: e.target.value })} className="bg-muted/50" />
                </div>
                <div>
                  <Label>Experience Level</Label>
                  <select
                    value={newAd.experience_level}
                    onChange={(e) => setNewAd({ ...newAd, experience_level: e.target.value })}
                    className="w-full h-10 px-3 bg-muted/50 border border-border rounded-md text-foreground"
                  >
                    <option value="">Select...</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
                <div>
                  <Label>Supported Seasons</Label>
                  <Input placeholder="e.g. Season 17-20" value={newAd.supported_seasons} onChange={(e) => setNewAd({ ...newAd, supported_seasons: e.target.value })} className="bg-muted/50" />
                </div>
                <div>
                  <Label>Tags (comma-separated)</Label>
                  <Input placeholder="e.g. files, antihack, custom" value={newAd.tags} onChange={(e) => setNewAd({ ...newAd, tags: e.target.value })} className="bg-muted/50" />
                </div>
                <div className="md:col-span-2">
                  <Label>Banner Image</Label>
                  <ImageUpload
                    bucket="ad-banners"
                    userId={user.id}
                    onUploadComplete={(url) => setNewAd({ ...newAd, banner_url: url })}
                    currentImageUrl={newAd.banner_url}
                    aspectRatio="banner"
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
