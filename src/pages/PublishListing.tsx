import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { SEOHead } from '@/components/SEOHead';
import Header from '@/components/layout/Header';
import { formatEdgeFunctionError } from '@/lib/edgeFunctionErrors';
import { 
  Loader2, ArrowLeft, Check, Clock, Star, 
  CreditCard, Wallet, AlertTriangle, XCircle 
} from 'lucide-react';

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

interface SellerPaymentSettings {
  stripe_enabled: boolean;
  paypal_enabled: boolean;
  paypal_email: string | null;
}

interface StripeConnectStatus {
  connected: boolean;
  onboardingComplete: boolean;
}

type PaymentMethod = 'stripe' | 'paypal';

const PublishListing = () => {
  const [listing, setListing] = useState<Listing | null>(null);
  const [packages, setPackages] = useState<ListingPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Payment availability states
  const [sellerPaymentSettings, setSellerPaymentSettings] = useState<SellerPaymentSettings | null>(null);
  const [stripeConnectStatus, setStripeConnectStatus] = useState<StripeConnectStatus | null>(null);
  const [paypalGlobalEnabled, setPaypalGlobalEnabled] = useState(false);
  const [stripeGlobalEnabled, setStripeGlobalEnabled] = useState(false);

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

    try {
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

      // Fetch packages, seller settings, global config in parallel
      const [packagesResult, settingsResult, stripeConfigResult, paypalConfigResult, stripeStatusResult] = await Promise.all([
        supabase
          .from('listing_packages')
          .select('*')
          .eq('is_active', true)
          .order('display_order'),
        supabase
          .from('seller_payment_settings')
          .select('stripe_enabled, paypal_enabled, paypal_email')
          .eq('user_id', user?.id)
          .maybeSingle(),
        supabase
          .from('payment_config')
          .select('is_enabled')
          .eq('config_key', 'stripe')
          .maybeSingle(),
        supabase
          .from('payment_config')
          .select('is_enabled')
          .eq('config_key', 'paypal')
          .maybeSingle(),
        supabase.functions.invoke('get-connect-status').catch(() => ({ data: null })),
      ]);

      if (packagesResult.data) {
        setPackages(packagesResult.data);
        if (packagesResult.data.length > 0) {
          setSelectedPackage(packagesResult.data[0].id);
        }
      }

      setSellerPaymentSettings(settingsResult.data);
      setStripeGlobalEnabled(stripeConfigResult.data?.is_enabled || false);
      setPaypalGlobalEnabled(paypalConfigResult.data?.is_enabled || false);
      
      if (stripeStatusResult.data) {
        setStripeConnectStatus(stripeStatusResult.data);
      }

      // Auto-select payment method based on what's available
      const stripeAvailable = stripeStatusResult.data?.onboardingComplete && 
                              (settingsResult.data?.stripe_enabled ?? false) && 
                              (stripeConfigResult.data?.is_enabled ?? false);
      const paypalAvailable = (settingsResult.data?.paypal_enabled ?? false) && 
                              !!settingsResult.data?.paypal_email && 
                              (paypalConfigResult.data?.is_enabled ?? false);

      if (stripeAvailable && !paypalAvailable) {
        setSelectedPaymentMethod('stripe');
      } else if (paypalAvailable && !stripeAvailable) {
        setSelectedPaymentMethod('paypal');
      } else if (stripeAvailable && paypalAvailable) {
        // Both available, let user choose (default to stripe)
        setSelectedPaymentMethod('stripe');
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Compute payment method availability
  const stripeConnected = stripeConnectStatus?.onboardingComplete ?? false;
  const stripeAvailable = stripeConnected && 
                          (sellerPaymentSettings?.stripe_enabled ?? false) && 
                          stripeGlobalEnabled;
  const paypalAvailable = (sellerPaymentSettings?.paypal_enabled ?? false) && 
                          !!sellerPaymentSettings?.paypal_email && 
                          paypalGlobalEnabled;
  const hasAnyPaymentMethod = stripeAvailable || paypalAvailable;

  const handlePurchase = async () => {
    if (!selectedPackage || !listing || !user || !selectedPaymentMethod) return;

    setIsProcessing(true);
    try {
      const pkg = packages.find(p => p.id === selectedPackage);
      if (!pkg) throw new Error('Package not found');

      const successUrl = `${window.location.origin}/seller-dashboard?payment=success&listing=${listing.id}`;
      const cancelUrl = `${window.location.origin}/seller-dashboard/publish/${listing.id}?payment=cancelled`;

      if (selectedPaymentMethod === 'stripe') {
        // Use Stripe checkout
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: {
            packageId: selectedPackage,
            productType: 'listing_publish',
            metadata: {
              listing_id: listing.id,
              duration_days: pkg.duration_days,
            },
            successUrl,
            cancelUrl,
          },
        });

        if (error) throw new Error(formatEdgeFunctionError(error).message);
        if (data?.error) throw new Error(data.error);
        if (data?.url) {
          window.location.href = data.url;
        }
      } else {
        // Use PayPal checkout
        const { data, error } = await supabase.functions.invoke('create-paypal-order', {
          body: {
            type: 'listing_publish',
            packageId: selectedPackage,
            listingId: listing.id,
            successUrl,
            cancelUrl,
          },
        });

        if (error) throw new Error(formatEdgeFunctionError(error).message);
        if (data?.error) throw new Error(data.error);
        if (data?.approvalUrl) {
          window.location.href = data.approvalUrl;
        }
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

        {/* Payment Method Warning */}
        {!hasAnyPaymentMethod && (
          <Alert variant="destructive" className="mb-6">
            <XCircle className="h-4 w-4" />
            <AlertTitle>No Payment Method Configured</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="mb-3">
                You need to set up at least one payment method to publish listings. 
                Please configure Stripe or PayPal in your seller dashboard.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/seller-dashboard')}
              >
                Go to Payment Settings
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Package Selection */}
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

        {/* Payment Method Selection */}
        {hasAnyPaymentMethod && (stripeAvailable && paypalAvailable) && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-center">Select Payment Method</h3>
            <div className="flex justify-center gap-4">
              <Button
                variant={selectedPaymentMethod === 'stripe' ? 'default' : 'outline'}
                className="flex items-center gap-2 px-6 py-3"
                onClick={() => setSelectedPaymentMethod('stripe')}
              >
                <CreditCard className="w-5 h-5" />
                <span>Pay with Stripe</span>
                {selectedPaymentMethod === 'stripe' && <Check className="w-4 h-4 ml-2" />}
              </Button>
              <Button
                variant={selectedPaymentMethod === 'paypal' ? 'default' : 'outline'}
                className="flex items-center gap-2 px-6 py-3"
                onClick={() => setSelectedPaymentMethod('paypal')}
              >
                <Wallet className="w-5 h-5" />
                <span>Pay with PayPal</span>
                {selectedPaymentMethod === 'paypal' && <Check className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          </div>
        )}

        {/* Single Method Indicator */}
        {hasAnyPaymentMethod && !(stripeAvailable && paypalAvailable) && (
          <div className="mb-8 text-center">
            <p className="text-sm text-muted-foreground">
              Payment via {selectedPaymentMethod === 'stripe' ? 'Stripe' : 'PayPal'}
            </p>
          </div>
        )}

        {/* Purchase Button */}
        <div className="text-center">
          <Button 
            onClick={handlePurchase}
            className="btn-fantasy-primary px-12"
            disabled={isProcessing || !selectedPackage || !hasAnyPaymentMethod || !selectedPaymentMethod}
          >
            {isProcessing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {selectedPaymentMethod === 'stripe' && <CreditCard className="w-4 h-4 mr-2" />}
            {selectedPaymentMethod === 'paypal' && <Wallet className="w-4 h-4 mr-2" />}
            Proceed to Payment
          </Button>
          
          {hasAnyPaymentMethod && (
            <p className="text-xs text-muted-foreground mt-4">
              Secure payment powered by {selectedPaymentMethod === 'stripe' ? 'Stripe' : 'PayPal'}
            </p>
          )}
        </div>
      </main>
    </div>
  );
};

export default PublishListing;
