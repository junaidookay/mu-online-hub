import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { SEOHead } from '@/components/SEOHead';
import Header from '@/components/layout/Header';
import { ImageUpload } from '@/components/upload/ImageUpload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, ShoppingBag, Wrench, Check } from 'lucide-react';
import { categoryLabels, marketplaceCategories, serviceCategories } from '@/lib/categories';

type SellerCategory = Database["public"]["Enums"]["seller_category"];

interface ListingPackage {
  id: string;
  name: string;
  description: string | null;
  duration_days: number;
  price_cents: number;
  display_order: number | null;
  is_active: boolean | null;
}

type ListingType = 'marketplace' | 'services';
type Step = 'type' | 'package' | 'details';

const CreateListing = () => {
  const [step, setStep] = useState<Step>('type');
  const [listingType, setListingType] = useState<ListingType>('marketplace');
  const [packages, setPackages] = useState<ListingPackage[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SellerCategory | ''>('');
  const [priceUsd, setPriceUsd] = useState('');
  const [website, setWebsite] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [categories, setCategories] = useState<SellerCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchCategories();
      fetchPackages();
    }
  }, [user]);

  const fetchCategories = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('seller_categories')
      .select('category')
      .eq('user_id', user.id);

    if (data && data.length > 0) {
      const fetchedCategories = data.map((c) => c.category);
      setCategories(fetchedCategories);
    } else {
      navigate('/seller-onboarding');
    }
    setIsLoadingCategories(false);
  };

  const fetchPackages = async () => {
    setIsLoadingPackages(true);
    try {
      const { data, error } = await supabase
        .from('listing_packages')
        .select('id, name, description, duration_days, price_cents, display_order, is_active')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      const nextPackages = (data || []) as ListingPackage[];
      setPackages(nextPackages);
      if (nextPackages.length > 0) {
        setSelectedPackageId(nextPackages[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch listing packages:', error);
    } finally {
      setIsLoadingPackages(false);
    }
  };

  const marketplaceCategoryIds = new Set(marketplaceCategories.map(c => c.id));
  const serviceCategoryIds = new Set(serviceCategories.map(c => c.id));

  const categoriesForType = categories.filter((cat) => {
    return listingType === 'marketplace' ? marketplaceCategoryIds.has(cat) : serviceCategoryIds.has(cat);
  });

  useEffect(() => {
    if (categoriesForType.length === 0) return;
    if (!category || !categoriesForType.includes(category)) {
      setCategory(categoriesForType[0] ?? '');
    }
  }, [listingType, categories, category]);

  useEffect(() => {
    if (isLoadingCategories) return;
    if (categories.length === 0) return;

    const hasMarketplace = categories.some((cat) => marketplaceCategoryIds.has(cat));
    const hasServices = categories.some((cat) => serviceCategoryIds.has(cat));

    if (hasMarketplace) {
      setListingType('marketplace');
    } else if (hasServices) {
      setListingType('services');
    }
  }, [isLoadingCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPackageId) {
      toast({ title: 'Error', description: 'Please select a package', variant: 'destructive' });
      return;
    }

    if (categoriesForType.length === 0) {
      toast({ title: 'Error', description: 'No categories available for this advertise type', variant: 'destructive' });
      return;
    }

    if (!title.trim() || !category) {
      toast({ title: 'Error', description: 'Please fill in required fields', variant: 'destructive' });
      return;
    }

    if (!user) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('listings')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          category: category as SellerCategory,
          price_usd: priceUsd ? parseFloat(priceUsd) : null,
          website: website.trim() || null,
          image_url: imageUrl || null,
          is_published: false,
          is_active: false,
          published_at: null,
          expires_at: null,
        })
        .select('id')
        .single();

      if (error) throw error;

      if (data?.id) {
        localStorage.setItem(`listing_publish_package:${data.id}`, selectedPackageId);
      }

      toast({ title: 'Draft Created!', description: 'Your draft is saved in the seller dashboard. Publish when ready.' });
      navigate('/seller-dashboard');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create listing';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoadingCategories || isLoadingPackages) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Create Listing - MU Online Hub"
        description="Create a new listing to sell on MU Online Hub marketplace."
      />
      <Header />

      <main className="container py-8 max-w-2xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/seller-dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="glass-card p-6 md:p-8">
          <h1 className="font-display text-2xl font-bold text-gradient-gold mb-6">
            Create New Listing
          </h1>

          {step === 'type' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Select Advertise Type</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card
                    onClick={() => setListingType('marketplace')}
                    className={`cursor-pointer transition-all ${
                      listingType === 'marketplace'
                        ? 'glass-card-glow border-primary'
                        : 'glass-card hover:border-border'
                    }`}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <ShoppingBag className="w-4 h-4 text-primary" />
                        Marketplace Advertise
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Sell items like websites, files, launchers, hosting.
                    </CardContent>
                  </Card>
                  <Card
                    onClick={() => setListingType('services')}
                    className={`cursor-pointer transition-all ${
                      listingType === 'services'
                        ? 'glass-card-glow border-primary'
                        : 'glass-card hover:border-border'
                    }`}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-primary" />
                        Services Advertise
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Offer services like development, design, promotion.
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="pt-2 flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/seller-dashboard')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="flex-1 btn-fantasy-primary"
                  onClick={() => setStep('package')}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 'package' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Select Duration Package</Label>
                {packages.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No packages available.</div>
                ) : (
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
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              selectedPackageId === pkg.id ? 'border-primary bg-primary' : 'border-muted-foreground'
                            }`}
                          >
                            {selectedPackageId === pkg.id && <Check className="w-3 h-3 text-primary-foreground" />}
                          </div>
                          <div>
                            <div className="font-medium">{pkg.name}</div>
                            <div className="text-sm text-muted-foreground">{pkg.duration_days} days</div>
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
                )}
              </div>

              <div className="pt-2 flex gap-4">
                <Button type="button" variant="outline" onClick={() => setStep('type')} className="flex-1">
                  Back
                </Button>
                <Button
                  type="button"
                  className="flex-1 btn-fantasy-primary"
                  onClick={() => setStep('details')}
                  disabled={!selectedPackageId}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 'details' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={category} onValueChange={(value) => setCategory(value as SellerCategory)}>
                  <SelectTrigger className="bg-muted/50">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesForType.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {categoryLabels[cat] ?? cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Premium MU Online Website Template"
                  className="bg-muted/50"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your product or service..."
                  className="bg-muted/50 min-h-[120px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (USD)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={priceUsd}
                    onChange={(e) => setPriceUsd(e.target.value)}
                    placeholder="0.00"
                    className="bg-muted/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website / Contact</Label>
                  <Input
                    id="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="yoursite.com or Discord"
                    className="bg-muted/50"
                  />
                </div>
              </div>

              {user && (
                <div className="space-y-2">
                  <Label>Listing Image</Label>
                  <ImageUpload
                    bucket="ad-banners"
                    userId={user.id}
                    onUploadComplete={setImageUrl}
                    currentImageUrl={imageUrl}
                    aspectRatio="800x400"
                  />
                </div>
              )}

              <div className="pt-4 flex gap-4">
                <Button type="button" variant="outline" onClick={() => setStep('package')} className="flex-1">
                  Back
                </Button>
                <Button type="submit" className="flex-1 btn-fantasy-primary" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Create Listing
                </Button>
              </div>
          </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default CreateListing;
