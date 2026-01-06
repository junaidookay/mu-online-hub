import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Crown, Star, Sparkles, Megaphone, Image } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PricingPackage {
  id: string;
  name: string;
  description: string | null;
  product_type: string;
  duration_days: number;
  price_cents: number;
  features: string[] | null;
  display_order: number;
}

const Pricing = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [packages, setPackages] = useState<PricingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    const { data, error } = await supabase
      .from('pricing_packages')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (data) setPackages(data);
    if (error) console.error('Failed to fetch packages:', error);
    setLoading(false);
  };

  const handlePurchase = async (pkg: PricingPackage) => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please sign in to make a purchase.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    setProcessingId(pkg.id);

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          packageId: pkg.id,
          successUrl: `${window.location.origin}/dashboard?payment=success`,
          cancelUrl: `${window.location.origin}/pricing?payment=cancelled`,
        },
      });

      if (error) throw error;

      if (data.needsConfiguration) {
        toast({
          title: 'Coming Soon',
          description: 'Payment system is being configured. Please check back later.',
        });
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: 'Checkout Failed',
        description: error.message || 'Failed to start checkout. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getProductIcon = (productType: string) => {
    switch (productType) {
      case 'premium_listing':
        return <Star className="w-5 h-5" />;
      case 'vip_gold':
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 'vip_diamond':
        return <Sparkles className="w-5 h-5 text-cyan-400" />;
      case 'top_banner':
        return <Image className="w-5 h-5" />;
      case 'rotating_promo':
        return <Megaphone className="w-5 h-5" />;
      default:
        return <Star className="w-5 h-5" />;
    }
  };

  const groupedPackages = packages.reduce((acc, pkg) => {
    if (!acc[pkg.product_type]) {
      acc[pkg.product_type] = [];
    }
    acc[pkg.product_type].push(pkg);
    return acc;
  }, {} as Record<string, PricingPackage[]>);

  const productTypeLabels: Record<string, string> = {
    premium_listing: 'Premium Listings',
    vip_gold: 'VIP Gold',
    vip_diamond: 'VIP Diamond',
    top_banner: 'Top Banners',
    rotating_promo: 'Rotating Promos',
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl font-bold text-gradient-gold mb-3">
            Premium Packages
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Boost your server's visibility with our premium features. Choose from various packages 
            to get more exposure and attract more players.
          </p>
        </div>

        <Tabs defaultValue="premium_listing" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            {Object.keys(productTypeLabels).map((type) => (
              <TabsTrigger key={type} value={type} className="gap-2 text-xs md:text-sm">
                {getProductIcon(type)}
                <span className="hidden md:inline">{productTypeLabels[type]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(groupedPackages).map(([productType, pkgs]) => (
            <TabsContent key={productType} value={productType}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {pkgs.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="glass-card p-6 flex flex-col"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      {getProductIcon(pkg.product_type)}
                      <h3 className="font-display text-lg font-semibold">{pkg.name}</h3>
                    </div>

                    <p className="text-muted-foreground text-sm mb-4 flex-grow">
                      {pkg.description}
                    </p>

                    <div className="mb-4">
                      <span className="text-3xl font-bold text-primary">
                        {formatPrice(pkg.price_cents)}
                      </span>
                      <span className="text-muted-foreground ml-2">
                        / {pkg.duration_days} days
                      </span>
                    </div>

                    {pkg.features && pkg.features.length > 0 && (
                      <ul className="space-y-2 mb-6">
                        {pkg.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-sm">
                            <Star className="w-3 h-3 text-primary" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}

                    <Button
                      onClick={() => handlePurchase(pkg)}
                      disabled={processingId === pkg.id}
                      className="btn-fantasy-primary w-full"
                    >
                      {processingId === pkg.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        'Purchase Now'
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="mt-12 glass-card p-6 text-center">
          <p className="text-muted-foreground text-sm">
            🔒 Secure payments powered by Stripe. All transactions are encrypted and secure.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Need help? Contact us for custom packages or bulk discounts.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
