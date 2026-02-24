import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { SLOT_CONFIG, getSlotConfig } from '@/lib/slotConfig';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ImageUpload } from '@/components/upload/ImageUpload';
import { Badge } from '@/components/ui/badge';

const RichTextEditor = lazy(() => import('@/components/editor/RichTextEditor'));

type SellerCategory = Database["public"]["Enums"]["seller_category"];

interface UserListing {
  id: string;
  title: string;
  category: SellerCategory;
}

const adCategoryOptions = [
  { value: 'websites', label: 'Websites' },
  { value: 'server_files', label: 'Server Files' },
  { value: 'antihack', label: 'Antihack' },
  { value: 'launchers', label: 'Launchers' },
  { value: 'custom_scripts', label: 'Custom Scripts' },
  { value: 'mu_websites', label: 'MU Websites' },
  { value: 'mu_server_files', label: 'MU Server Files' },
  { value: 'mu_protection', label: 'MU Protection' },
  { value: 'mu_hosting', label: 'MU Hosting' },
];

const serviceCategoryOptions = [
  { value: 'server_development', label: 'Server Development' },
  { value: 'design_branding', label: 'Design & Branding' },
  { value: 'skins_customization', label: 'Skins & Customization' },
  { value: 'media', label: 'Media' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'streaming', label: 'Streaming' },
  { value: 'content_creators', label: 'Content Creators' },
  { value: 'marketing_growth', label: 'Marketing & Growth' },
];

const tagOptions = ['MU Online', 'Season 17', 'Season 19', 'Season 20', 'PVP', 'PVE', 'Custom', 'Premium', 'Free', 'Long-term'];

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
  const [accessReady, setAccessReady] = useState(slotId === 6);
  const [accessChecking, setAccessChecking] = useState(false);
  
  // Slot 7 specific state
  const [userListings, setUserListings] = useState<UserListing[]>([]);
  const [selectedListingType, setSelectedListingType] = useState<'marketplace' | 'services'>('marketplace');
  const [selectedListingId, setSelectedListingId] = useState<string>('');
  const [loadingListings, setLoadingListings] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
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
    // Server product page fields
    longDescription: '',
    discordLink: '',
    logoUrl: '',
    // Promo specific
    highlight: '',
    text: '',
    link: '',
    // Slot 7 specific
    expiresAt: '',
    // Ad extra fields
    shortDescription: '',
    fullDescription: '',
    videoUrl: '',
    deliveryTime: '',
    priceRange: '',
    location: '',
    experienceLevel: '',
    supportedSeasons: '',
    category: '',
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user || !slotConfig) return;
      
      // Slot 6 is free - no purchase required
      if (slotId === 6) {
        setAccessReady(true);
        setAccessChecking(false);
        return;
      }

      setAccessChecking(true);
      setAccessReady(false);

      const nowIso = new Date().toISOString();

      const hasActivePurchase = async () => {
        const { data } = await supabase
          .from('slot_purchases')
          .select('id')
          .eq('user_id', user.id)
          .eq('slot_id', slotId)
          .eq('is_active', true)
          .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
          .maybeSingle();

        return !!data;
      };

      const activeNow = await hasActivePurchase();
      if (activeNow) {
        setAccessReady(true);
        setAccessChecking(false);
        return;
      }
      
      if (!paymentSuccess) {
        toast({
          title: 'Package Required',
          description: 'Please purchase a package to create a listing in this slot.',
          variant: 'destructive',
        });
        navigate('/pricing');
        setAccessChecking(false);
        return;
      }

      toast({
        title: 'Activating Purchase',
        description: 'Payment is processing. This usually takes a few seconds.',
      });

      const delays = [800, 1500, 2500, 4000];
      for (const delay of delays) {
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
        const activeAfterDelay = await hasActivePurchase();
        if (activeAfterDelay) {
          setAccessReady(true);
          setAccessChecking(false);
          return;
        }
      }

      setAccessChecking(false);
      toast({
        title: 'Still Processing',
        description: 'Your payment is still being confirmed. Please wait a moment and try again.',
        variant: 'destructive',
      });
    };
    if (user && !authLoading) checkAccess();
  }, [user, authLoading, slotId, slotConfig, paymentSuccess, navigate, toast]);

  useEffect(() => {
    if (paymentSuccess) {
      toast({ title: 'Payment Successful!', description: 'You can now create your listing.' });
    }
  }, [paymentSuccess, toast]);

  useEffect(() => {
    const fetchUserListings = async () => {
      if (!user || slotId !== 7) return;
      setLoadingListings(true);
      try {
        const marketplaceCategories = ['websites', 'server_files', 'antihack', 'launchers', 'custom_scripts', 'mu_websites', 'mu_server_files', 'mu_protection', 'mu_app_developer', 'mu_launchers', 'mu_installers', 'mu_hosting'] as const;
        const servicesCategories = ['server_development', 'design_branding', 'skins_customization', 'media', 'promotion', 'streaming', 'content_creators', 'event_master', 'marketing_growth'] as const;
        const categoriesToFetch = (selectedListingType === 'marketplace' ? [...marketplaceCategories] : [...servicesCategories]) as unknown as SellerCategory[];
        const { data, error } = await supabase
          .from('listings')
          .select('id, title, category, is_published, is_active, user_id')
          .eq('user_id', user.id)
          .eq('is_published', true)
          .eq('is_active', true)
          .in('category', categoriesToFetch);
        if (error) throw error;
        const ownedListings = (data || []).filter(l => l.user_id === user.id);
        setUserListings(ownedListings);
      } catch (error) {
        console.error('Error fetching user listings:', error);
        setUserListings([]);
      } finally {
        setLoadingListings(false);
      }
    };
    fetchUserListings();
  }, [user, slotId, selectedListingType]);

  if (!slotConfig) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8 text-center">
          <h1 className="text-2xl font-bold text-destructive">Invalid Slot</h1>
          <p className="text-muted-foreground mt-2">The requested slot type is not valid.</p>
          <Button onClick={() => navigate('/pricing')} className="mt-4">Go to Pricing</Button>
        </div>
      </div>
    );
  }

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 60);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (slotId !== 6 && !accessReady) {
      toast({
        title: 'Not Ready Yet',
        description: 'Your package is still being activated. Please wait a few seconds and try again.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    if (slotConfig.table === 'premium_banners' && !formData.bannerUrl) {
      toast({
        title: 'Banner Required',
        description: 'Please upload a banner image before submitting.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      let result;

      switch (slotConfig.table) {
        case 'advertisements': {
          const adTitle = formData.title || formData.name;
          result = await supabase
            .from('advertisements')
            .insert({
              user_id: user.id,
              title: adTitle,
              description: formData.description,
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
              website: formData.website,
              banner_url: formData.bannerUrl,
              ad_type: type === 'marketplace' ? 'marketplace' : 'services',
              slug: generateSlug(adTitle),
              slot_id: slotId,
              is_active: true,
              vip_level: 'gold',
            })
            .select()
            .single();
          break;
        }

        case 'servers':
          result = await supabase
            .from('servers')
            .insert({
              user_id: user.id,
              name: formData.name,
              website: formData.website,
              logo_url: formData.logoUrl || null,
              banner_url: slotId === 6 ? null : (formData.bannerUrl || null),
              season: formData.season || 'Season 17',
              part: formData.part || 'Part 1',
              exp_rate: formData.expRate || '1000x',
              open_date: formData.openDate || null,
              features: formData.features ? formData.features.split(',').map(f => f.trim()) : [],
              long_description: formData.longDescription || null,
              discord_link: formData.discordLink || null,
              slug: generateSlug(formData.name),
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
          {
            const maxAllowed = getSlotConfig(5)?.maxListings ?? 3;
            const { count, error: countError } = await supabase
              .from('premium_banners')
              .select('id', { count: 'exact', head: true })
              .eq('slot_id', 5)
              .eq('is_active', true);

            if (countError) throw countError;
            const activeCount = count ?? 0;
            if (activeCount >= maxAllowed) {
              let nextAvailableAt: string | null = null;
              const nowIso = new Date().toISOString();
              const { data: nextPurchase } = await supabase
                .from('slot_purchases')
                .select('expires_at')
                .eq('slot_id', 5)
                .eq('is_active', true)
                .not('expires_at', 'is', null)
                .gt('expires_at', nowIso)
                .order('expires_at', { ascending: true })
                .limit(1)
                .maybeSingle();

              nextAvailableAt = nextPurchase?.expires_at ?? null;

              if (nextAvailableAt) {
                const nextLabel = new Date(nextAvailableAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
                throw new Error(`Main Banner is currently full (${activeCount}/${maxAllowed} active). Next slot may open on ${nextLabel}.`);
              }
              throw new Error(`Main Banner is currently full (${activeCount}/${maxAllowed} active). Please try again later.`);
            }
          }

          result = await supabase
            .from('premium_banners')
            .insert({
              user_id: user.id,
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
          if (slotId === 7) {
            if (!selectedListingId) throw new Error('Please select a listing to promote');
            if (!formData.text?.trim()) throw new Error('Promotional text is required');
            const { data: verifiedListing, error: verifyError } = await supabase
              .from('listings')
              .select('id, title, user_id, is_published, is_active, website')
              .eq('id', selectedListingId)
              .eq('user_id', user.id)
              .eq('is_published', true)
              .eq('is_active', true)
              .single();
            if (verifyError || !verifiedListing) throw new Error('Selected listing is not valid');
            const promoLink = formData.link?.trim() || `/listing/${selectedListingId}`;
            result = await supabase
              .from('rotating_promos')
              .insert({
                user_id: user.id, listing_id: selectedListingId, listing_type: selectedListingType,
                text: formData.text.trim(), highlight: formData.highlight?.trim() || '',
                link: promoLink, promo_type: 'discount', slot_id: slotId, is_active: false,
                expires_at: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
              })
              .select()
              .single();
          } else {
            result = await supabase
              .from('rotating_promos')
              .insert({
                user_id: user.id, text: formData.text || formData.name,
                highlight: formData.highlight, link: formData.link || formData.website,
                promo_type: 'event', slot_id: slotId, is_active: true,
                expires_at: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
              })
              .select()
              .single();
          }
          break;

        default:
          throw new Error('Unknown listing type');
      }

      if (result?.error) throw result.error;

      toast({ title: 'Listing Created!', description: 'Your listing is now live on the homepage.' });
      navigate('/dashboard');
    } catch (error: unknown) {
      console.error('Failed to create listing:', error);
      const message = error instanceof Error ? error.message : 'Failed to create listing.';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderAdExtraFields = () => {
    const categoryOpts = type === 'marketplace' ? adCategoryOptions : serviceCategoryOptions;
    return (
      <>
        <div>
          <Label htmlFor="category">Category</Label>
          <Select value={formData.category} onValueChange={(v) => handleChange('category', v)}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {categoryOpts.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="shortDescription">Short Description</Label>
          <Textarea
            id="shortDescription"
            value={formData.shortDescription}
            onChange={(e) => handleChange('shortDescription', e.target.value)}
            placeholder="A brief summary shown on the listing card"
            rows={2}
          />
        </div>
        <div>
          <Label>Full Description</Label>
          <Suspense fallback={<div className="h-[200px] rounded-md border border-input bg-muted/30 animate-pulse" />}>
            <RichTextEditor
              content={formData.fullDescription}
              onChange={(html) => handleChange('fullDescription', html)}
              placeholder="Write a detailed description with formatting..."
            />
          </Suspense>
        </div>
        <div>
          <Label htmlFor="videoUrl">Video URL (YouTube/Vimeo)</Label>
          <Input
            id="videoUrl"
            value={formData.videoUrl}
            onChange={(e) => handleChange('videoUrl', e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
          />
        </div>
        <div>
          <Label htmlFor="discordLink">Discord Link</Label>
          <Input
            id="discordLink"
            value={formData.discordLink}
            onChange={(e) => handleChange('discordLink', e.target.value)}
            placeholder="https://discord.gg/..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="deliveryTime">Delivery Time</Label>
            <Input
              id="deliveryTime"
              value={formData.deliveryTime}
              onChange={(e) => handleChange('deliveryTime', e.target.value)}
              placeholder="e.g., 24 hours"
            />
          </div>
          <div>
            <Label htmlFor="priceRange">Price Range</Label>
            <Input
              id="priceRange"
              value={formData.priceRange}
              onChange={(e) => handleChange('priceRange', e.target.value)}
              placeholder="e.g., $50 - $200"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="e.g., Europe"
            />
          </div>
          <div>
            <Label htmlFor="experienceLevel">Experience Level</Label>
            <Select value={formData.experienceLevel} onValueChange={(v) => handleChange('experienceLevel', v)}>
              <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="expert">Expert</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {type === 'services' && (
          <div>
            <Label htmlFor="supportedSeasons">Supported Seasons</Label>
            <Input
              id="supportedSeasons"
              value={formData.supportedSeasons}
              onChange={(e) => handleChange('supportedSeasons', e.target.value)}
              placeholder="e.g., Season 17, Season 19, Season 20"
            />
          </div>
        )}
        <div>
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {tagOptions.map(tag => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </>
    );
  };

  const renderFormFields = () => {
    switch (slotConfig.table) {
      case 'advertisements':
        return (
          <>
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={formData.title} onChange={(e) => handleChange('title', e.target.value)} placeholder="Your advertisement title" required />
            </div>
            <div>
              <Label htmlFor="description">Brief Description</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => handleChange('description', e.target.value)} placeholder="Brief description of your product/service" rows={2} />
            </div>
            <div>
              <Label htmlFor="website">Website *</Label>
              <Input id="website" value={formData.website} onChange={(e) => handleChange('website', e.target.value)} placeholder="example.com" required />
            </div>
            <div>
              <Label>Banner Image</Label>
              {user && (
                <ImageUpload
                  bucket="ad-banners"
                  userId={user.id}
                  onUploadComplete={(url) => handleChange('bannerUrl', url)}
                  currentImageUrl={formData.bannerUrl}
                  aspectRatio="268x60"
                />
              )}
            </div>
            {renderAdExtraFields()}
          </>
        );

      case 'servers':
        return (
          <>
            <div>
              <Label htmlFor="name">Server Name *</Label>
              <Input id="name" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="Your server name" required />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="season">Season *</Label>
                <Input id="season" value={formData.season} onChange={(e) => handleChange('season', e.target.value)} placeholder="Season 17" required />
              </div>
              <div>
                <Label htmlFor="part">Part</Label>
                <Input id="part" value={formData.part} onChange={(e) => handleChange('part', e.target.value)} placeholder="Part 1-2" />
              </div>
              <div>
                <Label htmlFor="expRate">EXP Rate *</Label>
                <Input id="expRate" value={formData.expRate} onChange={(e) => handleChange('expRate', e.target.value)} placeholder="1000x" required />
              </div>
            </div>
            <div>
              <Label htmlFor="openDate">Opening Date</Label>
              <Input id="openDate" type="date" value={formData.openDate} onChange={(e) => handleChange('openDate', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="website">Website *</Label>
              <Input id="website" value={formData.website} onChange={(e) => handleChange('website', e.target.value)} placeholder="yourserver.com" required />
            </div>
            <div>
              <Label htmlFor="discordLink">Discord Link</Label>
              <Input id="discordLink" value={formData.discordLink} onChange={(e) => handleChange('discordLink', e.target.value)} placeholder="https://discord.gg/..." />
            </div>
            {slotId !== 6 && (
              <div>
                <Label htmlFor="features">Features (comma-separated)</Label>
                <Input
                  id="features"
                  value={formData.features}
                  onChange={(e) => handleChange('features', e.target.value)}
                  placeholder="PVP Focused, Custom Wings, Long-term"
                />
              </div>
            )}
            {slotId !== 6 && (
              <div>
                <Label>Banner Image</Label>
                {user && (
                  <ImageUpload
                    bucket="server-banners"
                    userId={user.id}
                    onUploadComplete={(url) => handleChange('bannerUrl', url)}
                    currentImageUrl={formData.bannerUrl}
                    aspectRatio="468x60"
                  />
                )}
              </div>
            )}
            {slotId !== 6 && (
              <div>
                <Label htmlFor="logoUrl">Logo Image URL</Label>
                <Input id="logoUrl" value={formData.logoUrl} onChange={(e) => handleChange('logoUrl', e.target.value)} placeholder="https://your-image-url.com/logo.png" />
              </div>
            )}
            {slotId !== 6 && (
              <div>
                <Label>Long Description</Label>
                <Suspense fallback={<div className="h-[200px] rounded-md border border-input bg-muted/30 animate-pulse" />}>
                  <RichTextEditor
                    content={formData.longDescription}
                    onChange={(html) => handleChange('longDescription', html)}
                    placeholder="Write a detailed description of your server..."
                  />
                </Suspense>
              </div>
            )}
          </>
        );

      case 'premium_text_servers':
        return (
          <>
            <div>
              <Label htmlFor="name">Server Name *</Label>
              <Input id="name" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="YOURSERVER.COM" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="expRate">EXP Rate *</Label>
                <Input id="expRate" value={formData.expRate} onChange={(e) => handleChange('expRate', e.target.value)} placeholder="x1000" required />
              </div>
              <div>
                <Label htmlFor="season">Version *</Label>
                <Input id="season" value={formData.season} onChange={(e) => handleChange('season', e.target.value)} placeholder="S17" required />
              </div>
            </div>
            <div>
              <Label htmlFor="openDate">Opening Date</Label>
              <Input id="openDate" value={formData.openDate} onChange={(e) => handleChange('openDate', e.target.value)} placeholder="Open 21.01" />
            </div>
            <div>
              <Label htmlFor="website">Website *</Label>
              <Input id="website" value={formData.website} onChange={(e) => handleChange('website', e.target.value)} placeholder="yourserver.com" required />
            </div>
          </>
        );

      case 'premium_banners':
        return (
          <>
            <div>
              <Label htmlFor="name">Server/Site Name *</Label>
              <Input id="name" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} placeholder="Your server or site name" required />
            </div>
            <div>
              <Label htmlFor="website">Website *</Label>
              <Input id="website" value={formData.website} onChange={(e) => handleChange('website', e.target.value)} placeholder="yoursite.com" required />
            </div>
            <div>
              <Label>Banner Image (Required) *</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Recommended size: 800x200 pixels, landscape format
              </p>
              {user && (
                <ImageUpload
                  bucket="banners"
                  userId={user.id}
                  onUploadComplete={(url) => handleChange('bannerUrl', url)}
                  currentImageUrl={formData.bannerUrl}
                  aspectRatio="800x200"
                />
              )}
            </div>
          </>
        );

      case 'rotating_promos':
        if (slotId === 7) {
          return (
            <>
              <div>
                <Label className="text-base font-semibold mb-3 block">What type of listing are you promoting?</Label>
                <RadioGroup value={selectedListingType} onValueChange={(value: 'marketplace' | 'services') => { setSelectedListingType(value); setSelectedListingId(''); }} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="marketplace" id="marketplace" />
                    <Label htmlFor="marketplace" className="cursor-pointer">Marketplace</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="services" id="services" />
                    <Label htmlFor="services" className="cursor-pointer">Services</Label>
                  </div>
                </RadioGroup>
              </div>
              <div>
                <Label htmlFor="listing">Select Your Listing *</Label>
                {loadingListings ? (
                  <div className="flex items-center gap-2 py-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading your listings...</div>
                ) : userListings.length === 0 ? (
                  <div className="py-2">
                    <p className="text-sm text-muted-foreground mb-2">You don't have any published {selectedListingType} listings yet.</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => navigate('/marketplace')}>Create a {selectedListingType} listing first</Button>
                  </div>
                ) : (
                  <Select value={selectedListingId} onValueChange={setSelectedListingId}>
                    <SelectTrigger><SelectValue placeholder="Select a listing to promote" /></SelectTrigger>
                    <SelectContent>{userListings.map(l => <SelectItem key={l.id} value={l.id}>{l.title}</SelectItem>)}</SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label htmlFor="text">Promotional Text *</Label>
                <Input id="text" value={formData.text} onChange={(e) => handleChange('text', e.target.value)} placeholder="e.g., VPS Hosting Special, 50% Off" required />
              </div>
              <div>
                <Label htmlFor="highlight">Highlight Text *</Label>
                <Input id="highlight" value={formData.highlight} onChange={(e) => handleChange('highlight', e.target.value)} placeholder="e.g., -20%, Limited Time" required />
              </div>
              <div>
                <Label htmlFor="link">Link URL (optional)</Label>
                <Input id="link" value={formData.link} onChange={(e) => handleChange('link', e.target.value)} placeholder="https://yoursite.com/promo" />
              </div>
              <div>
                <Label htmlFor="expiresAt">Expiration Date (optional)</Label>
                <Input id="expiresAt" type="date" value={formData.expiresAt} onChange={(e) => handleChange('expiresAt', e.target.value)} />
              </div>
            </>
          );
        }
        return (
          <>
            <div>
              <Label htmlFor="text">Event Name *</Label>
              <Input id="text" value={formData.text} onChange={(e) => handleChange('text', e.target.value)} placeholder="Castle Siege Event" required />
            </div>
            <div>
              <Label htmlFor="highlight">Event Time/Info *</Label>
              <Input id="highlight" value={formData.highlight} onChange={(e) => handleChange('highlight', e.target.value)} placeholder="Tonight 8PM" required />
            </div>
            <div>
              <Label htmlFor="link">Event Link URL</Label>
              <Input id="link" value={formData.link} onChange={(e) => handleChange('link', e.target.value)} placeholder="https://yourserver.com/events" />
            </div>
            <div>
              <Label htmlFor="expiresAt">Event End Date</Label>
              <Input id="expiresAt" type="date" value={formData.expiresAt} onChange={(e) => handleChange('expiresAt', e.target.value)} />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title={`Create ${slotConfig.name} - MU Online Hub`} description={`Create your ${slotConfig.name} listing`} />
      <Header />
      <div className="container py-8 max-w-2xl">
        <Button variant="ghost" className="mb-6" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div className="glass-card p-6">
          <h1 className="font-display text-2xl font-bold text-gradient-gold mb-2">Create {slotConfig.name}</h1>
          <p className="text-muted-foreground mb-6">{slotConfig.description}</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {renderFormFields()}

            <Button
              type="submit"
              disabled={loading || accessChecking || (slotId !== 6 && !accessReady)}
              className="w-full btn-fantasy-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : accessChecking || (slotId !== 6 && !accessReady) ? (
                'Waiting for activation...'
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
