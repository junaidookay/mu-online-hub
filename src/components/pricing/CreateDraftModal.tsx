import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check } from 'lucide-react';
import { getSlotConfig, SLOT_CONFIG } from '@/lib/slotConfig';
import { ImageUpload } from '@/components/upload/ImageUpload';

type SellerCategory = Database["public"]["Enums"]["seller_category"];

interface CreateDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  slotId: number;
  initialPackageId?: string;
  onSuccess: () => void;
}

interface UserListing {
  id: string;
  title: string;
  category: SellerCategory;
}

interface PricingPackage {
  id: string;
  name: string;
  price_cents: number;
  duration_days: number;
  slot_id: number | null;
  description: string | null;
}

export const CreateDraftModal = ({ isOpen, onClose, slotId, initialPackageId, onSuccess }: CreateDraftModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const slotConfig = getSlotConfig(slotId);

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'package' | 'details'>('package');
  
  // Package selection state
  const [packages, setPackages] = useState<PricingPackage[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  
  // Slot 7 specific state
  const [userListings, setUserListings] = useState<UserListing[]>([]);
  const [selectedListingType, setSelectedListingType] = useState<'marketplace' | 'services'>('marketplace');
  const [selectedListingId, setSelectedListingId] = useState<string>('');
  const [loadingListings, setLoadingListings] = useState(false);

  const [bannerAvailability, setBannerAvailability] = useState<{
    activeCount: number;
    maxAllowed: number;
    nextAvailableAt: string | null;
  } | null>(null);
  const [loadingBannerAvailability, setLoadingBannerAvailability] = useState(false);

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
    expiresAt: '',
  });

  // Fetch packages for this slot
  useEffect(() => {
    const fetchPackages = async () => {
      if (!isOpen) return;
      
      setLoadingPackages(true);
      try {
        const { data, error } = await supabase
          .from('pricing_packages')
          .select('id, name, price_cents, duration_days, slot_id, description')
          .eq('slot_id', slotId)
          .eq('is_active', true)
          .order('display_order', { ascending: true });
        
        if (error) throw error;
        setPackages(data || []);
        
        if (data && data.length > 0) {
          const initial = initialPackageId && data.some((p) => p.id === initialPackageId) ? initialPackageId : data[0].id;
          setSelectedPackageId(initial);
        }
      } catch (error) {
        console.error('Error fetching packages:', error);
      } finally {
        setLoadingPackages(false);
      }
    };
    
    fetchPackages();
  }, [isOpen, slotId, initialPackageId]);

  useEffect(() => {
    if (!isOpen) return;
    if (!initialPackageId) return;
    setSelectedPackageId(initialPackageId);
    setStep('details');
  }, [isOpen, initialPackageId]);

  useEffect(() => {
    const fetchBannerAvailability = async () => {
      if (!isOpen) return;
      if (slotId !== 5) {
        setBannerAvailability(null);
        return;
      }

      const maxAllowed = getSlotConfig(5)?.maxListings ?? 3;
      setLoadingBannerAvailability(true);
      try {
        const { count, error } = await supabase
          .from('premium_banners')
          .select('id', { count: 'exact', head: true })
          .eq('slot_id', 5)
          .eq('is_active', true);

        if (error) throw error;

        const activeCount = count ?? 0;
        let nextAvailableAt: string | null = null;

        if (activeCount >= maxAllowed) {
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
        }

        setBannerAvailability({ activeCount, maxAllowed, nextAvailableAt });
      } catch {
        setBannerAvailability(null);
      } finally {
        setLoadingBannerAvailability(false);
      }
    };

    fetchBannerAvailability();
  }, [isOpen, slotId]);

  // Fetch user's listings for Slot 7
  useEffect(() => {
    const fetchUserListings = async () => {
      if (!user || slotId !== 7) return;
      
      setLoadingListings(true);
      try {
        const marketplaceCategories = [
          'websites', 'server_files', 'antihack', 'launchers', 'custom_scripts',
          'mu_websites', 'mu_server_files', 'mu_protection', 'mu_app_developer',
          'mu_launchers', 'mu_installers', 'mu_hosting'
        ] as const;
        
        const servicesCategories = [
          'server_development', 'design_branding', 'skins_customization',
          'media', 'promotion', 'streaming', 'content_creators', 'event_master', 'marketing_growth'
        ] as const;
        
        const categoriesToFetch: SellerCategory[] = selectedListingType === 'marketplace' 
          ? [...marketplaceCategories] 
          : [...servicesCategories];
        
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

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('package');
      setSelectedPackageId('');
      setFormData({
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
        expiresAt: '',
      });
      setSelectedListingId('');
    }
  }, [isOpen]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatDateLabel = (iso: string) => {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const pickerOnly =
    typeof window !== 'undefined' &&
    typeof (HTMLInputElement.prototype as unknown as { showPicker?: () => void }).showPicker === 'function';

  const tryShowPicker = (input: HTMLInputElement) => {
    if (!pickerOnly) return;
    try {
      input.showPicker?.();
    } catch {
      return;
    }
  };

  const selectedPackage = packages.find(p => p.id === selectedPackageId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !slotConfig || !selectedPackageId) return;

    setLoading(true);

    try {
      let result;
      let draftId: string | null = null;
      const tableName = slotConfig.table;

      switch (tableName) {
        case 'advertisements':
          result = await supabase
            .from('advertisements')
            .insert({
              user_id: user.id,
              title: formData.title || formData.name,
              description: formData.description,
              website: formData.website,
              banner_url: formData.bannerUrl || null,
              ad_type: slotId === 1 ? 'marketplace' : 'services',
              slot_id: slotId,
              is_active: false,
              vip_level: 'none',
            })
            .select('id')
            .single();
          break;

        case 'servers':
          result = await supabase
            .from('servers')
            .insert({
              user_id: user.id,
              name: formData.name,
              website: formData.website,
              banner_url: formData.bannerUrl || null,
              season: formData.season || 'Season 17',
              part: formData.part || 'Part 1',
              exp_rate: formData.expRate || '1000x',
              open_date: formData.openDate || null,
              features: formData.features ? formData.features.split(',').map(f => f.trim()) : [],
              slot_id: slotId,
              is_active: false,
              is_premium: slotId === 3,
            })
            .select('id')
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
              is_active: false,
            })
            .select('id')
            .single();
          break;

        case 'premium_banners':
          if (!formData.name.trim()) {
            throw new Error('Banner title is required');
          }
          if (!formData.website.trim()) {
            throw new Error('Website is required');
          }
          if (!formData.bannerUrl) {
            throw new Error('Banner image is required');
          }

          result = await supabase
            .from('premium_banners')
            .insert({
              user_id: user.id,
              title: formData.name.trim(),
              website: formData.website.trim(),
              image_url: formData.bannerUrl,
              slot_id: slotId,
              is_active: false,
            })
            .select('id')
            .single();
          break;

        case 'rotating_promos':
          if (slotId === 7) {
            if (!selectedListingId) {
              throw new Error('Please select a listing to promote');
            }
            
            if (!formData.text?.trim()) {
              throw new Error('Promotional text is required');
            }
            
            const { data: verifiedListing, error: verifyError } = await supabase
              .from('listings')
              .select('id, title, user_id, is_published, is_active, website')
              .eq('id', selectedListingId)
              .eq('user_id', user.id)
              .eq('is_published', true)
              .eq('is_active', true)
              .single();
            
            if (verifyError || !verifiedListing) {
              throw new Error('Selected listing is not valid or does not belong to you');
            }
            
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
                is_active: false,
                expires_at: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
              })
              .select('id')
              .single();
          } else {
            result = await supabase
              .from('rotating_promos')
              .insert({
                user_id: user.id,
                text: formData.text || formData.name,
                highlight: formData.highlight,
                link: formData.link || formData.website,
                promo_type: 'event',
                slot_id: slotId,
                is_active: false,
                expires_at: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
              })
              .select('id')
              .single();
          }
          break;

        default:
          throw new Error('Unknown listing type');
      }

      if (result?.error) {
        throw result.error;
      }

      draftId = result?.data?.id;

      toast({
        title: 'Draft Created!',
        description: `Your draft has been saved. Go to your dashboard to pay and publish when ready.`,
      });

      onSuccess();
    } catch (error: unknown) {
      console.error('Failed to create draft:', error);
      const err = error && typeof error === 'object' ? (error as Record<string, unknown>) : null;
      const code = typeof err?.code === 'string' ? err.code : null;
      const message =
        error instanceof Error
          ? error.message
          : typeof err?.message === 'string'
            ? err.message
            : 'Failed to create draft.';
      const messageLower = message.toLowerCase();

      if (code === '42501' || messageLower.includes('row-level security policy')) {
        const name = slotConfig?.name ?? 'this listing';
        toast({
          title: 'Not Allowed',
          description: `You don’t have permission to create ${name}. Please contact support if you believe this is a mistake.`,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderPackageSelection = () => {
    if (loadingPackages) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      );
    }

    if (packages.length === 0) {
      return (
        <div className="text-center py-4 text-muted-foreground">
          No packages available for this slot.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {slotId === 5 && (
          <div
            className={`p-3 rounded-lg border ${
              bannerAvailability && bannerAvailability.activeCount >= bannerAvailability.maxAllowed
                ? 'bg-destructive/10 border-destructive/30'
                : 'bg-muted/30 border-border/50'
            }`}
          >
            {loadingBannerAvailability ? (
              <div className="text-sm text-muted-foreground">Checking Main Banner availability…</div>
            ) : bannerAvailability ? (
              bannerAvailability.activeCount >= bannerAvailability.maxAllowed ? (
                <div className="space-y-1">
                  <div className="text-sm font-medium">Main Banner is currently full</div>
                  <div className="text-sm text-muted-foreground">
                    Current active banners: {bannerAvailability.activeCount}/{bannerAvailability.maxAllowed}.
                  </div>
                  {bannerAvailability.nextAvailableAt ? (
                    <div className="text-sm text-muted-foreground">
                      One banner expires on {formatDateLabel(bannerAvailability.nextAvailableAt)}. You can buy a slot then.
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Please try again later.</div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Current active banners: {bannerAvailability.activeCount}/{bannerAvailability.maxAllowed}.
                </div>
              )
            ) : (
              <div className="text-sm text-muted-foreground">Availability info is temporarily unavailable.</div>
            )}
          </div>
        )}
        <Label className="text-base font-semibold">Select Duration Package</Label>
        <div className="grid gap-3">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              onClick={() => setSelectedPackageId(pkg.id)}
              className={`relative flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
                selectedPackageId === pkg.id
                  ? 'border-primary bg-primary/10 ring-1 ring-primary'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedPackageId === pkg.id ? 'border-primary bg-primary' : 'border-muted-foreground'
                }`}>
                  {selectedPackageId === pkg.id && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
                <div>
                  <div className="font-medium">{pkg.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {pkg.duration_days} days
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-primary">
                  ${(pkg.price_cents / 100).toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => setStep('details')}
            disabled={!selectedPackageId}
            className="flex-1"
          >
            Continue
          </Button>
        </div>
      </div>
    );
  };

  const renderFormFields = () => {
    if (!slotConfig) return null;

    switch (slotConfig.table) {
      case 'advertisements':
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
                placeholder="Brief description of your product/service"
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

      case 'servers':
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

      case 'premium_text_servers':
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

      case 'premium_banners':
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

      case 'rotating_promos':
        if (slotId === 7) {
          return (
            <>
              <div className="space-y-2">
                <Label>Listing Type</Label>
                <RadioGroup
                  value={selectedListingType}
                  onValueChange={(v) => {
                    setSelectedListingType(v as 'marketplace' | 'services');
                    setSelectedListingId('');
                  }}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="marketplace" id="marketplace" />
                    <Label htmlFor="marketplace">Marketplace</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="services" id="services" />
                    <Label htmlFor="services">Services</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Select Listing to Promote *</Label>
                {loadingListings ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading your listings...
                  </div>
                ) : userListings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No published listings found. Create and publish a listing first.
                  </p>
                ) : (
                  <Select value={selectedListingId} onValueChange={setSelectedListingId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a listing" />
                    </SelectTrigger>
                    <SelectContent>
                      {userListings.map(listing => (
                        <SelectItem key={listing.id} value={listing.id}>
                          {listing.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="text">Promotional Text *</Label>
                <Input
                  id="text"
                  value={formData.text}
                  onChange={(e) => handleChange('text', e.target.value)}
                  placeholder="20% off all services this week!"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="highlight">Highlight Badge</Label>
                <Input
                  id="highlight"
                  value={formData.highlight}
                  onChange={(e) => handleChange('highlight', e.target.value)}
                  placeholder="NEW, HOT, SALE..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expires At</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={formData.expiresAt}
                  className="cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                  onClick={(e) => tryShowPicker(e.currentTarget as HTMLInputElement)}
                  onFocus={(e) => tryShowPicker(e.currentTarget as HTMLInputElement)}
                  onKeyDown={(e) => {
                    if (pickerOnly && e.key !== 'Tab') e.preventDefault();
                  }}
                  onPaste={(e) => {
                    if (pickerOnly) e.preventDefault();
                  }}
                  onChange={(e) => handleChange('expiresAt', e.target.value)}
                />
              </div>
            </>
          );
        } else {
          return (
            <>
              <div className="space-y-2">
                <Label htmlFor="text">Event Text *</Label>
                <Input
                  id="text"
                  value={formData.text}
                  onChange={(e) => handleChange('text', e.target.value)}
                  placeholder="Castle Siege Tonight!"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="highlight">Highlight (time/date)</Label>
                <Input
                  id="highlight"
                  value={formData.highlight}
                  onChange={(e) => handleChange('highlight', e.target.value)}
                  placeholder="Tonight 8PM"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="link">Link</Label>
                <Input
                  id="link"
                  value={formData.link}
                  onChange={(e) => handleChange('link', e.target.value)}
                  placeholder="https://yourserver.com/events"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Event End Date</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={formData.expiresAt}
                  className="cursor-pointer [color-scheme:light] dark:[color-scheme:dark]"
                  onClick={(e) => tryShowPicker(e.currentTarget as HTMLInputElement)}
                  onFocus={(e) => tryShowPicker(e.currentTarget as HTMLInputElement)}
                  onKeyDown={(e) => {
                    if (pickerOnly && e.key !== 'Tab') e.preventDefault();
                  }}
                  onPaste={(e) => {
                    if (pickerOnly) e.preventDefault();
                  }}
                  onChange={(e) => handleChange('expiresAt', e.target.value)}
                />
              </div>
            </>
          );
        }

      default:
        return null;
    }
  };

  if (!slotConfig) return null;

  const slotName = SLOT_CONFIG[slotId as keyof typeof SLOT_CONFIG]?.name || 'Listing';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Draft: {slotName}</DialogTitle>
          <DialogDescription>
            {step === 'package' 
              ? 'Select a package for your listing. You can pay when you publish from your dashboard.'
              : 'Fill in the details for your draft.'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'package' ? (
          renderPackageSelection()
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Show selected package summary */}
            {selectedPackage && (
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{selectedPackage.name}</span>
                  <span className="font-bold text-primary">
                    ${(selectedPackage.price_cents / 100).toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {selectedPackage.duration_days} days • Pay when publishing
                </div>
              </div>
            )}

            {renderFormFields()}

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setStep('package')} className="flex-1">
                Back
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save as Draft
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
