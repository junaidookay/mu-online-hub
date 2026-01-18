import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  CreditCard, Wallet, Loader2, CheckCircle, 
  ExternalLink, Copy, AlertCircle
} from 'lucide-react';

interface SellerPaymentSettings {
  stripe_enabled: boolean;
  paypal_enabled: boolean;
  paypal_email: string | null;
  preferred_method: string | null;
}

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: {
    id: string;
    title: string;
    price_usd: number;
    user_id: string;
  };
  sellerName: string;
}

export function CheckoutModal({ isOpen, onClose, listing, sellerName }: CheckoutModalProps) {
  const [sellerSettings, setSellerSettings] = useState<SellerPaymentSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'paypal' | null>(null);
  const [showPayPalInstructions, setShowPayPalInstructions] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchSellerSettings();
    }
  }, [isOpen, listing.user_id]);

  const fetchSellerSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('seller_payment_settings')
        .select('*')
        .eq('user_id', listing.user_id)
        .single();

      if (data) {
        setSellerSettings(data);
        // Auto-select preferred method or first available
        if (data.preferred_method === 'stripe' && data.stripe_enabled) {
          setSelectedMethod('stripe');
        } else if (data.preferred_method === 'paypal' && data.paypal_enabled) {
          setSelectedMethod('paypal');
        } else if (data.stripe_enabled) {
          setSelectedMethod('stripe');
        } else if (data.paypal_enabled) {
          setSelectedMethod('paypal');
        }
      }
    } catch (error) {
      console.error('Error fetching seller settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStripeCheckout = async () => {
    if (!user) return;
    setIsProcessing(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('create-listing-checkout', {
        body: {
          listingId: listing.id,
          successUrl: `${window.location.origin}/marketplace/${listing.id}?success=true`,
          cancelUrl: `${window.location.origin}/marketplace/${listing.id}?canceled=true`,
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create checkout');
      }

      if (response.data?.needsConfiguration) {
        toast({
          title: 'Payment Not Available',
          description: 'Payment system is being configured. Please try again later.',
          variant: 'destructive',
        });
        return;
      }

      if (response.data?.url) {
        window.location.href = response.data.url;
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to initiate checkout',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayPalCheckout = () => {
    setShowPayPalInstructions(true);
  };

  const copyPayPalEmail = () => {
    if (sellerSettings?.paypal_email) {
      navigator.clipboard.writeText(sellerSettings.paypal_email);
      toast({
        title: 'Copied!',
        description: 'PayPal email copied to clipboard',
      });
    }
  };

  const handleProceed = () => {
    if (selectedMethod === 'stripe') {
      handleStripeCheckout();
    } else if (selectedMethod === 'paypal') {
      handlePayPalCheckout();
    }
  };

  const hasStripe = sellerSettings?.stripe_enabled;
  const hasPayPal = sellerSettings?.paypal_enabled && sellerSettings?.paypal_email;
  const hasNoPaymentMethods = !hasStripe && !hasPayPal;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {showPayPalInstructions ? (
              <>
                <Wallet className="w-5 h-5 text-blue-500" />
                PayPal Payment Instructions
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5 text-primary" />
                Choose Payment Method
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : showPayPalInstructions ? (
          <div className="space-y-4">
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-500" />
                Send payment to:
              </h4>
              <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                <span className="font-mono text-sm flex-1 truncate">
                  {sellerSettings?.paypal_email}
                </span>
                <Button variant="ghost" size="sm" onClick={copyPayPalEmail}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Item:</span>
                <span className="font-medium truncate ml-2">{listing.title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-bold text-primary">${listing.price_usd.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Seller:</span>
                <span>{sellerName}</span>
              </div>
            </div>

            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-xs text-yellow-400">
                <strong>Important:</strong> After sending the payment, contact the seller to confirm 
                your purchase. Include your username and the listing name in the PayPal note.
              </p>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowPayPalInstructions(false)}
              >
                Back
              </Button>
              <Button 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={() => window.open('https://www.paypal.com/send', '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open PayPal
              </Button>
            </div>
          </div>
        ) : hasNoPaymentMethods ? (
          <div className="text-center py-6">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-yellow-500" />
            <p className="text-muted-foreground mb-2">
              This seller hasn't set up payment methods yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Please contact the seller directly to arrange payment.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Order Summary */}
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Item:</span>
                <span className="font-medium truncate ml-2 max-w-[200px]">{listing.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-bold text-lg text-primary">${listing.price_usd.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="space-y-3">
              {hasStripe && (
                <div
                  onClick={() => setSelectedMethod('stripe')}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedMethod === 'stripe'
                      ? 'border-primary bg-primary/10'
                      : 'border-border/50 bg-muted/20 hover:border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium">Credit/Debit Card</p>
                        <p className="text-xs text-muted-foreground">Powered by Stripe</p>
                      </div>
                    </div>
                    {sellerSettings?.preferred_method === 'stripe' && (
                      <Badge variant="secondary" className="text-xs">Preferred</Badge>
                    )}
                  </div>
                </div>
              )}

              {hasPayPal && (
                <div
                  onClick={() => setSelectedMethod('paypal')}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedMethod === 'paypal'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-border/50 bg-muted/20 hover:border-border'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Wallet className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="font-medium">PayPal</p>
                        <p className="text-xs text-muted-foreground">Direct payment to seller</p>
                      </div>
                    </div>
                    {sellerSettings?.preferred_method === 'paypal' && (
                      <Badge variant="secondary" className="text-xs">Preferred</Badge>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Button 
              onClick={handleProceed}
              disabled={!selectedMethod || isProcessing}
              className="w-full btn-fantasy-primary"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : selectedMethod === 'paypal' ? (
                <Wallet className="w-4 h-4 mr-2" />
              ) : (
                <CreditCard className="w-4 h-4 mr-2" />
              )}
              {isProcessing ? 'Processing...' : 'Continue to Payment'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
