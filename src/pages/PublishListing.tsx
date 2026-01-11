import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { SEOHead } from '@/components/SEOHead';
import Header from '@/components/layout/Header';
import { Loader2, ArrowLeft, Check, Clock, Star } from 'lucide-react';

interface ListingPackage {
  id: string;
  name: string;
  description: string | null;
  duration_days: number;
  price_cents: number;
  features: string[] | null;
}

interface Listing {
  id: string;
  title: string;
  category: string;
}

const PublishListing = () => {
  const [listing, setListing] = useState<Listing | null>(null);
  const [packages, setPackages] = useState<ListingPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const { id } = useParams<{ id: string }>();
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
    setIsLoading(true);

    // Fetch listing
    const { data: listingData, error: listingError } = await supabase
      .from('listings')
      .select('id, title, category')
      .eq('id', id)
      .eq('user_id', user?.id)
      .single();

    if (listingError || !listingData) {
      toast({ title: 'Error', description: 'Listing not found', variant: 'destructive' });
      navigate('/seller-dashboard');
      return;
    }

    setListing(listingData);

    // Fetch packages
    const { data: packagesData } = await supabase
      .from('listing_packages')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (packagesData) {
      setPackages(packagesData);
      if (packagesData.length > 0) {
        setSelectedPackage(packagesData[0].id);
      }
    }

    setIsLoading(false);
  };

  const handlePurchase = async () => {
    if (!selectedPackage || !listing || !user) return;

    setIsProcessing(true);
    try {
      const pkg = packages.find(p => p.id === selectedPackage);
      if (!pkg) throw new Error('Package not found');

      // Create checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          productType: 'listing_publish',
          packageId: selectedPackage,
          metadata: {
            listing_id: listing.id,
            duration_days: pkg.duration_days,
          },
        },
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setIsProcessing(false);
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
        title="Publish Listing - MU Online Hub"
        description="Choose a package to publish your listing on MU Online Hub marketplace."
      />
      <Header />

      <main className="container py-8 max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/seller-dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="text-center mb-8">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-gradient-gold mb-2">
            Publish Your Listing
          </h1>
          <p className="text-muted-foreground">
            Choose a package to publish "{listing?.title}" to the marketplace
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {packages.map((pkg, index) => {
            const isSelected = selectedPackage === pkg.id;
            const isPopular = index === 1;
            
            return (
              <Card 
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg.id)}
                className={`cursor-pointer transition-all relative ${
                  isSelected 
                    ? 'glass-card-glow border-primary' 
                    : 'glass-card hover:border-border'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Star className="w-3 h-3 mr-1" />
                      Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-lg">{pkg.name}</CardTitle>
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{pkg.duration_days} days</span>
                  </div>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="text-3xl font-bold text-primary mb-4">
                    ${(pkg.price_cents / 100).toFixed(2)}
                  </div>
                  {pkg.features && (
                    <ul className="space-y-2 text-sm text-left">
                      {pkg.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center">
          <Button 
            onClick={handlePurchase}
            className="btn-fantasy-primary px-12"
            disabled={isProcessing || !selectedPackage}
          >
            {isProcessing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Proceed to Payment
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            Secure payment powered by Stripe
          </p>
        </div>
      </main>
    </div>
  );
};

export default PublishListing;
