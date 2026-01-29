import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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

const categoryLabels: Record<string, string> = {
  websites: 'Websites',
  server_files: 'Server Files',
  antihack: 'Antihack',
  launchers: 'Launchers',
  custom_scripts: 'Custom Scripts',
};

const CreateListing = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [priceUsd, setPriceUsd] = useState('');
  const [website, setWebsite] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
      setCategories(data.map(c => c.category));
      setCategory(data[0].category);
    } else {
      navigate('/seller-onboarding');
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !category) {
      toast({ title: 'Error', description: 'Please fill in required fields', variant: 'destructive' });
      return;
    }

    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('listings')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          category: category as 'websites' | 'server_files' | 'antihack' | 'launchers' | 'custom_scripts',
          price_usd: priceUsd ? parseFloat(priceUsd) : null,
          website: website.trim() || null,
          image_url: imageUrl || null,
        });

      if (error) throw error;

      toast({ title: 'Success', description: 'Listing created! You can now publish it to the marketplace.' });
      navigate('/seller-dashboard');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create listing';
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

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
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
                Create Listing
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default CreateListing;
