import { useState, useEffect } from 'react';
import { Wallet, CheckCircle, Loader2, AlertTriangle, Save, Copy, ExternalLink, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type ConnectionStatus = 'not_configured' | 'invalid_credentials' | 'connected' | 'checking' | 'error';

interface PayPalConfig {
  client_id_set: boolean;
  client_secret_set: boolean;
  webhook_id_set: boolean;
  environment: 'sandbox' | 'live' | null;
  last_verified: string | null;
  platform_fee_percent: string;
}

export const PayPalSettings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('not_configured');
  const [environment, setEnvironment] = useState<'sandbox' | 'live' | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [platformFeePercent, setPlatformFeePercent] = useState('0');
  const [lastVerified, setLastVerified] = useState<string | null>(null);
  const [config, setConfig] = useState<PayPalConfig | null>(null);
  
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
        if (data.config_value) {
          try {
            const parsedConfig: PayPalConfig = JSON.parse(data.config_value);
            setConfig(parsedConfig);
            setPlatformFeePercent(parsedConfig.platform_fee_percent || '0');
            setEnvironment(parsedConfig.environment || null);
            setLastVerified(parsedConfig.last_verified || null);
            
            if (parsedConfig.client_id_set && parsedConfig.client_secret_set) {
              setConnectionStatus('connected');
            } else {
              setConnectionStatus('not_configured');
            }
          } catch {
            setConnectionStatus('not_configured');
          }
        }
      } else {
        setConnectionStatus('not_configured');
      }
    } catch (err) {
      console.error('Error fetching PayPal config:', err);
      setConnectionStatus('error');
    }
    setIsLoading(false);
  };

  const checkPayPalConfiguration = async () => {
    setIsChecking(true);
    setConnectionStatus('checking');
    
    try {
      const { data, error } = await supabase.functions.invoke('test-paypal-config');
      
      if (error) throw error;
      
      if (data?.configured) {
        setConnectionStatus('connected');
        setEnvironment(data.environment || null);
        setConfig(prev => prev ? { 
          ...prev, 
          client_id_set: true, 
          client_secret_set: true,
          webhook_id_set: data.hasWebhookId || false,
          environment: data.environment,
          last_verified: new Date().toISOString(),
        } : null);
        setLastVerified(new Date().toISOString());
        
        toast({
          title: 'PayPal Connected',
          description: `Successfully connected to PayPal ${data.environment?.toUpperCase() || ''} environment.`,
        });
      } else if (data?.status === 'invalid_credentials') {
        setConnectionStatus('invalid_credentials');
        toast({
          title: 'Invalid Credentials',
          description: data.message || 'PayPal credentials are invalid.',
          variant: 'destructive',
        });
      } else {
        setConnectionStatus('not_configured');
        toast({
          title: 'PayPal Not Configured',
          description: data?.message || 'Please add PayPal credentials to your secrets.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      setConnectionStatus('error');
      toast({
        title: 'Configuration Check Failed',
        description: 'Could not verify PayPal configuration. Ensure the edge function is deployed.',
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
        client_id_set: connectionStatus === 'connected',
        client_secret_set: connectionStatus === 'connected',
        webhook_id_set: config?.webhook_id_set || false,
        environment: environment,
        last_verified: lastVerified,
      });

      const { error } = await supabase
        .from('payment_config')
        .upsert({
          config_key: 'paypal',
          is_enabled: isEnabled && connectionStatus === 'connected',
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

  const renderConnectionStatus = () => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading configuration...
        </div>
      );
    }

    switch (connectionStatus) {
      case 'connected':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle className="w-5 h-5" />
              <span>PayPal Connected</span>
              {environment && (
                <Badge variant={environment === 'live' ? 'default' : 'secondary'} className="ml-2">
                  {environment.toUpperCase()}
                </Badge>
              )}
            </div>
            {lastVerified && (
              <p className="text-xs text-muted-foreground">
                Last verified: {new Date(lastVerified).toLocaleString()}
              </p>
            )}
          </div>
        );
      
      case 'invalid_credentials':
        return (
          <div className="flex items-center gap-2 text-destructive">
            <XCircle className="w-5 h-5" />
            <span>Invalid Credentials</span>
          </div>
        );
      
      case 'checking':
        return (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Testing connection...
          </div>
        );
      
      case 'error':
        return (
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            <span>Error checking configuration</span>
          </div>
        );
      
      default:
        return (
          <div className="flex items-center gap-2 text-yellow-500">
            <AlertTriangle className="w-5 h-5" />
            <span>PayPal Not Configured</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Wallet className="w-6 h-6 text-blue-500" />
            <h3 className="font-display text-lg font-semibold">PayPal Payments</h3>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={fetchPayPalConfig}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        {renderConnectionStatus()}
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
                {connectionStatus === 'connected' 
                  ? 'When enabled, buyers can pay using PayPal at checkout.'
                  : 'Configure PayPal credentials first to enable payments.'}
              </p>
            </div>
            <Switch
              id="paypal_enabled"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
              disabled={connectionStatus !== 'connected'}
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
                <span>
                  Add them as secrets in{' '}
                  <a 
                    href="https://muonlinehub.com/projects/3ca42b71-f136-43b4-879f-a4ddfca37437/settings/secrets" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Mu Nexus Hub Project Secrets
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  :
                </span>
              </li>
              <li className="pl-6">
                <ul className="list-disc space-y-1">
                  <li><code className="bg-background px-2 py-0.5 rounded">PAYPAL_CLIENT_ID</code></li>
                  <li><code className="bg-background px-2 py-0.5 rounded">PAYPAL_CLIENT_SECRET</code></li>
                  <li><code className="bg-background px-2 py-0.5 rounded">PAYPAL_WEBHOOK_ID</code> (optional, for signature verification)</li>
                </ul>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold">5.</span>
                <span>Configure the webhook URL in PayPal Developer Dashboard:</span>
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

          {/* Credentials Status */}
          <div className="p-4 bg-muted/30 rounded-lg">
            <h5 className="font-semibold mb-3">Credentials Status</h5>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>PAYPAL_CLIENT_ID</span>
                {config?.client_id_set ? (
                  <Badge variant="default" className="bg-green-600">Configured</Badge>
                ) : (
                  <Badge variant="secondary">Not Set</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span>PAYPAL_CLIENT_SECRET</span>
                {config?.client_secret_set ? (
                  <Badge variant="default" className="bg-green-600">Configured</Badge>
                ) : (
                  <Badge variant="secondary">Not Set</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span>PAYPAL_WEBHOOK_ID</span>
                {config?.webhook_id_set ? (
                  <Badge variant="default" className="bg-green-600">Configured</Badge>
                ) : (
                  <Badge variant="outline">Optional</Badge>
                )}
              </div>
            </div>
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
                  Testing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Test PayPal Connection
                </>
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
