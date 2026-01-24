import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SEOHead } from '@/components/SEOHead';
import { 
  Plus, 
  Trash2, 
  Loader2, 
  ArrowLeft, 
  Image, 
  Shield,
  Users,
  Server,
  Megaphone,
  BarChart3,
  CreditCard
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { AnalyticsDashboard } from '@/components/admin/AnalyticsDashboard';
import { PaymentAnalytics } from '@/components/admin/PaymentAnalytics';
import { StripeSettings } from '@/components/admin/StripeSettings';
import { PayPalSettings } from '@/components/admin/PayPalSettings';
import { AdminSlotManager } from '@/components/admin/AdminSlotManager';
import type { Tables } from '@/integrations/supabase/types';

type PremiumBanner = Tables<'premium_banners'>;
type Partner = Tables<'partners'>;
type ArcanaProject = Tables<'arcana_projects'>;
type RotatingPromo = Tables<'rotating_promos'>;

const Admin = () => {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [banners, setBanners] = useState<PremiumBanner[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [arcanaProjects, setArcanaProjects] = useState<ArcanaProject[]>([]);
  const [promos, setPromos] = useState<RotatingPromo[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newBanner, setNewBanner] = useState({ title: '', website: '', image_url: '' });
  const [newPartner, setNewPartner] = useState({ name: '', info: '', website: '', image_url: '' });
  const [newProject, setNewProject] = useState({ name: '', info: '', website: '', image_url: '' });
  const [newPromo, setNewPromo] = useState({ promo_type: 'discount', text: '', highlight: '', link: '' });

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/auth');
    } else if (!isLoading && user && !isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access the admin dashboard.',
        variant: 'destructive',
      });
      navigate('/');
    }
  }, [user, isAdmin, isLoading, navigate, toast]);

  useEffect(() => {
    if (isAdmin) {
      fetchAllData();
    }
  }, [isAdmin]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [bannersRes, partnersRes, projectsRes, promosRes] = await Promise.all([
        supabase.from('premium_banners').select('*').order('display_order'),
        supabase.from('partners').select('*').order('display_order'),
        supabase.from('arcana_projects').select('*').order('display_order'),
        supabase.from('rotating_promos').select('*').order('created_at'),
      ]);

      if (bannersRes.data) setBanners(bannersRes.data);
      if (partnersRes.data) setPartners(partnersRes.data);
      if (projectsRes.data) setArcanaProjects(projectsRes.data);
      if (promosRes.data) setPromos(promosRes.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleAddBanner = async () => {
    if (!newBanner.title || !newBanner.website || !newBanner.image_url) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('premium_banners').insert([{
      title: newBanner.title,
      website: newBanner.website,
      image_url: newBanner.image_url,
      display_order: banners.length,
    }]);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Banner added successfully' });
      setNewBanner({ title: '', website: '', image_url: '' });
      fetchAllData();
    }
  };

  const handleAddPartner = async () => {
    if (!newPartner.name || !newPartner.website) {
      toast({ title: 'Error', description: 'Please fill required fields', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('partners').insert([{
      name: newPartner.name,
      info: newPartner.info || null,
      website: newPartner.website,
      image_url: newPartner.image_url || null,
      display_order: partners.length,
    }]);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Partner added successfully' });
      setNewPartner({ name: '', info: '', website: '', image_url: '' });
      fetchAllData();
    }
  };

  const handleAddProject = async () => {
    if (!newProject.name || !newProject.website) {
      toast({ title: 'Error', description: 'Please fill required fields', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('arcana_projects').insert([{
      name: newProject.name,
      info: newProject.info || null,
      website: newProject.website,
      image_url: newProject.image_url || null,
      display_order: arcanaProjects.length,
    }]);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Project added successfully' });
      setNewProject({ name: '', info: '', website: '', image_url: '' });
      fetchAllData();
    }
  };

  const handleAddPromo = async () => {
    if (!newPromo.text || !newPromo.highlight) {
      toast({ title: 'Error', description: 'Please fill required fields', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('rotating_promos').insert([{
      promo_type: newPromo.promo_type,
      text: newPromo.text,
      highlight: newPromo.highlight,
      link: newPromo.link || null,
    }]);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Promo added successfully' });
      setNewPromo({ promo_type: 'discount', text: '', highlight: '', link: '' });
      fetchAllData();
    }
  };

  const handleToggleBanner = async (id: string, currentValue: boolean | null) => {
    const { error } = await supabase
      .from('premium_banners')
      .update({ is_active: !currentValue })
      .eq('id', id);
    if (!error) fetchAllData();
  };

  const handleTogglePartner = async (id: string, currentValue: boolean | null) => {
    const { error } = await supabase
      .from('partners')
      .update({ is_active: !currentValue })
      .eq('id', id);
    if (!error) fetchAllData();
  };

  const handleToggleProject = async (id: string, currentValue: boolean | null) => {
    const { error } = await supabase
      .from('arcana_projects')
      .update({ is_active: !currentValue })
      .eq('id', id);
    if (!error) fetchAllData();
  };

  const handleTogglePromo = async (id: string, currentValue: boolean | null) => {
    const { error } = await supabase
      .from('rotating_promos')
      .update({ is_active: !currentValue })
      .eq('id', id);
    if (!error) fetchAllData();
  };

  const handleDeleteBanner = async (id: string) => {
    const { error } = await supabase.from('premium_banners').delete().eq('id', id);
    if (!error) {
      toast({ title: 'Deleted', description: 'Banner deleted successfully' });
      fetchAllData();
    }
  };

  const handleDeletePartner = async (id: string) => {
    const { error } = await supabase.from('partners').delete().eq('id', id);
    if (!error) {
      toast({ title: 'Deleted', description: 'Partner deleted successfully' });
      fetchAllData();
    }
  };

  const handleDeleteProject = async (id: string) => {
    const { error } = await supabase.from('arcana_projects').delete().eq('id', id);
    if (!error) {
      toast({ title: 'Deleted', description: 'Project deleted successfully' });
      fetchAllData();
    }
  };

  const handleDeletePromo = async (id: string) => {
    const { error } = await supabase.from('rotating_promos').delete().eq('id', id);
    if (!error) {
      toast({ title: 'Deleted', description: 'Promo deleted successfully' });
      fetchAllData();
    }
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Admin Dashboard - MU Online Hub"
        description="Manage banners, partners, projects, and promos for MU Online Hub."
      />
      <div className="container py-6">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
            <ArrowLeft size={18} />
            Back to Home
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="text-primary" />
            <h1 className="font-display text-2xl font-bold text-gradient-gold">Admin Dashboard</h1>
          </div>
        </div>

        <Tabs defaultValue="slots" className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-6">
            <TabsTrigger value="slots" className="gap-2">
              <Server size={16} />
              Slots
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 size={16} />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="stripe" className="gap-2">
              <CreditCard size={16} />
              Payments
            </TabsTrigger>
            <TabsTrigger value="banners" className="gap-2">
              <Image size={16} />
              Banners
            </TabsTrigger>
            <TabsTrigger value="partners" className="gap-2">
              <Users size={16} />
              Partners
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-2">
              <Server size={16} />
              Projects
            </TabsTrigger>
            <TabsTrigger value="promos" className="gap-2">
              <Megaphone size={16} />
              Promos
            </TabsTrigger>
          </TabsList>

          {/* Slot Manager Tab */}
          <TabsContent value="slots" className="space-y-6">
            <AdminSlotManager />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsDashboard />
          </TabsContent>

          {/* Payment Settings Tab */}
          <TabsContent value="stripe" className="space-y-6">
            <PaymentAnalytics />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StripeSettings />
              <PayPalSettings />
            </div>
          </TabsContent>

          {/* Premium Banners Tab */}
          <TabsContent value="banners" className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="font-display text-lg font-semibold mb-4">Add Premium Banner</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <Label htmlFor="bannerTitle">Title</Label>
                  <Input
                    id="bannerTitle"
                    placeholder="Banner title"
                    value={newBanner.title}
                    onChange={(e) => setNewBanner({ ...newBanner, title: e.target.value })}
                    className="bg-muted/50"
                  />
                </div>
                <div>
                  <Label htmlFor="bannerWebsite">Website</Label>
                  <Input
                    id="bannerWebsite"
                    placeholder="www.example.com"
                    value={newBanner.website}
                    onChange={(e) => setNewBanner({ ...newBanner, website: e.target.value })}
                    className="bg-muted/50"
                  />
                </div>
                <div>
                  <Label htmlFor="bannerImage">Image URL</Label>
                  <Input
                    id="bannerImage"
                    placeholder="https://..."
                    value={newBanner.image_url}
                    onChange={(e) => setNewBanner({ ...newBanner, image_url: e.target.value })}
                    className="bg-muted/50"
                  />
                </div>
              </div>
              <Button onClick={handleAddBanner} className="btn-fantasy-primary gap-2">
                <Plus size={16} />
                Add Banner
              </Button>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-display text-lg font-semibold mb-4">Existing Banners</h3>
              <div className="space-y-3">
                {banners.length === 0 ? (
                  <p className="text-muted-foreground">No banners yet</p>
                ) : (
                  banners.map((banner) => (
                    <div key={banner.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-4">
                        <img src={banner.image_url} alt={banner.title} className="w-20 h-10 object-cover rounded" />
                        <div>
                          <p className="font-semibold">{banner.title}</p>
                          <p className="text-xs text-muted-foreground">{banner.website}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Switch
                          checked={banner.is_active ?? false}
                          onCheckedChange={() => handleToggleBanner(banner.id, banner.is_active)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteBanner(banner.id)}
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

          {/* Partners Tab */}
          <TabsContent value="partners" className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="font-display text-lg font-semibold mb-4">Add Partner</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    placeholder="Partner name"
                    value={newPartner.name}
                    onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                    className="bg-muted/50"
                  />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input
                    placeholder="www.example.com"
                    value={newPartner.website}
                    onChange={(e) => setNewPartner({ ...newPartner, website: e.target.value })}
                    className="bg-muted/50"
                  />
                </div>
                <div>
                  <Label>Info</Label>
                  <Input
                    placeholder="Partner info"
                    value={newPartner.info}
                    onChange={(e) => setNewPartner({ ...newPartner, info: e.target.value })}
                    className="bg-muted/50"
                  />
                </div>
                <div>
                  <Label>Image URL</Label>
                  <Input
                    placeholder="https://..."
                    value={newPartner.image_url}
                    onChange={(e) => setNewPartner({ ...newPartner, image_url: e.target.value })}
                    className="bg-muted/50"
                  />
                </div>
              </div>
              <Button onClick={handleAddPartner} className="btn-fantasy-primary gap-2">
                <Plus size={16} />
                Add Partner
              </Button>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-display text-lg font-semibold mb-4">Existing Partners</h3>
              <div className="space-y-3">
                {partners.length === 0 ? (
                  <p className="text-muted-foreground">No partners yet</p>
                ) : (
                  partners.map((partner) => (
                    <div key={partner.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-4">
                        {partner.image_url && (
                          <img src={partner.image_url} alt={partner.name} className="w-16 h-10 object-cover rounded" />
                        )}
                        <div>
                          <p className="font-semibold">{partner.name}</p>
                          <p className="text-xs text-muted-foreground">{partner.info}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Switch
                          checked={partner.is_active ?? false}
                          onCheckedChange={() => handleTogglePartner(partner.id, partner.is_active)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePartner(partner.id)}
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

          {/* Arcana Projects Tab */}
          <TabsContent value="projects" className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="font-display text-lg font-semibold mb-4">Add Arcana Project</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    placeholder="Project name"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className="bg-muted/50"
                  />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input
                    placeholder="www.example.com"
                    value={newProject.website}
                    onChange={(e) => setNewProject({ ...newProject, website: e.target.value })}
                    className="bg-muted/50"
                  />
                </div>
                <div>
                  <Label>Info</Label>
                  <Input
                    placeholder="Project info"
                    value={newProject.info}
                    onChange={(e) => setNewProject({ ...newProject, info: e.target.value })}
                    className="bg-muted/50"
                  />
                </div>
                <div>
                  <Label>Image URL</Label>
                  <Input
                    placeholder="https://..."
                    value={newProject.image_url}
                    onChange={(e) => setNewProject({ ...newProject, image_url: e.target.value })}
                    className="bg-muted/50"
                  />
                </div>
              </div>
              <Button onClick={handleAddProject} className="btn-fantasy-primary gap-2">
                <Plus size={16} />
                Add Project
              </Button>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-display text-lg font-semibold mb-4">Existing Projects</h3>
              <div className="space-y-3">
                {arcanaProjects.length === 0 ? (
                  <p className="text-muted-foreground">No projects yet</p>
                ) : (
                  arcanaProjects.map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-4">
                        {project.image_url && (
                          <img src={project.image_url} alt={project.name} className="w-16 h-10 object-cover rounded" />
                        )}
                        <div>
                          <p className="font-semibold">{project.name}</p>
                          <p className="text-xs text-muted-foreground">{project.info}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Switch
                          checked={project.is_active ?? false}
                          onCheckedChange={() => handleToggleProject(project.id, project.is_active)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProject(project.id)}
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

          {/* Promos Tab */}
          <TabsContent value="promos" className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="font-display text-lg font-semibold mb-4">Add Promo</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <Label>Type</Label>
                  <select
                    value={newPromo.promo_type}
                    onChange={(e) => setNewPromo({ ...newPromo, promo_type: e.target.value })}
                    className="w-full h-10 px-3 bg-muted/50 border border-border rounded-md"
                  >
                    <option value="discount">Discount</option>
                    <option value="event">Event</option>
                  </select>
                </div>
                <div>
                  <Label>Text</Label>
                  <Input
                    placeholder="Promo text"
                    value={newPromo.text}
                    onChange={(e) => setNewPromo({ ...newPromo, text: e.target.value })}
                    className="bg-muted/50"
                  />
                </div>
                <div>
                  <Label>Highlight</Label>
                  <Input
                    placeholder="e.g. -20%"
                    value={newPromo.highlight}
                    onChange={(e) => setNewPromo({ ...newPromo, highlight: e.target.value })}
                    className="bg-muted/50"
                  />
                </div>
                <div>
                  <Label>Link (optional)</Label>
                  <Input
                    placeholder="https://..."
                    value={newPromo.link}
                    onChange={(e) => setNewPromo({ ...newPromo, link: e.target.value })}
                    className="bg-muted/50"
                  />
                </div>
              </div>
              <Button onClick={handleAddPromo} className="btn-fantasy-primary gap-2">
                <Plus size={16} />
                Add Promo
              </Button>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-display text-lg font-semibold mb-4">Existing Promos</h3>
              <div className="space-y-3">
                {promos.length === 0 ? (
                  <p className="text-muted-foreground">No promos yet</p>
                ) : (
                  promos.map((promo) => (
                    <div key={promo.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-4">
                        <span className={`text-xs px-2 py-1 rounded ${
                          promo.promo_type === 'discount' ? 'bg-green-500/20 text-green-400' : 'bg-secondary/20 text-secondary'
                        }`}>
                          {promo.promo_type}
                        </span>
                        <div>
                          <p className="font-semibold">{promo.text}</p>
                          <p className="text-xs text-primary">{promo.highlight}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Switch
                          checked={promo.is_active ?? false}
                          onCheckedChange={() => handleTogglePromo(promo.id, promo.is_active)}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeletePromo(promo.id)}
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

export default Admin;
