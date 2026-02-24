import { useState, useEffect, lazy, Suspense } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { getSlotConfig } from '@/lib/slotConfig';
import { ImageUpload } from '@/components/upload/ImageUpload';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Database } from '@/integrations/supabase/types';

const RichTextEditor = lazy(() => import('@/components/editor/RichTextEditor'));

type SellerCategory = Database["public"]["Enums"]["seller_category"];

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

const tagOptions = ['MU Online', 'Season 17', 'Season 19', 'Season 20', 'PVP', 'PVE', 'Custom', 'Premium', 'Free', 'Long-term'];

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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    title: '',
    description: '',
    priceUsd: '',
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
    shortDescription: '',
    fullDescription: '',
    videoUrl: '',
    deliveryTime: '',
    priceRange: '',
    location: '',
    experienceLevel: '',
    supportedSeasons: '',
    discordLink: '',
    category: '',
    longDescription: '',
    logoUrl: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen || !listing.id) return;
      setFetching(true);
      try {
        switch (listing.type) {
          case 'server': {
            const { data } = await supabase
              .from('servers')
              .select('name, website, banner_url, season, part, exp_rate, open_date, features, long_description, discord_link, logo_url')
              .eq('id', listing.id)
              .single();
            if (data) {
              setFormData(prev => ({
                ...prev,
                name: data.name || '', website: data.website || '', bannerUrl: data.banner_url || '',
                season: data.season || '', part: data.part || '', expRate: data.exp_rate || '',
                openDate: data.open_date || '', features: Array.isArray(data.features) ? data.features.join(', ') : '',
                longDescription: data.long_description || '', discordLink: data.discord_link || '',
                logoUrl: data.logo_url || '',
              }));
            }
            break;
          }
          case 'advertisement': {
            const { data } = await supabase
              .from('advertisements')
              .select('title, description, price_usd, website, banner_url, short_description, full_description, video_url, delivery_time, price_range, location, experience_level, supported_seasons, discord_link, tags, category')
              .eq('id', listing.id)
              .single();
            if (data) {
              setFormData(prev => ({
                ...prev,
                title: data.title || '', name: data.title || '', description: data.description || '',
                priceUsd: data.price_usd != null ? String(data.price_usd) : '',
                website: data.website || '', bannerUrl: data.banner_url || '',
                shortDescription: data.short_description || '', fullDescription: data.full_description || '',
                videoUrl: data.video_url || '', deliveryTime: data.delivery_time || '',
                priceRange: data.price_range || '', location: data.location || '',
                experienceLevel: data.experience_level || '', supportedSeasons: data.supported_seasons || '',
                discordLink: data.discord_link || '', category: data.category || '',
              }));
              setSelectedTags(data.tags || []);
            }
            break;
          }
          case 'text_server': {
            const { data } = await supabase
              .from('premium_text_servers')
              .select('name, website, exp_rate, version, open_date')
              .eq('id', listing.id)
              .single();
            if (data) {
              setFormData(prev => ({
                ...prev,
                name: data.name || '', website: data.website || '',
                expRate: data.exp_rate || '', season: data.version || '', openDate: data.open_date || '',
              }));
            }
            break;
          }
          case 'promo': {
            const { data } = await supabase
              .from('rotating_promos')
              .select('text, highlight, link')
              .eq('id', listing.id)
              .single();
            if (data) {
              setFormData(prev => ({
                ...prev,
                text: data.text || '', highlight: data.highlight || '',
                link: data.link || '', name: data.text || '',
              }));
            }
            break;
          }
          case 'banner': {
            const { data } = await supabase
              .from('premium_banners')
              .select('title, website, image_url')
              .eq('id', listing.id)
              .single();
            const bannerData = data as BannerData | null;
            if (bannerData) {
              setFormData(prev => ({
                ...prev,
                name: bannerData.title || '',
                website: bannerData.website || '',
                bannerUrl: bannerData.image_url || '',
              }));
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

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
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
              name: formData.name, website: formData.website, banner_url: formData.bannerUrl || null,
              season: formData.season || 'Season 17', part: formData.part || 'Part 1',
              exp_rate: formData.expRate || '1000x', open_date: formData.openDate || null,
              features: formData.features ? formData.features.split(',').map(f => f.trim()) : [],
              long_description: formData.longDescription || null,
              discord_link: formData.discordLink || null,
              logo_url: formData.logoUrl || null,
            })
            .eq('id', listing.id).eq('user_id', user.id));
          break;
        case 'advertisement':
          ({ error } = await supabase
            .from('advertisements')
            .update({
              title: formData.title || formData.name,
              description: formData.description,
              price_usd: formData.priceUsd ? parseFloat(formData.priceUsd) : null,
              website: formData.website,
              banner_url: formData.bannerUrl || null,
              short_description: formData.shortDescription || null,
              full_description: formData.fullDescription || null,
              video_url: formData.videoUrl || null,
              delivery_time: formData.deliveryTime || null,
              price_range: formData.priceRange || null,
              location: formData.location || null,
              experience_level: formData.experienceLevel || null,
              supported_seasons: formData.supportedSeasons || null,
              discord_link: formData.discordLink || null,
              tags: selectedTags.length > 0 ? selectedTags : null,
              category: formData.category ? (formData.category as SellerCategory) : null,
            })
            .eq('id', listing.id).eq('user_id', user.id));
          break;
        case 'text_server':
          ({ error } = await supabase
            .from('premium_text_servers')
            .update({
              name: formData.name, website: formData.website,
              exp_rate: formData.expRate || '1000x', version: formData.season || 'S17',
              open_date: formData.openDate || null,
            })
            .eq('id', listing.id).eq('user_id', user.id));
          break;
        case 'promo':
          ({ error } = await supabase
            .from('rotating_promos')
            .update({
              text: formData.text, highlight: formData.highlight, link: formData.link || null,
            })
            .eq('id', listing.id).eq('user_id', user.id));
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
      toast({ title: 'Draft Updated', description: 'Your draft has been updated successfully.' });
      onSuccess();
    } catch (error: unknown) {
      console.error('Failed to update draft:', error);
      const message = error instanceof Error ? error.message : 'Failed to update draft.';
      toast({ title: 'Error', description: message, variant: 'destructive' });
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
              <Input id="title" value={formData.title} onChange={(e) => handleChange('title', e.target.value)} placeholder="Your advertisement title" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Brief Description</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => handleChange('description', e.target.value)} placeholder="Brief description" rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priceUsd">Price (USD)</Label>
              <Input
                id="priceUsd"
                type="number"
                step="0.01"
                min="0"
                value={formData.priceUsd}
                onChange={(e) => handleChange('priceUsd', e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website *</Label>
              <Input id="website" value={formData.website} onChange={(e) => handleChange('website', e.target.value)} placeholder="example.com" required />
            </div>
            <div className="space-y-2">
              <Label>Banner Image</Label>
              <ImageUpload bucket="ad-banners" userId={user?.id || ''} onUploadComplete={(url) => handleChange('bannerUrl', url)} currentImageUrl={formData.bannerUrl} maxSizeMB={5} aspectRatio="468x60" />
            </div>
            {/* Extra fields */}
            <div className="space-y-2">
              <Label htmlFor="shortDescription">Short Description</Label>
              <Textarea id="shortDescription" value={formData.shortDescription} onChange={(e) => handleChange('shortDescription', e.target.value)} placeholder="A brief summary" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Full Description</Label>
              <Suspense fallback={<div className="h-[200px] rounded-md border border-input bg-muted/30 animate-pulse" />}>
                <RichTextEditor content={formData.fullDescription} onChange={(html) => handleChange('fullDescription', html)} placeholder="Detailed description..." />
              </Suspense>
            </div>
            <div className="space-y-2">
              <Label htmlFor="videoUrl">Video URL</Label>
              <Input id="videoUrl" value={formData.videoUrl} onChange={(e) => handleChange('videoUrl', e.target.value)} placeholder="https://youtube.com/watch?v=..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discordLink">Discord Link</Label>
              <Input id="discordLink" value={formData.discordLink} onChange={(e) => handleChange('discordLink', e.target.value)} placeholder="https://discord.gg/..." />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="deliveryTime">Delivery Time</Label>
                <Input id="deliveryTime" value={formData.deliveryTime} onChange={(e) => handleChange('deliveryTime', e.target.value)} placeholder="24 hours" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceRange">Price Range</Label>
                <Input id="priceRange" value={formData.priceRange} onChange={(e) => handleChange('priceRange', e.target.value)} placeholder="$50 - $200" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={formData.location} onChange={(e) => handleChange('location', e.target.value)} placeholder="Europe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experienceLevel">Experience Level</Label>
                <Select value={formData.experienceLevel} onValueChange={(v) => handleChange('experienceLevel', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="expert">Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {tagOptions.map(tag => (
                  <Badge key={tag} variant={selectedTags.includes(tag) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggleTag(tag)}>{tag}</Badge>
                ))}
              </div>
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
              <Input id="name" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="Your server name" required />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-2">
                <Label htmlFor="season">Season</Label>
                <Input id="season" value={formData.season} onChange={(e) => handleChange('season', e.target.value)} placeholder="Season 17" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="part">Part</Label>
                <Input id="part" value={formData.part} onChange={(e) => handleChange('part', e.target.value)} placeholder="Part 1" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expRate">EXP Rate</Label>
                <Input id="expRate" value={formData.expRate} onChange={(e) => handleChange('expRate', e.target.value)} placeholder="1000x" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="openDate">Opening Date</Label>
              <Input id="openDate" type="date" value={formData.openDate} onChange={(e) => handleChange('openDate', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website *</Label>
              <Input id="website" value={formData.website} onChange={(e) => handleChange('website', e.target.value)} placeholder="yourserver.com" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="discordLink">Discord Link</Label>
              <Input id="discordLink" value={formData.discordLink} onChange={(e) => handleChange('discordLink', e.target.value)} placeholder="https://discord.gg/..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="features">Features (comma-separated)</Label>
              <Input id="features" value={formData.features} onChange={(e) => handleChange('features', e.target.value)} placeholder="PVP Focused, Custom Wings" />
            </div>
            <div className="space-y-2">
              <Label>Server Banner</Label>
              <ImageUpload bucket="server-banners" userId={user?.id || ''} onUploadComplete={(url) => handleChange('bannerUrl', url)} currentImageUrl={formData.bannerUrl} maxSizeMB={5} aspectRatio="728x90" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logoUrl">Logo Image URL</Label>
              <Input id="logoUrl" value={formData.logoUrl} onChange={(e) => handleChange('logoUrl', e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Long Description</Label>
              <Suspense fallback={<div className="h-[200px] rounded-md border border-input bg-muted/30 animate-pulse" />}>
                <RichTextEditor content={formData.longDescription} onChange={(html) => handleChange('longDescription', html)} placeholder="Detailed server description..." />
              </Suspense>
            </div>
          </>
        );

      case 'text_server':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="name">Server Name *</Label>
              <Input id="name" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="Your server name" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="season">Version</Label>
                <Input id="season" value={formData.season} onChange={(e) => handleChange('season', e.target.value)} placeholder="S17" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expRate">EXP Rate</Label>
                <Input id="expRate" value={formData.expRate} onChange={(e) => handleChange('expRate', e.target.value)} placeholder="1000x" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website *</Label>
              <Input id="website" value={formData.website} onChange={(e) => handleChange('website', e.target.value)} placeholder="yourserver.com" required />
            </div>
          </>
        );

      case 'promo':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="highlight">Highlight Text</Label>
              <Input id="highlight" value={formData.highlight} onChange={(e) => handleChange('highlight', e.target.value)} placeholder="20% OFF" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="text">Promotional Text *</Label>
              <Input id="text" value={formData.text} onChange={(e) => handleChange('text', e.target.value)} placeholder="Get 20% off!" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link">Link</Label>
              <Input id="link" value={formData.link} onChange={(e) => handleChange('link', e.target.value)} placeholder="https://..." />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Draft</DialogTitle>
          <DialogDescription>Update your {slotConfig?.name || 'listing'} draft before publishing.</DialogDescription>
        </DialogHeader>
        {fetching ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {renderFormFields()}
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>) : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
