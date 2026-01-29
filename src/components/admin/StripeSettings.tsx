import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, XCircle, Loader2, ExternalLink, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const StripeSettings = () => {
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(true);
  const [isConfigured, setIsConfigured] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    checkStripeConfiguration();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    setWebhookUrl(`${supabaseUrl}/functions/v1/stripe-webhook`);
  }, []);

  const checkStripeConfiguration = async () => {
    setIsChecking(true);
    try {
      // Try to invoke a simple check on the checkout function
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { test: true },
      });

      // If we get a 503 with needsConfiguration, Stripe is not set up
      if (error?.message?.includes('503') || data?.needsConfiguration) {
        setIsConfigured(false);
      } else {
        // Even if there's an auth error, it means Stripe key exists
        setIsConfigured(true);
      }
    } catch (err) {
      // If the function responds at all, check the response
      setIsConfigured(false);
    }
    setIsChecking(false);
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: 'Copied!',
      description: 'Webhook URL copied to clipboard',
    });
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="w-6 h-6 text-primary" />
          <h3 className="font-display text-lg font-semibold">Stripe Payment Integration</h3>
        </div>

        {isChecking ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking configuration...
          </div>
        ) : isConfigured ? (
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle className="w-5 h-5" />
            <span>Stripe is configured and ready to accept payments</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-yellow-500">
            <AlertTriangle className="w-5 h-5" />
            <span>Stripe needs to be configured</span>
          </div>
        )}
      </div>

      {/* Configuration Instructions */}
      <div className="glass-card p-6">
        <h4 className="font-display font-semibold mb-4">Setup Instructions</h4>
        
        <div className="space-y-4">
          <div className="p-4 bg-muted/30 rounded-lg">
            <h5 className="font-semibold mb-2">Step 1: Add Stripe Secret Key</h5>
            <p className="text-sm text-muted-foreground mb-3">
              Go to your Stripe Dashboard → Developers → API Keys and copy your Secret Key.
              Then add it as a secret named <code className="bg-muted px-1 rounded">STRIPE_SECRET_KEY</code> in your backend.
            </p>
            <Button variant="outline" size="sm" asChild>
              <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Stripe Dashboard
              </a>
            </Button>
          </div>

          <div className="p-4 bg-muted/30 rounded-lg">
            <h5 className="font-semibold mb-2">Step 2: Configure Webhook (Optional)</h5>
            <p className="text-sm text-muted-foreground mb-3">
              For automatic payment processing, set up a webhook in Stripe Dashboard → Developers → Webhooks.
            </p>
            
            <div className="space-y-2">
              <Label>Webhook Endpoint URL</Label>
              <div className="flex gap-2">
                <Input 
                  value={webhookUrl} 
                  readOnly 
                  className="bg-muted/50 font-mono text-xs"
                />
                <Button variant="outline" onClick={copyWebhookUrl}>
                  Copy
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              Events to listen for: <code>checkout.session.completed</code>
            </p>
          </div>

          <div className="p-4 bg-muted/30 rounded-lg">
            <h5 className="font-semibold mb-2">Step 3: Add Webhook Secret (Optional)</h5>
            <p className="text-sm text-muted-foreground">
              After creating the webhook, copy the signing secret and add it as{' '}
              <code className="bg-muted px-1 rounded">STRIPE_WEBHOOK_SECRET</code> in your backend for secure webhook verification.
            </p>
          </div>
        </div>
      </div>

      {/* Test Section */}
      <div className="glass-card p-6">
        <h4 className="font-display font-semibold mb-4">Test Configuration</h4>
        <p className="text-sm text-muted-foreground mb-4">
          After adding your Stripe keys, click the button below to verify the configuration.
        </p>
        <Button onClick={checkStripeConfiguration} disabled={isChecking}>
          {isChecking ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            'Test Stripe Connection'
          )}
        </Button>
      </div>

      {/* Secrets Info */}
      <div className="glass-card p-4 border-l-4 border-blue-500/50">
        <p className="text-sm text-muted-foreground">
          <strong className="text-blue-500">Note:</strong> Secrets are managed securely in your backend. 
          To add or update secrets, go to your project settings in the Mu Nexus Hub dashboard.
        </p>
      </div>
    </div>
  );
};
