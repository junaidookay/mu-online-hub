import { useState, useEffect } from 'react';
import { Wallet, CheckCircle, Loader2, AlertTriangle, Save, Copy, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const PayPalSettings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [platformFeePercent, setPlatformFeePercent] = useState('0');
  const webhookUrl = `https://jbstpivfmfxmzxkeoiwh.supabase.co/functions/v1/paypal-webhook`;

  useEffect(() => {
    fetchPayPalConfig();
  }, []);

  const fetchPayPalConfig = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('payment_config')
        .select('*')
        .eq('config_key', 'paypal')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setIsEnabled(data.is_enabled || false);
        // Parse config_value for additional settings
        if (data.config_value) {
          try {
            const config = JSON.parse(data.config_value);
            setPlatformFeePercent(config.platform_fee_percent || '0');
            setIsConfigured(config.client_id_set && config.client_secret_set);
          } catch {
            // Invalid JSON, use defaults
          }
        }
      }
    } catch (err) {
      console.error('Error fetching PayPal config:', err);
    }
    setIsLoading(false);
  };

  const checkPayPalConfiguration = async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-paypal-config');
      
      if (error) throw error;
      
      setIsConfigured(data?.configured || false);
      toast({
        title: data?.configured ? 'PayPal Configured' : 'PayPal Not Configured',
        description: data?.configured 
          ? 'PayPal API credentials are valid and working.' 
          : 'Please add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to your secrets.',
        variant: data?.configured ? 'default' : 'destructive',
      });
    } catch (err) {
      setIsConfigured(false);
      toast({
        title: 'Configuration Check Failed',
        description: 'Could not verify PayPal configuration. Ensure the test function is deployed.',
        variant: 'destructive',
      });
    }
    setIsChecking(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const configValue = JSON.stringify({
        platform_fee_percent: platformFeePercent,
        client_id_set: isConfigured,
        client_secret_set: isConfigured,
      });

      const { error } = await supabase
        .from('payment_config')
        .upsert({
          config_key: 'paypal',
          is_enabled: isEnabled,
          config_value: configValue,
        }, {
          onConflict: 'config_key'
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'PayPal settings saved successfully',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to save PayPal settings',
        variant: 'destructive',
      });
    }
    setIsSaving(false);
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({
      title: 'Copied',
      description: 'Webhook URL copied to clipboard',
    });
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Wallet className="w-6 h-6 text-blue-500" />
          <h3 className="font-display text-lg font-semibold">PayPal Payments</h3>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading configuration...
          </div>
        ) : isConfigured ? (
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle className="w-5 h-5" />
            <span>PayPal is configured and ready to accept payments</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-yellow-500">
            <AlertTriangle className="w-5 h-5" />
            <span>PayPal requires API credentials to be configured</span>
          </div>
        )}
      </div>

      {/* Configuration */}
      <div className="glass-card p-6">
        <h4 className="font-display font-semibold mb-4">PayPal Configuration</h4>
        
        <div className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <Label htmlFor="paypal_enabled" className="font-semibold">Enable PayPal Payments</Label>
              <p className="text-sm text-muted-foreground mt-1">
                When enabled, buyers can pay using PayPal at checkout.
              </p>
            </div>
            <Switch
              id="paypal_enabled"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>

          {/* Platform Fee */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <Label htmlFor="platform_fee" className="font-semibold">Platform Fee (%)</Label>
            <p className="text-sm text-muted-foreground mt-1 mb-3">
              Percentage fee the platform takes from each transaction. Set to 0 for no fee.
            </p>
            <Input
              id="platform_fee"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={platformFeePercent}
              onChange={(e) => setPlatformFeePercent(e.target.value)}
              className="max-w-32 bg-background"
              placeholder="0"
            />
          </div>

          {/* Setup Instructions */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <h5 className="font-semibold mb-3">Setup Instructions</h5>
            <ol className="text-sm text-muted-foreground space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">1.</span>
                <span>
                  Go to{' '}
                  <a 
                    href="https://developer.paypal.com/dashboard/applications" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    PayPal Developer Dashboard
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">2.</span>
                <span>Create a new REST API app or use an existing one</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">3.</span>
                <span>Copy your <strong>Client ID</strong> and <strong>Client Secret</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">4.</span>
                <span>Add them as secrets: <code className="bg-background px-2 py-0.5 rounded">PAYPAL_CLIENT_ID</code> and <code className="bg-background px-2 py-0.5 rounded">PAYPAL_CLIENT_SECRET</code></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">5.</span>
                <span>Configure the webhook URL in PayPal:</span>
              </li>
            </ol>
            
            <div className="mt-3 flex items-center gap-2">
              <Input 
                value={webhookUrl} 
                readOnly 
                className="bg-background font-mono text-xs"
              />
              <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Subscribe to events: <code>CHECKOUT.ORDER.APPROVED</code>, <code>PAYMENT.CAPTURE.COMPLETED</code>
            </p>
          </div>

          {/* How PayPal Works */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <h5 className="font-semibold mb-2">How PayPal Orders API Works</h5>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary">1.</span>
                <span>Platform creates PayPal order with full transaction details</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">2.</span>
                <span>Buyer approves payment on PayPal</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">3.</span>
                <span>PayPal sends webhook to platform for confirmation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">4.</span>
                <span>Platform activates listing/slot and records analytics</span>
              </li>
            </ul>
          </div>

          {/* Analytics Note */}
          <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
            <p className="text-sm">
              <strong>Full Tracking Enabled:</strong> All PayPal transactions are tracked for analytics, 
              including buyer, seller, amount, and listing details. View combined Stripe + PayPal data in the Analytics tab.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button 
              onClick={checkPayPalConfiguration}
              disabled={isChecking}
              variant="outline"
              className="flex-1"
            >
              {isChecking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                'Test PayPal Connection'
              )}
            </Button>
            
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 btn-fantasy-primary"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save PayPal Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
