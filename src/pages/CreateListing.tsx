import { useState, useEffect, lazy, Suspense } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, ArrowLeft, ShoppingBag, Wrench } from 'lucide-react';
import { categoryLabels, marketplaceCategories, serviceCategories } from '@/lib/categories';
import { Badge } from '@/components/ui/badge';

type SellerCategory = Database["public"]["Enums"]["seller_category"];

type ListingType = 'marketplace' | 'services';
type Step = 'type' | 'details';

const RichTextEditor = lazy(() => import('@/components/editor/RichTextEditor'));

const tagOptions = ['MU Online', 'Season 17', 'Season 19', 'Season 20', 'PVP', 'PVE', 'Custom', 'Premium', 'Free', 'Long-term'];

const CreateListing = () => {
  const [step, setStep] = useState<Step>('type');
  const [listingType, setListingType] = useState<ListingType>('marketplace');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
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

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
          short_description: shortDescription.trim() || null,
          full_description: fullDescription || null,
          video_url: videoUrl.trim() || null,
          tags: selectedTags.length > 0 ? selectedTags : null,
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

      toast({ title: 'Draft Created!', description: 'Your draft is saved in the seller dashboard. Publish when ready.' });
      navigate('/seller-dashboard');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create listing';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoadingCategories) {
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
                  onClick={() => setStep('details')}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 'details' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <Alert>
                <AlertTitle>Draft Mode</AlertTitle>
                <AlertDescription>
                  Creating this listing saves a draft. When you click Publish in your dashboard, you’ll choose a package (7/15/30 days) and complete payment.
                </AlertDescription>
              </Alert>

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

              <div className="space-y-2">
                <Label htmlFor="shortDescription">Short Description</Label>
                <Textarea
                  id="shortDescription"
                  value={shortDescription}
                  onChange={(e) => setShortDescription(e.target.value)}
                  placeholder="A brief summary shown on the listing card"
                  className="bg-muted/50"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Full Description</Label>
                <Suspense fallback={<div className="h-[200px] rounded-md border border-input bg-muted/30 animate-pulse" />}>
                  <RichTextEditor
                    content={fullDescription}
                    onChange={(html) => setFullDescription(html)}
                    placeholder="Write a detailed description with formatting..."
                  />
                </Suspense>
              </div>

              <div className="space-y-2">
                <Label htmlFor="videoUrl">Video URL (YouTube/Vimeo)</Label>
                <Input
                  id="videoUrl"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="bg-muted/50"
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2">
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
                <Button type="button" variant="outline" onClick={() => setStep('type')} className="flex-1">
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
