import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard, Copy, CheckCircle, Wallet } from 'lucide-react';
import { isSlotFree, getSlotRedirectUrl, FREE_SLOT_ID } from '@/lib/slotConfig';

interface SlotCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  packageId: string;
  packageName: string;
  slotId: number;
  priceInCents: number;
  durationDays: number;
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
  const [paypalDetails, setPaypalDetails] = useState<{
    paypalEmail: string;
    purchaseId: string;
    instructions: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Load payment configuration when modal opens
  useEffect(() => {
    const loadPaymentConfig = async () => {
      if (!isOpen) return;
      
      setIsLoadingConfig(true);
      try {
        // Check PayPal configuration
        const { data: paypalConfig } = await supabase
          .from('payment_config')
          .select('*')
          .eq('config_key', 'paypal')
          .single();

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
      const successUrl = `${window.location.origin}${getSlotRedirectUrl(slotId, packageId)}&payment=success`;
      const cancelUrl = `${window.location.origin}/pricing?payment=cancelled`;

      const { data, error } = await supabase.functions.invoke('create-slot-checkout', {
        body: {
          packageId,
          slotId,
          successUrl,
          cancelUrl,
          paymentMethod,
        },
      });

      if (error) throw error;

      if (data.needsConfiguration) {
        toast({
          title: 'Payment Not Available',
          description: `${paymentMethod === 'stripe' ? 'Stripe' : 'PayPal'} is not configured yet.`,
          variant: 'destructive',
        });
        return;
      }

      // Stripe - redirect to checkout
      if (data.provider === 'stripe' && data.url) {
        window.location.href = data.url;
        return;
      }

      // PayPal - show instructions
      if (data.provider === 'paypal') {
        setPaypalDetails({
          paypalEmail: data.paypalEmail,
          purchaseId: data.purchaseId,
          instructions: data.instructions,
        });
      }

    } catch (error: any) {
      console.error('Checkout error:', error);
      toast({
        title: 'Checkout Failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied!',
      description: 'PayPal email copied to clipboard.',
    });
  };

  const handleClose = () => {
    setPaypalDetails(null);
    onClose();
  };

  const showPayPalOption = paymentConfig.isPayPalEnabled && paymentConfig.isPayPalConfigured;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {paypalDetails ? 'Complete PayPal Payment' : 'Select Payment Method'}
          </DialogTitle>
          <DialogDescription>
            {paypalDetails 
              ? 'Send payment to the address below to activate your slot.'
              : `Purchase ${packageName} for $${(priceInCents / 100).toFixed(2)}`
            }
          </DialogDescription>
        </DialogHeader>

        {isLoadingConfig ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : paypalDetails ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">PayPal Email:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(paypalDetails.paypalEmail)}
                >
                  {copied ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-primary font-mono text-sm break-all">
                {paypalDetails.paypalEmail}
              </p>
            </div>

            <div className="p-4 bg-primary/10 rounded-lg">
              <p className="text-sm font-medium mb-1">Amount:</p>
              <p className="text-2xl font-bold text-primary">
                ${(priceInCents / 100).toFixed(2)} USD
              </p>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-sm font-medium mb-1">Your Purchase ID:</p>
              <p className="text-xs font-mono break-all text-muted-foreground">
                {paypalDetails.purchaseId}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Include this ID in your PayPal payment note.
              </p>
            </div>

            <div className="p-3 bg-yellow-500/10 rounded-lg text-sm text-yellow-600 dark:text-yellow-400">
              ⚠️ Your slot will be activated after payment verification (usually within 24 hours via webhook).
            </div>

            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
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
              {showPayPalOption ? (
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
                      Pay with PayPal • Auto-activation via webhook
                    </p>
                  </Label>
                </div>
              ) : null}
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
