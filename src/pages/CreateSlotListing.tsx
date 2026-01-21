import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Upload, Image as ImageIcon } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { SLOT_CONFIG, getSlotConfig } from '@/lib/slotConfig';

const CreateSlotListing = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const type = searchParams.get('type') || '';
  const slotId = parseInt(searchParams.get('slot') || '0');
  const packageId = searchParams.get('package') || '';
  const paymentSuccess = searchParams.get('payment') === 'success';

  const slotConfig = getSlotConfig(slotId);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    description: '',
    website: '',
    bannerUrl: '',
    // Server specific
    season: '',
    part: '',
    expRate: '',
    openDate: '',
    features: '',
    // Promo specific
    highlight: '',
    text: '',
    link: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Check slot access for non-free slots
  useEffect(() => {
    const checkAccess = async () => {
      if (!user || !slotConfig) return;
      
      // Slot 6 is free - no purchase required
      if (slotId === 6) return;
      
      // Check for active slot purchase
      const { data: purchase } = await supabase
        .from('slot_purchases')
        .select('*')
        .eq('user_id', user.id)
        .eq('slot_id', slotId)
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .maybeSingle();
      
      if (!purchase && !paymentSuccess) {
        toast({
          title: 'Package Required',
          description: 'Please purchase a package to create a listing in this slot.',
          variant: 'destructive',
        });
        navigate('/pricing');
      }
    };
    
    if (user && !authLoading) {
      checkAccess();
    }
  }, [user, authLoading, slotId, slotConfig, paymentSuccess, navigate, toast]);

  useEffect(() => {
    if (paymentSuccess) {
      toast({
        title: 'Payment Successful!',
        description: 'You can now create your listing.',
      });
    }
  }, [paymentSuccess, toast]);

  if (!slotConfig) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8 text-center">
          <h1 className="text-2xl font-bold text-destructive">Invalid Slot</h1>
          <p className="text-muted-foreground mt-2">The requested slot type is not valid.</p>
          <Button onClick={() => navigate('/pricing')} className="mt-4">
            Go to Pricing
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      let result;

      switch (slotConfig.table) {
        case 'advertisements':
          result = await supabase
            .from('advertisements')
            .insert({
              user_id: user.id,
              title: formData.title || formData.name,
              description: formData.description,
              website: formData.website,
              banner_url: formData.bannerUrl,
              ad_type: type === 'marketplace' ? 'marketplace' : 'services',
              slot_id: slotId,
              is_active: true,
              vip_level: 'gold',
            })
            .select()
            .single();
          break;

        case 'servers':
          result = await supabase
            .from('servers')
            .insert({
              user_id: user.id,
              name: formData.name,
              website: formData.website,
              banner_url: formData.bannerUrl,
              season: formData.season || 'Season 17',
              part: formData.part || 'Part 1',
              exp_rate: formData.expRate || '1000x',
              open_date: formData.openDate || null,
              features: formData.features ? formData.features.split(',').map(f => f.trim()) : [],
              slot_id: slotId,
              is_active: true,
              is_premium: slotId === 3,
            })
            .select()
            .single();
          break;

        case 'premium_text_servers':
          result = await supabase
            .from('premium_text_servers')
            .insert({
              user_id: user.id,
              name: formData.name,
              website: formData.website,
              exp_rate: formData.expRate || '1000x',
              version: formData.season || 'S17',
              open_date: formData.openDate || null,
              slot_id: slotId,
              is_active: true,
            })
            .select()
            .single();
          break;

        case 'premium_banners':
          result = await supabase
            .from('premium_banners')
            .insert({
              title: formData.name,
              website: formData.website,
              image_url: formData.bannerUrl,
              slot_id: slotId,
              is_active: true,
            })
            .select()
            .single();
          break;

        case 'rotating_promos':
          result = await supabase
            .from('rotating_promos')
            .insert({
              text: formData.text || formData.name,
              highlight: formData.highlight,
              link: formData.link || formData.website,
              promo_type: type === 'partner-discount' ? 'discount' : 'event',
              slot_id: slotId,
              is_active: true,
            })
            .select()
            .single();
          break;

        default:
          throw new Error('Unknown listing type');
      }

      if (result?.error) {
        throw result.error;
      }

      toast({
        title: 'Listing Created!',
        description: 'Your listing is now live on the homepage.',
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Failed to create listing:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create listing.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderFormFields = () => {
    switch (slotConfig.table) {
      case 'advertisements':
        return (
          <>
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Your advertisement title"
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Brief description of your product/service"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="website">Website *</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="example.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="bannerUrl">Banner Image URL</Label>
              <Input
                id="bannerUrl"
                value={formData.bannerUrl}
                onChange={(e) => handleChange('bannerUrl', e.target.value)}
                placeholder="https://your-image-url.com/banner.jpg"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter a direct URL to your banner image
              </p>
            </div>
          </>
        );

      case 'servers':
        return (
          <>
            <div>
              <Label htmlFor="name">Server Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Your server name"
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="season">Season *</Label>
                <Input
                  id="season"
                  value={formData.season}
                  onChange={(e) => handleChange('season', e.target.value)}
                  placeholder="Season 17"
                  required
                />
              </div>
              <div>
                <Label htmlFor="part">Part</Label>
                <Input
                  id="part"
                  value={formData.part}
                  onChange={(e) => handleChange('part', e.target.value)}
                  placeholder="Part 1-2"
                />
              </div>
              <div>
                <Label htmlFor="expRate">EXP Rate *</Label>
                <Input
                  id="expRate"
                  value={formData.expRate}
                  onChange={(e) => handleChange('expRate', e.target.value)}
                  placeholder="1000x"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="openDate">Opening Date</Label>
              <Input
                id="openDate"
                type="date"
                value={formData.openDate}
                onChange={(e) => handleChange('openDate', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="website">Website *</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="yourserver.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="features">Features (comma-separated)</Label>
              <Input
                id="features"
                value={formData.features}
                onChange={(e) => handleChange('features', e.target.value)}
                placeholder="PVP Focused, Custom Wings, Long-term"
              />
            </div>
            <div>
              <Label htmlFor="bannerUrlServer">Banner Image URL</Label>
              <Input
                id="bannerUrlServer"
                value={formData.bannerUrl}
                onChange={(e) => handleChange('bannerUrl', e.target.value)}
                placeholder="https://your-image-url.com/banner.jpg"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter a direct URL to your banner image
              </p>
            </div>
          </>
        );

      case 'premium_text_servers':
        return (
          <>
            <div>
              <Label htmlFor="name">Server Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="YOURSERVER.COM"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expRate">EXP Rate *</Label>
                <Input
                  id="expRate"
                  value={formData.expRate}
                  onChange={(e) => handleChange('expRate', e.target.value)}
                  placeholder="x1000"
                  required
                />
              </div>
              <div>
                <Label htmlFor="season">Version *</Label>
                <Input
                  id="season"
                  value={formData.season}
                  onChange={(e) => handleChange('season', e.target.value)}
                  placeholder="S17"
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="openDate">Opening Date</Label>
              <Input
                id="openDate"
                value={formData.openDate}
                onChange={(e) => handleChange('openDate', e.target.value)}
                placeholder="Open 21.01"
              />
            </div>
            <div>
              <Label htmlFor="website">Website *</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="yourserver.com"
                required
              />
            </div>
          </>
        );

      case 'premium_banners':
        return (
          <>
            <div>
              <Label htmlFor="name">Server/Site Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Your server or site name"
                required
              />
            </div>
            <div>
              <Label htmlFor="website">Website *</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="yoursite.com"
                required
              />
            </div>
            <div>
              <Label htmlFor="bannerUrlPremium">Banner Image URL (Required) *</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Recommended size: 800x200 pixels, landscape format
              </p>
              <Input
                id="bannerUrlPremium"
                value={formData.bannerUrl}
                onChange={(e) => handleChange('bannerUrl', e.target.value)}
                placeholder="https://your-image-url.com/banner.jpg"
                required
              />
            </div>
          </>
        );

      case 'rotating_promos':
        return (
          <>
            <div>
              <Label htmlFor="text">Promo Text *</Label>
              <Input
                id="text"
                value={formData.text}
                onChange={(e) => handleChange('text', e.target.value)}
                placeholder={type === 'partner-discount' ? 'VPS Hosting Special' : 'Castle Siege Event'}
                required
              />
            </div>
            <div>
              <Label htmlFor="highlight">Highlight Text *</Label>
              <Input
                id="highlight"
                value={formData.highlight}
                onChange={(e) => handleChange('highlight', e.target.value)}
                placeholder={type === 'partner-discount' ? '-20%' : 'Tonight 8PM'}
                required
              />
            </div>
            <div>
              <Label htmlFor="link">Link URL</Label>
              <Input
                id="link"
                value={formData.link}
                onChange={(e) => handleChange('link', e.target.value)}
                placeholder="https://yoursite.com/promo"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={`Create ${slotConfig.name} - MU Online Hub`}
        description={`Create your ${slotConfig.name} listing`}
      />
      <Header />
      
      <div className="container py-8 max-w-2xl">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="glass-card p-6">
          <h1 className="font-display text-2xl font-bold text-gradient-gold mb-2">
            Create {slotConfig.name}
          </h1>
          <p className="text-muted-foreground mb-6">
            {slotConfig.description}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {renderFormFields()}

            <Button
              type="submit"
              disabled={loading}
              className="w-full btn-fantasy-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Listing'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateSlotListing;
