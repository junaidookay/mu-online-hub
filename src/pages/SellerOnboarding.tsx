import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { SEOHead } from '@/components/SEOHead';
import { Loader2, Globe, FileCode, Shield, Rocket, Code } from 'lucide-react';

const categories = [
  { id: 'websites', label: 'Websites', icon: Globe, description: 'MU Online website templates and custom designs' },
  { id: 'server_files', label: 'Server Files', icon: FileCode, description: 'Complete server packages and files' },
  { id: 'antihack', label: 'Antihack', icon: Shield, description: 'Security and protection systems' },
  { id: 'launchers', label: 'Launchers', icon: Rocket, description: 'Custom game launchers' },
  { id: 'custom_scripts', label: 'Custom Scripts', icon: Code, description: 'Custom modifications and scripts' },
] as const;

type CategoryId = typeof categories[number]['id'];

const SellerOnboarding = () => {
  const [selectedCategories, setSelectedCategories] = useState<CategoryId[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

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
      // Insert selected categories
      const categoryInserts = selectedCategories.map(category => ({
        user_id: user.id,
        category,
      }));

      const { error: catError } = await supabase
        .from('seller_categories')
        .insert(categoryInserts);

      if (catError) throw catError;

      // Update profile to seller
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ user_type: 'seller' })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      toast({ title: 'Success', description: 'Welcome! You are now a seller.' });
      navigate('/seller-dashboard');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <SEOHead 
        title="Become a Seller - MU Online Hub"
        description="Choose your categories and start selling on MU Online Hub marketplace."
      />
      <div className="w-full max-w-2xl">
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold text-gradient-gold mb-2">
              Choose Your Categories
            </h1>
            <p className="text-muted-foreground">
              Select the categories you want to sell in. You can choose multiple.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {categories.map((category) => {
              const isSelected = selectedCategories.includes(category.id);
              return (
                <div
                  key={category.id}
                  onClick={() => toggleCategory(category.id)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 glow-border-gold'
                      : 'border-border/50 bg-muted/20 hover:border-border'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      checked={isSelected} 
                      className="mt-1"
                      onCheckedChange={() => toggleCategory(category.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <category.icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="font-semibold text-foreground">{category.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{category.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Button 
            onClick={handleSubmit}
            className="w-full btn-fantasy-primary"
            disabled={isSubmitting || selectedCategories.length === 0}
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
