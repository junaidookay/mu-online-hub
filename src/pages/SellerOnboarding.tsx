import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { SEOHead } from '@/components/SEOHead';
import { Loader2, Store, Briefcase } from 'lucide-react';
import { marketplaceCategories, serviceCategories } from '@/lib/categories';

type SellerCategory = Database["public"]["Enums"]["seller_category"];

const SellerOnboarding = () => {
  const [selectedCategories, setSelectedCategories] = useState<SellerCategory[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const fetchSelectedCategories = async () => {
      setIsLoadingCategories(true);
      const { data, error } = await supabase
        .from('seller_categories')
        .select('category')
        .eq('user_id', user.id);

      if (!error && data) {
        setSelectedCategories(data.map((c) => c.category));
      }
      setIsLoadingCategories(false);
    };

    fetchSelectedCategories();
  }, [user]);

  const toggleCategory = (categoryId: SellerCategory) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSubmit = async () => {
    if (selectedCategories.length === 0) {
      toast({ title: 'Error', description: 'Please select at least one category', variant: 'destructive' });
      return;
    }

    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: deleteError } = await supabase
        .from('seller_categories')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;

      const categoryInserts = selectedCategories.map((category) => ({ user_id: user.id, category }));
      const { error: insertError } = await supabase.from('seller_categories').insert(categoryInserts);

      if (insertError) throw insertError;

      // Update profile to seller
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ user_type: 'seller' })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      toast({ title: 'Success', description: 'Welcome! You are now a seller.' });
      navigate('/seller-dashboard');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-12">
      <SEOHead 
        title="Become a Seller - MU Online Hub"
        description="Choose your categories and start selling on MU Online Hub marketplace."
      />
      <div className="max-w-4xl mx-auto">
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold text-gradient-gold mb-2">
              Choose Your Categories
            </h1>
            <p className="text-muted-foreground">
              Select the categories you want to sell in. You can choose from both Marketplace and Services.
            </p>
          </div>

          {isLoadingCategories && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {/* Marketplace Categories */}
          <div className={`mb-8 ${isLoadingCategories ? 'hidden' : ''}`}>
            <div className="flex items-center gap-2 mb-4">
              <Store className="w-5 h-5 text-primary" />
              <h2 className="font-display text-xl font-semibold">MU Marketplace</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {marketplaceCategories.map((category) => {
                const id = category.id as SellerCategory;
                const isSelected = selectedCategories.includes(id);
                return (
                  <div
                    key={category.id}
                    onClick={() => toggleCategory(id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 glow-border-gold'
                        : 'border-border/50 bg-muted/20 hover:border-border'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Checkbox 
                        checked={isSelected} 
                        className="mt-1"
                        onCheckedChange={() => toggleCategory(id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <category.icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className="font-semibold text-sm text-foreground truncate">{category.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{category.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Services Categories */}
          <div className={`mb-8 ${isLoadingCategories ? 'hidden' : ''}`}>
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-5 h-5 text-primary" />
              <h2 className="font-display text-xl font-semibold">MU Services</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {serviceCategories.map((category) => {
                const id = category.id as SellerCategory;
                const isSelected = selectedCategories.includes(id);
                return (
                  <div
                    key={category.id}
                    onClick={() => toggleCategory(id)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 glow-border-gold'
                        : 'border-border/50 bg-muted/20 hover:border-border'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Checkbox 
                        checked={isSelected} 
                        className="mt-1"
                        onCheckedChange={() => toggleCategory(id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <category.icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className="font-semibold text-sm text-foreground truncate">{category.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{category.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <Button 
            onClick={handleSubmit}
            className="w-full btn-fantasy-primary"
            disabled={isLoadingCategories || isSubmitting || selectedCategories.length === 0}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Continue to Seller Dashboard ({selectedCategories.length} selected)
          </Button>
        </div>

        <div className="mt-4 text-center">
          <button onClick={() => navigate('/')} className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default SellerOnboarding;
