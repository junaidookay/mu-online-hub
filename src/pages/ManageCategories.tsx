import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { SEOHead } from '@/components/SEOHead';
import Header from '@/components/layout/Header';
import { Loader2, Store, Briefcase, ArrowLeft, Save } from 'lucide-react';
import { marketplaceCategories, serviceCategories, type CategoryId } from '@/lib/categories';

const ManageCategories = () => {
  const [selectedCategories, setSelectedCategories] = useState<CategoryId[]>([]);
  const [originalCategories, setOriginalCategories] = useState<CategoryId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

    try {
      const { data, error } = await supabase
        .from('seller_categories')
        .select('category')
        .eq('user_id', user.id);

      if (error) throw error;

      const categories = data?.map(c => c.category as CategoryId) || [];
      setSelectedCategories(categories);
      setOriginalCategories(categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCategory = (categoryId: CategoryId) => {
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
      // Find categories to add and remove
      const categoriesToAdd = selectedCategories.filter(c => !originalCategories.includes(c));
      const categoriesToRemove = originalCategories.filter(c => !selectedCategories.includes(c));

      // Remove deselected categories
      if (categoriesToRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('seller_categories')
          .delete()
          .eq('user_id', user.id)
          .in('category', categoriesToRemove);

        if (removeError) throw removeError;
      }

      // Add new categories
      if (categoriesToAdd.length > 0) {
        const categoryInserts = categoriesToAdd.map(category => ({
          user_id: user.id,
          category,
        }));

        const { error: addError } = await supabase
          .from('seller_categories')
          .insert(categoryInserts);

        if (addError) throw addError;
      }

      setOriginalCategories(selectedCategories);
      toast({ title: 'Success', description: 'Your categories have been updated.' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasChanges = JSON.stringify([...selectedCategories].sort()) !== JSON.stringify([...originalCategories].sort());

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
        title="Manage Categories - MU Online Hub"
        description="Update your selling categories on MU Online Hub marketplace."
      />
      <Header />

      <main className="container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" asChild>
              <Link to="/seller-dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>

          <div className="glass-card p-8">
            <div className="text-center mb-8">
              <h1 className="font-display text-3xl font-bold text-gradient-gold mb-2">
                Manage Your Categories
              </h1>
              <p className="text-muted-foreground">
                Select or deselect categories you want to sell in. Changes will be saved when you click the button below.
              </p>
            </div>

            {/* Marketplace Categories */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Store className="w-5 h-5 text-primary" />
                <h2 className="font-display text-xl font-semibold">MU Marketplace</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {marketplaceCategories.map((category) => {
                  const isSelected = selectedCategories.includes(category.id);
                  return (
                    <div
                      key={category.id}
                      onClick={() => toggleCategory(category.id)}
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
                          onCheckedChange={() => toggleCategory(category.id)}
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
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="w-5 h-5 text-primary" />
                <h2 className="font-display text-xl font-semibold">MU Services</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {serviceCategories.map((category) => {
                  const isSelected = selectedCategories.includes(category.id);
                  return (
                    <div
                      key={category.id}
                      onClick={() => toggleCategory(category.id)}
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
                          onCheckedChange={() => toggleCategory(category.id)}
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
              disabled={isSubmitting || selectedCategories.length === 0 || !hasChanges}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {hasChanges 
                ? `Save Changes (${selectedCategories.length} categories)` 
                : `No Changes (${selectedCategories.length} categories)`
              }
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ManageCategories;
