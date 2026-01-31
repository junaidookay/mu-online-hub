import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { getSlotConfig } from '@/lib/slotConfig';
import { ImageUpload } from '@/components/upload/ImageUpload';

interface EditDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: {
    id: string;
    type: 'server' | 'advertisement' | 'banner' | 'promo' | 'text_server';
    name: string;
    website: string;
    slot_id: number | null;
    promo_type?: string;
  };
  onSuccess: () => void;
}

interface ServerData {
  name: string;
  website: string;
  banner_url: string | null;
  season: string;
  part: string;
  exp_rate: string;
  open_date: string | null;
  features: string[];
}

interface AdvertisementData {
  title: string;
  description: string | null;
  website: string;
  banner_url: string | null;
}

interface TextServerData {
  name: string;
  website: string;
  exp_rate: string;
  version: string;
  open_date: string | null;
}

interface PromoData {
  text: string;
  highlight: string;
  link: string | null;
}

interface BannerData {
  title: string;
  website: string;
  image_url: string;
}

export const EditDraftModal = ({ isOpen, onClose, listing, onSuccess }: EditDraftModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const slotConfig = listing.slot_id ? getSlotConfig(listing.slot_id) : null;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    title: '',
    description: '',
    website: '',
    bannerUrl: '',
    season: '',
    part: '',
    expRate: '',
    openDate: '',
    features: '',
    highlight: '',
    text: '',
    link: '',
  });

  // Fetch current data
  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen || !listing.id) return;
      
      setFetching(true);
      try {
        let data: ServerData | AdvertisementData | TextServerData | PromoData | null = null;

        switch (listing.type) {
          case 'server': {
            const { data: serverData } = await supabase
              .from('servers')
              .select('name, website, banner_url, season, part, exp_rate, open_date, features')
              .eq('id', listing.id)
              .single();
            data = serverData as ServerData | null;
            if (data && 'season' in data) {
              setFormData({
                ...formData,
                name: data.name || '',
                website: data.website || '',
                bannerUrl: data.banner_url || '',
                season: data.season || '',
                part: data.part || '',
                expRate: data.exp_rate || '',
                openDate: data.open_date || '',
                features: Array.isArray(data.features) ? data.features.join(', ') : '',
              });
            }
            break;
          }

          case 'advertisement': {
            const { data: adData } = await supabase
              .from('advertisements')
              .select('title, description, website, banner_url')
              .eq('id', listing.id)
              .single();
            data = adData as AdvertisementData | null;
            if (data && 'title' in data) {
              setFormData({
                ...formData,
                title: data.title || '',
                name: data.title || '',
                description: data.description || '',
                website: data.website || '',
                bannerUrl: data.banner_url || '',
              });
            }
            break;
          }

          case 'text_server': {
            const { data: textData } = await supabase
              .from('premium_text_servers')
              .select('name, website, exp_rate, version, open_date')
              .eq('id', listing.id)
              .single();
            data = textData as TextServerData | null;
            if (data && 'version' in data) {
              setFormData({
                ...formData,
                name: data.name || '',
                website: data.website || '',
                expRate: data.exp_rate || '',
                season: data.version || '',
                openDate: data.open_date || '',
              });
            }
            break;
          }

          case 'promo': {
            const { data: promoData } = await supabase
              .from('rotating_promos')
              .select('text, highlight, link')
              .eq('id', listing.id)
              .single();
            data = promoData as PromoData | null;
            if (data && 'text' in data) {
              setFormData({
                ...formData,
                text: data.text || '',
                highlight: data.highlight || '',
                link: data.link || '',
                name: data.text || '',
              });
            }
            break;
          }

          case 'banner': {
            const { data: bannerData } = await supabase
              .from('premium_banners')
              .select('title, website, image_url')
              .eq('id', listing.id)
              .single();
            data = bannerData as BannerData | null;
            if (data && 'image_url' in data) {
              setFormData({
                ...formData,
                name: data.title || '',
                website: data.website || '',
                bannerUrl: data.image_url || '',
              });
            }
            break;
          }
        }
      } catch (error) {
        console.error('Error fetching draft data:', error);
      } finally {
        setFetching(false);
      }
    };

    fetchData();
  }, [isOpen, listing.id, listing.type]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      let error;

      switch (listing.type) {
        case 'server':
          ({ error } = await supabase
            .from('servers')
            .update({
              name: formData.name,
              website: formData.website,
              banner_url: formData.bannerUrl || null,
              season: formData.season || 'Season 17',
              part: formData.part || 'Part 1',
              exp_rate: formData.expRate || '1000x',
              open_date: formData.openDate || null,
              features: formData.features ? formData.features.split(',').map(f => f.trim()) : [],
            })
            .eq('id', listing.id)
            .eq('user_id', user.id));
          break;

        case 'advertisement':
          ({ error } = await supabase
            .from('advertisements')
            .update({
              title: formData.title || formData.name,
              description: formData.description,
              website: formData.website,
              banner_url: formData.bannerUrl || null,
            })
            .eq('id', listing.id)
            .eq('user_id', user.id));
          break;

        case 'text_server':
          ({ error } = await supabase
            .from('premium_text_servers')
            .update({
              name: formData.name,
              website: formData.website,
              exp_rate: formData.expRate || '1000x',
              version: formData.season || 'S17',
              open_date: formData.openDate || null,
            })
            .eq('id', listing.id)
            .eq('user_id', user.id));
          break;

        case 'promo':
          ({ error } = await supabase
            .from('rotating_promos')
            .update({
              text: formData.text,
              highlight: formData.highlight,
              link: formData.link || null,
            })
            .eq('id', listing.id)
            .eq('user_id', user.id));
          break;

        case 'banner':
          ({ error } = await supabase
            .from('premium_banners')
            .update({
              title: formData.name,
              website: formData.website,
              image_url: formData.bannerUrl,
            })
            .eq('id', listing.id)
            .eq('user_id', user.id));
          break;

        default:
          throw new Error('Unknown listing type');
      }

      if (error) throw error;

      toast({
        title: 'Draft Updated',
        description: 'Your draft has been updated successfully.',
      });

      onSuccess();
    } catch (error: unknown) {
      console.error('Failed to update draft:', error);
      const message = error instanceof Error ? error.message : 'Failed to update draft.';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderFormFields = () => {
    switch (listing.type) {
      case 'advertisement':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="Your advertisement title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Brief description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website *</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Banner Image</Label>
              <ImageUpload
                bucket="ad-banners"
                userId={user?.id || ''}
                onUploadComplete={(url) => handleChange('bannerUrl', url)}
                currentImageUrl={formData.bannerUrl}
                maxSizeMB={5}
                aspectRatio="468x60"
              />
            </div>
          </>
        );

      case 'banner':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="name">Server/Site Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Your server or site name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website *</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="yoursite.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Banner Image (Required) *</Label>
              <ImageUpload
                bucket="banners"
                userId={user?.id || ''}
                onUploadComplete={(url) => handleChange('bannerUrl', url)}
                currentImageUrl={formData.bannerUrl}
                maxSizeMB={5}
                aspectRatio="800x200"
              />
            </div>
          </>
        );

      case 'server':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="name">Server Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Your server name"
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label htmlFor="season">Season</Label>
                <Input
                  id="season"
                  value={formData.season}
                  onChange={(e) => handleChange('season', e.target.value)}
                  placeholder="Season 17"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="part">Part</Label>
                <Input
                  id="part"
                  value={formData.part}
                  onChange={(e) => handleChange('part', e.target.value)}
                  placeholder="Part 1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expRate">EXP Rate</Label>
                <Input
                  id="expRate"
                  value={formData.expRate}
                  onChange={(e) => handleChange('expRate', e.target.value)}
                  placeholder="1000x"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="openDate">Opening Date</Label>
              <Input
                id="openDate"
                type="date"
                value={formData.openDate}
                onChange={(e) => handleChange('openDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website *</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="yourserver.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="features">Features (comma-separated)</Label>
              <Input
                id="features"
                value={formData.features}
                onChange={(e) => handleChange('features', e.target.value)}
                placeholder="PVP Focused, Custom Wings"
              />
            </div>
            <div className="space-y-2">
              <Label>Server Banner</Label>
              <ImageUpload
                bucket="server-banners"
                userId={user?.id || ''}
                onUploadComplete={(url) => handleChange('bannerUrl', url)}
                currentImageUrl={formData.bannerUrl}
                maxSizeMB={5}
                aspectRatio="728x90"
              />
            </div>
          </>
        );

      case 'text_server':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="name">Server Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Your server name"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="season">Version</Label>
                <Input
                  id="season"
                  value={formData.season}
                  onChange={(e) => handleChange('season', e.target.value)}
                  placeholder="S17"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expRate">EXP Rate</Label>
                <Input
                  id="expRate"
                  value={formData.expRate}
                  onChange={(e) => handleChange('expRate', e.target.value)}
                  placeholder="1000x"
                />
              </div>
            </div>
            <div className="space-y-2">
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

      case 'promo':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="highlight">Highlight Text</Label>
              <Input
                id="highlight"
                value={formData.highlight}
                onChange={(e) => handleChange('highlight', e.target.value)}
                placeholder="20% OFF"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="text">Promotional Text *</Label>
              <Input
                id="text"
                value={formData.text}
                onChange={(e) => handleChange('text', e.target.value)}
                placeholder="Get 20% off all premium services!"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link">Link</Label>
              <Input
                id="link"
                value={formData.link}
                onChange={(e) => handleChange('link', e.target.value)}
                placeholder="https://..."
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Draft</DialogTitle>
          <DialogDescription>
            Update your {slotConfig?.name || 'listing'} draft before publishing.
          </DialogDescription>
        </DialogHeader>

        {fetching ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {renderFormFields()}

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
