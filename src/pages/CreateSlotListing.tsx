import { useState, useEffect } from 'react';
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

type SellerCategory = Database["public"]["Enums"]["seller_category"];

interface UserListing {
  id: string;
  title: string;
  category: SellerCategory;
}

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
    // Slot 7 specific
    expiresAt: '',
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

  // Fetch user's PUBLISHED and ACTIVE listings for Slot 7 (Partner Discounts)
  // Slot 7 is a promotional add-on ONLY - must link to existing listing
  useEffect(() => {
    const fetchUserListings = async () => {
      if (!user || slotId !== 7) return;
      
      setLoadingListings(true);
      try {
        // Marketplace categories (from seller_category enum)
        const marketplaceCategories = [
          'websites', 'server_files', 'antihack', 'launchers', 'custom_scripts',
          'mu_websites', 'mu_server_files', 'mu_protection', 'mu_app_developer',
          'mu_launchers', 'mu_installers', 'mu_hosting'
        ] as const;
        
        // Services categories
        const servicesCategories = [
          'server_development', 'design_branding', 'skins_customization',
          'media', 'promotion', 'streaming', 'content_creators', 'event_master', 'marketing_growth'
        ] as const;
        
        const categoriesToFetch: SellerCategory[] = selectedListingType === 'marketplace' 
          ? [...marketplaceCategories] 
          : [...servicesCategories];
        
        // ONLY fetch published AND active listings that belong to user
        const { data, error } = await supabase
          .from('listings')
          .select('id, title, category, is_published, is_active, user_id')
          .eq('user_id', user.id)
          .eq('is_published', true)
          .eq('is_active', true)
          .in('category', categoriesToFetch);
        
        if (error) throw error;
        
        // Double-check ownership on client side for extra safety
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
              banner_url: slotId === 6 ? null : formData.bannerUrl,
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
          // Slot 7 - Partner Discounts: PROMOTIONAL ADD-ON ONLY
          // Must ALWAYS attach to an existing marketplace/services listing
          if (slotId === 7) {
            // Validate required fields
            if (!selectedListingId) {
              throw new Error('Please select a listing to promote');
            }
            
            if (!formData.text?.trim()) {
              throw new Error('Promotional text is required');
            }
            
            // Verify the listing exists, is published, and belongs to user
            const { data: verifiedListing, error: verifyError } = await supabase
              .from('listings')
              .select('id, title, user_id, is_published, is_active, website')
              .eq('id', selectedListingId)
              .eq('user_id', user.id)
              .eq('is_published', true)
              .eq('is_active', true)
              .single();
            
            if (verifyError || !verifiedListing) {
              throw new Error('Selected listing is not valid, not published, or does not belong to you');
            }
            
            // Build link: use custom link if provided, otherwise link to listing page
            const promoLink = formData.link?.trim() || `/listing/${selectedListingId}`;
            
            result = await supabase
              .from('rotating_promos')
              .insert({
                user_id: user.id,
                listing_id: selectedListingId,
                listing_type: selectedListingType,
                text: formData.text.trim(),
                highlight: formData.highlight?.trim() || '',
                link: promoLink,
                promo_type: 'discount',
                slot_id: slotId,
                is_active: false, // Default to inactive - admin can approve/enable
                expires_at: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
              })
              .select()
              .single();
          } else {
            // Slot 8 - Server Events (standalone promo, no listing required)
            result = await supabase
              .from('rotating_promos')
              .insert({
                user_id: user.id,
                text: formData.text || formData.name,
                highlight: formData.highlight,
                link: formData.link || formData.website,
                promo_type: 'event',
                slot_id: slotId,
                is_active: true,
                expires_at: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
              })
              .select()
              .single();
          }
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
        // Slot 7 - Partner Discounts (linked to existing listing)
        if (slotId === 7) {
          return (
            <>
              <div>
                <Label className="text-base font-semibold mb-3 block">
                  What type of listing are you promoting?
                </Label>
                <RadioGroup
                  value={selectedListingType}
                  onValueChange={(value: 'marketplace' | 'services') => {
                    setSelectedListingType(value);
                    setSelectedListingId(''); // Reset selection when type changes
                  }}
                  className="flex gap-4"
                >
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
                  <div className="flex items-center gap-2 py-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading your listings...
                  </div>
                ) : userListings.length === 0 ? (
                  <div className="py-2">
                    <p className="text-sm text-muted-foreground mb-2">
                      You don't have any published {selectedListingType} listings yet.
                    </p>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(selectedListingType === 'marketplace' ? '/marketplace' : '/services')}
                    >
                      Create a {selectedListingType} listing first
                    </Button>
                  </div>
                ) : (
                  <Select value={selectedListingId} onValueChange={setSelectedListingId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a listing to promote" />
                    </SelectTrigger>
                    <SelectContent>
                      {userListings.map((listing) => (
                        <SelectItem key={listing.id} value={listing.id}>
                          {listing.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <Label htmlFor="text">Promotional Text *</Label>
                <Input
                  id="text"
                  value={formData.text}
                  onChange={(e) => handleChange('text', e.target.value)}
                  placeholder="e.g., VPS Hosting Special, 50% Off Server Files"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  A short title for your promotion
                </p>
              </div>

              <div>
                <Label htmlFor="highlight">Highlight Text *</Label>
                <Input
                  id="highlight"
                  value={formData.highlight}
                  onChange={(e) => handleChange('highlight', e.target.value)}
                  placeholder="e.g., -20%, Limited Time, NEW"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  A short badge/highlight shown prominently
                </p>
              </div>

              <div>
                <Label htmlFor="link">Link URL (optional)</Label>
                <Input
                  id="link"
                  value={formData.link}
                  onChange={(e) => handleChange('link', e.target.value)}
                  placeholder="https://yoursite.com/promo"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Custom link for the promotion. If left empty, links to the listing.
                </p>
              </div>

              <div>
                <Label htmlFor="expiresAt">Expiration Date (optional)</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => handleChange('expiresAt', e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  When should this promotion stop showing?
                </p>
              </div>
            </>
          );
        }
        
        // Slot 8 - Server Events (standalone promo)
        return (
          <>
            <div>
              <Label htmlFor="text">Event Name *</Label>
              <Input
                id="text"
                value={formData.text}
                onChange={(e) => handleChange('text', e.target.value)}
                placeholder="Castle Siege Event"
                required
              />
            </div>
            <div>
              <Label htmlFor="highlight">Event Time/Info *</Label>
              <Input
                id="highlight"
                value={formData.highlight}
                onChange={(e) => handleChange('highlight', e.target.value)}
                placeholder="Tonight 8PM"
                required
              />
            </div>
            <div>
              <Label htmlFor="link">Event Link URL</Label>
              <Input
                id="link"
                value={formData.link}
                onChange={(e) => handleChange('link', e.target.value)}
                placeholder="https://yourserver.com/events"
              />
            </div>
            <div>
              <Label htmlFor="expiresAt">Event End Date</Label>
              <Input
                id="expiresAt"
                type="date"
                value={formData.expiresAt}
                onChange={(e) => handleChange('expiresAt', e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                The promotion will auto-hide after this date
              </p>
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
