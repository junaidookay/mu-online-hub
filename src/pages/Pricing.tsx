import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShoppingBag, Wrench, Trophy, Type, Image, Calendar, Percent, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SEOHead } from '@/components/SEOHead';
import { SLOT_CONFIG, getSlotRedirectUrl } from '@/lib/slotConfig';

interface PricingPackage {
  id: string;
  name: string;
  description: string | null;
  product_type: string;
  duration_days: number;
  price_cents: number;
  features: string[] | null;
  display_order: number;
  slot_id: number | null;
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

    if (data) setPackages(data as PricingPackage[]);
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

    // Free packages - redirect directly to create listing
    if (pkg.price_cents === 0 && pkg.slot_id) {
      const redirectUrl = getSlotRedirectUrl(pkg.slot_id, pkg.id);
      navigate(redirectUrl);
      return;
    }

    setProcessingId(pkg.id);

    try {
      const successUrl = pkg.slot_id 
        ? `${window.location.origin}${getSlotRedirectUrl(pkg.slot_id, pkg.id)}&payment=success`
        : `${window.location.origin}/dashboard?payment=success`;

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          packageId: pkg.id,
          slotId: pkg.slot_id,
          successUrl,
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
    if (cents === 0) return 'FREE';
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getSlotIcon = (slotId: number | null) => {
    switch (slotId) {
      case 1: return <ShoppingBag className="w-5 h-5" />;
      case 2: return <Wrench className="w-5 h-5" />;
      case 3: return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 4: return <Type className="w-5 h-5 text-primary" />;
      case 5: return <Image className="w-5 h-5 text-cyan-400" />;
      case 6: return <Calendar className="w-5 h-5 text-green-400" />;
      case 7: return <Percent className="w-5 h-5 text-orange-400" />;
      case 8: return <Sparkles className="w-5 h-5 text-purple-400" />;
      default: return <ShoppingBag className="w-5 h-5" />;
    }
  };

  const getSlotName = (slotId: number | null) => {
    if (!slotId) return 'General';
    return SLOT_CONFIG[slotId as keyof typeof SLOT_CONFIG]?.name || 'General';
  };

  // Group packages by slot_id
  const groupedPackages = packages.reduce((acc, pkg) => {
    const key = pkg.slot_id || 0;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(pkg);
    return acc;
  }, {} as Record<number, PricingPackage[]>);

  // Get sorted slot IDs (1-8)
  const slotIds = Object.keys(groupedPackages)
    .map(Number)
    .filter(id => id > 0)
    .sort((a, b) => a - b);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Premium Packages - MU Online Hub"
        description="Boost your MU Online server visibility with premium packages. Choose from various homepage slots to attract more players."
        keywords="MU Online premium, server advertising, VIP listing, MU promotion"
      />
      <Header />
      <div className="container py-8">
        <div className="text-center mb-10">
          <h1 className="font-display text-3xl font-bold text-gradient-gold mb-3">
            Premium Packages
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Boost your server's visibility with our premium features. Each package unlocks a specific 
            homepage slot for maximum exposure.
          </p>
        </div>

        <Tabs defaultValue={slotIds[0]?.toString() || '1'} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 mb-8 justify-center">
            {slotIds.map((slotId) => (
              <TabsTrigger 
                key={slotId} 
                value={slotId.toString()} 
                className="gap-2 text-xs md:text-sm px-3 py-2"
              >
                {getSlotIcon(slotId)}
                <span className="hidden md:inline">{getSlotName(slotId)}</span>
                <span className="md:hidden">Slot {slotId}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {slotIds.map((slotId) => (
            <TabsContent key={slotId} value={slotId.toString()}>
              <div className="mb-6 text-center">
                <h2 className="font-display text-xl font-semibold flex items-center justify-center gap-2">
                  {getSlotIcon(slotId)}
                  {getSlotName(slotId)}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {SLOT_CONFIG[slotId as keyof typeof SLOT_CONFIG]?.description || ''}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {groupedPackages[slotId]?.map((pkg) => (
                  <div
                    key={pkg.id}
                    className={`glass-card p-6 flex flex-col ${pkg.price_cents === 0 ? 'border-green-500/50' : ''}`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      {getSlotIcon(pkg.slot_id)}
                      <h3 className="font-display text-lg font-semibold">{pkg.name}</h3>
                    </div>

                    <p className="text-muted-foreground text-sm mb-4 flex-grow">
                      {pkg.description}
                    </p>

                    <div className="mb-4">
                      <span className={`text-3xl font-bold ${pkg.price_cents === 0 ? 'text-green-400' : 'text-primary'}`}>
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
                            <Sparkles className="w-3 h-3 text-primary" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}

                    <Button
                      onClick={() => handlePurchase(pkg)}
                      disabled={processingId === pkg.id}
                      className={`w-full ${pkg.price_cents === 0 ? 'bg-green-600 hover:bg-green-700' : 'btn-fantasy-primary'}`}
                    >
                      {processingId === pkg.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : pkg.price_cents === 0 ? (
                        'Get Started Free'
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
