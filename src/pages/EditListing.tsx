import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { Loader2, ArrowLeft } from 'lucide-react';
import { categoryLabels } from '@/lib/categories';

type SellerCategory = Database["public"]["Enums"]["seller_category"];

const EditListing = () => {
  const { id } = useParams<{ id: string }>();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<SellerCategory | ''>('');
  const [priceUsd, setPriceUsd] = useState('');
  const [website, setWebsite] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [categories, setCategories] = useState<SellerCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchData();
    }
  }, [user, id]);

  const fetchData = async () => {
    if (!user || !id) return;
    setIsLoading(true);

    // Fetch seller categories
    const { data: catData } = await supabase
      .from('seller_categories')
      .select('category')
      .eq('user_id', user.id);

    if (catData && catData.length > 0) {
      setCategories(catData.map((c) => c.category));
    } else {
      navigate('/seller-onboarding');
      return;
    }

    // Fetch listing
    const { data: listing, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !listing) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    setCategories((prev) => {
      const prevSet = new Set(prev);
      if (listing.category && !prevSet.has(listing.category)) {
        return [...prev, listing.category];
      }
      return prev;
    });
    setTitle(listing.title);
    setDescription(listing.description || '');
    setCategory(listing.category ?? '');
    setPriceUsd(listing.price_usd?.toString() || '');
    setWebsite(listing.website || '');
    setImageUrl(listing.image_url || '');

    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !category) {
      toast({ title: 'Error', description: 'Please fill in required fields', variant: 'destructive' });
      return;
    }

    if (!user || !id) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('listings')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          category: category as SellerCategory,
          price_usd: priceUsd ? parseFloat(priceUsd) : null,
          website: website.trim() || null,
          image_url: imageUrl || null,
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Listing updated successfully!' });
      navigate('/seller-dashboard');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update listing';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead 
          title="Listing Not Found - MU Online Hub"
          description="The listing you're looking for could not be found."
        />
        <Header />
        <main className="container py-8 max-w-2xl text-center">
          <h1 className="font-display text-2xl font-bold text-gradient-gold mb-4">Listing Not Found</h1>
          <p className="text-muted-foreground mb-6">The listing you're looking for doesn't exist or you don't have permission to edit it.</p>
          <Button onClick={() => navigate('/seller-dashboard')} className="btn-fantasy-primary">
            Back to Dashboard
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Edit Listing - MU Online Hub"
        description="Edit your listing on MU Online Hub marketplace."
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
            Edit Listing
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as SellerCategory)}>
                <SelectTrigger className="bg-muted/50">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
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
              <Button 
                type="button"
                variant="outline"
                onClick={() => navigate('/seller-dashboard')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="flex-1 btn-fantasy-primary"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default EditListing;
