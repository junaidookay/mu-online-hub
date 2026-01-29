import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatResponseError, formatEdgeFunctionError } from '@/lib/edgeFunctionErrors';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard, Wallet } from 'lucide-react';
import { isSlotFree, getSlotRedirectUrl } from '@/lib/slotConfig';

interface SlotCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageId: string;
  packageName: string;
  slotId: number;
  priceInCents: number;
  durationDays: number;
  draftId?: string;
  draftType?: 'server' | 'advertisement' | 'banner' | 'promo' | 'text_server';
}

interface PaymentConfig {
  isPayPalEnabled: boolean;
  isPayPalConfigured: boolean;
  isStripeConfigured: boolean;
}

export const SlotCheckoutModal = ({
  isOpen,
  onClose,
  packageId,
  packageName,
  slotId,
  priceInCents,
  durationDays,
  draftId,
  draftType,
}: SlotCheckoutModalProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal'>('stripe');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({
    isPayPalEnabled: false,
    isPayPalConfigured: false,
    isStripeConfigured: true,
  });

  // Load payment configuration when modal opens
  useEffect(() => {
    const loadPaymentConfig = async () => {
      if (!isOpen) return;
      
      setIsLoadingConfig(true);
      try {
        // Check PayPal configuration - use maybeSingle to handle no config
        const { data: paypalConfig } = await supabase
          .from('payment_config')
          .select('*')
          .eq('config_key', 'paypal')
          .maybeSingle();

        let isPayPalConfigured = false;
        if (paypalConfig?.config_value) {
          try {
            const config = JSON.parse(paypalConfig.config_value);
            isPayPalConfigured = config.client_id_set && config.client_secret_set;
          } catch {
            // Invalid JSON
          }
        }

        setPaymentConfig({
          isPayPalEnabled: paypalConfig?.is_enabled || false,
          isPayPalConfigured,
          isStripeConfigured: true, // Stripe is always available if STRIPE_SECRET_KEY is set
        });

        // Default to Stripe if PayPal is not available
        if (!paypalConfig?.is_enabled || !isPayPalConfigured) {
          setPaymentMethod('stripe');
        }
      } catch (err) {
        console.error('Error loading payment config:', err);
      }
      setIsLoadingConfig(false);
    };

    loadPaymentConfig();
  }, [isOpen]);

  const handleProceed = async () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please sign in to continue.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    // Free slot - redirect directly
    if (isSlotFree(slotId)) {
      navigate(getSlotRedirectUrl(slotId));
      onClose();
      return;
    }

    setIsProcessing(true);

    try {
      // Success URL includes draft info for direct activation (bypasses webhook)
      const draftParams = draftId && draftType 
        ? `&draftId=${draftId}&draftType=${draftType}&durationDays=${durationDays}` 
        : '';
      const successUrl = `${window.location.origin}/dashboard?payment=success&slot=${slotId}${draftParams}`;
      const cancelUrl = `${window.location.origin}/dashboard?payment=cancelled`;

      // Use PayPal Orders API for proper redirect flow
      if (paymentMethod === 'paypal') {
        const response = await supabase.functions.invoke('create-paypal-order', {
          body: {
            type: 'slot',
            packageId,
            slotId,
            successUrl,
            cancelUrl,
            draftId,
            draftType,
          },
        });

        if (response.error) {
          const formattedError = formatResponseError(response);
          toast({
            title: 'PayPal Error',
            description: formattedError.message,
            variant: 'destructive',
          });
          return;
        }

        if (response.data?.needsConfiguration) {
          toast({
            title: 'PayPal Not Available',
            description: 'PayPal is not configured yet.',
            variant: 'destructive',
          });
          return;
        }

        if (response.data?.error) {
          const formattedError = formatResponseError(response);
          toast({
            title: 'PayPal Error',
            description: formattedError.message,
            variant: 'destructive',
          });
          return;
        }

        // Redirect to PayPal approval URL
        if (response.data?.approvalUrl) {
          window.location.href = response.data.approvalUrl;
          return;
        }
      } else {
        // Stripe flow - use existing create-slot-checkout
        const response = await supabase.functions.invoke('create-slot-checkout', {
          body: {
            packageId,
            slotId,
            successUrl,
            cancelUrl,
            paymentMethod: 'stripe',
            draftId,
            draftType,
          },
        });

        if (response.error) {
          const formattedError = formatResponseError(response);
          toast({
            title: 'Checkout Error',
            description: formattedError.message,
            variant: 'destructive',
          });
          return;
        }

        if (response.data?.needsConfiguration) {
          toast({
            title: 'Stripe Not Available',
            description: 'Card payments are not configured yet.',
            variant: 'destructive',
          });
          return;
        }

        if (response.data?.error) {
          const formattedError = formatResponseError(response);
          toast({
            title: 'Checkout Error',
            description: formattedError.message,
            variant: 'destructive',
          });
          return;
        }

        // Stripe - redirect to checkout
        if (response.data?.url) {
          window.location.href = response.data.url;
          return;
        }
      }

    } catch (error: unknown) {
      console.error('Checkout error:', error);
      const formattedError = formatEdgeFunctionError(error);
      toast({
        title: 'Checkout Failed',
        description: formattedError.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const showPayPalOption = paymentConfig.isPayPalEnabled && paymentConfig.isPayPalConfigured;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Payment Method</DialogTitle>
          <DialogDescription>
            Purchase {packageName} for ${(priceInCents / 100).toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        {isLoadingConfig ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Package:</span>
                <span className="font-medium">{packageName}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Duration:</span>
                <span>{durationDays} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-bold text-primary">
                  ${(priceInCents / 100).toFixed(2)}
                </span>
              </div>
            </div>

            <RadioGroup
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as 'stripe' | 'paypal')}
              className="space-y-3"
            >
              {/* Stripe Option - Always available */}
              <div className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                paymentMethod === 'stripe' ? 'border-primary bg-primary/10' : 'border-border'
              }`}>
                <RadioGroupItem value="stripe" id="stripe" />
                <Label htmlFor="stripe" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    <span className="font-medium">Credit/Debit Card</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Powered by Stripe • Instant activation
                  </p>
                </Label>
              </div>

              {/* PayPal Option - Only show if configured */}
              {showPayPalOption && (
                <div className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  paymentMethod === 'paypal' ? 'border-primary bg-primary/10' : 'border-border'
                }`}>
                  <RadioGroupItem value="paypal" id="paypal" />
                  <Label htmlFor="paypal" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-blue-500" />
                      <span className="font-medium">PayPal</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pay with PayPal • Instant activation
                    </p>
                  </Label>
                </div>
              )}
            </RadioGroup>

            {/* Notice if PayPal is not available */}
            {!showPayPalOption && (
              <p className="text-xs text-muted-foreground text-center">
                Additional payment methods coming soon.
              </p>
            )}

            <Button
              onClick={handleProceed}
              disabled={isProcessing}
              className="w-full btn-fantasy-primary"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                `Continue with ${paymentMethod === 'stripe' ? 'Card' : 'PayPal'}`
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
