import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { getSlotConfig, SLOT_CONFIG } from '@/lib/slotConfig';

interface CreateDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  slotId: number;
  onSuccess: () => void;
}

interface UserListing {
  id: string;
  title: string;
  category: string;
}

export const CreateDraftModal = ({ isOpen, onClose, slotId, onSuccess }: CreateDraftModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const slotConfig = getSlotConfig(slotId);

  const [loading, setLoading] = useState(false);
  
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
    expiresAt: '',
  });

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
        
        const categoriesToFetch = selectedListingType === 'marketplace' 
          ? [...marketplaceCategories] 
          : [...servicesCategories];
        
        const { data, error } = await supabase
          .from('listings')
          .select('id, title, category, is_published, is_active, user_id')
          .eq('user_id', user.id)
          .eq('is_published', true)
          .eq('is_active', true)
          .in('category', categoriesToFetch as any);
        
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

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !slotConfig) return;

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
              banner_url: formData.bannerUrl || null,
              ad_type: slotId === 1 ? 'marketplace' : 'services',
              slot_id: slotId,
              is_active: false, // DRAFT - inactive until paid
              vip_level: 'none',
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
              banner_url: formData.bannerUrl || null,
              season: formData.season || 'Season 17',
              part: formData.part || 'Part 1',
              exp_rate: formData.expRate || '1000x',
              open_date: formData.openDate || null,
              features: formData.features ? formData.features.split(',').map(f => f.trim()) : [],
              slot_id: slotId,
              is_active: false, // DRAFT - inactive until paid
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
              is_active: false, // DRAFT - inactive until paid
            })
            .select()
            .single();
          break;

        case 'premium_banners':
          // premium_banners doesn't have user_id, so we'll use a different approach
          // For now, skip premium banners draft creation or handle differently
          toast({
            title: 'Not Supported',
            description: 'Main Banner drafts require admin assistance. Please contact support.',
            variant: 'destructive',
          });
          setLoading(false);
          return;

        case 'rotating_promos':
          if (slotId === 7) {
            // Partner Discounts - must link to existing listing
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
                is_active: false, // DRAFT - inactive until paid
                expires_at: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
              })
              .select()
              .single();
          } else {
            // Slot 8 - Server Events
            result = await supabase
              .from('rotating_promos')
              .insert({
                user_id: user.id,
                text: formData.text || formData.name,
                highlight: formData.highlight,
                link: formData.link || formData.website,
                promo_type: 'event',
                slot_id: slotId,
                is_active: false, // DRAFT - inactive until paid
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

      onSuccess();
    } catch (error: any) {
      console.error('Failed to create draft:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create draft.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
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
              <Label htmlFor="bannerUrl">Banner Image URL</Label>
              <Input
                id="bannerUrl"
                value={formData.bannerUrl}
                onChange={(e) => handleChange('bannerUrl', e.target.value)}
                placeholder="https://your-image-url.com/banner.jpg"
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

      case 'rotating_promos':
        if (slotId === 7) {
          // Partner Discounts
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
                  onChange={(e) => handleChange('expiresAt', e.target.value)}
                />
              </div>
            </>
          );
        } else {
          // Server Events (Slot 8)
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
            Fill in the details for your draft. You can pay and publish later from your dashboard.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {renderFormFields()}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save as Draft
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
