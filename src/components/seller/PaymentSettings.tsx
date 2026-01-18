import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  CreditCard, Wallet, Loader2, CheckCircle, 
  AlertCircle, ExternalLink, ArrowRight, Save
} from 'lucide-react';

interface PaymentSettings {
  stripe_enabled: boolean;
  paypal_enabled: boolean;
  paypal_email: string;
  preferred_method: 'stripe' | 'paypal' | null;
}

interface StripeConnectStatus {
  connected: boolean;
  stripeConfigured: boolean;
  onboardingComplete: boolean;
}

interface PaymentConfigItem {
  config_key: string;
  is_enabled: boolean;
}

export function PaymentSettings() {
  const [settings, setSettings] = useState<PaymentSettings>({
    stripe_enabled: false,
    paypal_enabled: false,
    paypal_email: '',
    preferred_method: null,
  });
  const [stripeStatus, setStripeStatus] = useState<StripeConnectStatus | null>(null);
  const [paypalGlobalEnabled, setPaypalGlobalEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    try {
      // Fetch seller payment settings
      const { data: settingsData } = await supabase
        .from('seller_payment_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (settingsData) {
        setSettings({
          stripe_enabled: settingsData.stripe_enabled || false,
          paypal_enabled: settingsData.paypal_enabled || false,
          paypal_email: settingsData.paypal_email || '',
          preferred_method: settingsData.preferred_method as 'stripe' | 'paypal' | null,
        });
      }

      // Fetch Stripe connect status
      try {
        const { data: connectData } = await supabase.functions.invoke('get-connect-status');
        if (connectData) {
          setStripeStatus(connectData);
        }
      } catch (err) {
        console.log('Stripe not configured');
      }

      // Check if PayPal is globally enabled
      const { data: configData } = await supabase
        .from('payment_config')
        .select('config_key, is_enabled')
        .eq('config_key', 'paypal')
        .single();

      if (configData) {
        setPaypalGlobalEnabled(configData.is_enabled || false);
      }
    } catch (error) {
      console.error('Error fetching payment settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('seller_payment_settings')
        .upsert({
          user_id: user.id,
          stripe_enabled: settings.stripe_enabled,
          paypal_enabled: settings.paypal_enabled,
          paypal_email: settings.paypal_email || null,
          preferred_method: settings.preferred_method,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast({ title: 'Success', description: 'Payment settings saved' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to save settings';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectStripe = async () => {
    setIsConnectingStripe(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account');
      if (error) throw error;
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to start onboarding';
      toast({ title: 'Error', description: message, variant: 'destructive' });
      setIsConnectingStripe(false);
    }
  };

  const handleStripeDashboard = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-login');
      if (error) throw error;
      
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to open dashboard';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          Payment Methods for Receiving Money
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stripe Section */}
        <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <CreditCard className="w-6 h-6 text-primary" />
              <div>
                <h4 className="font-semibold">Stripe</h4>
                <p className="text-xs text-muted-foreground">Accept credit/debit card payments</p>
              </div>
            </div>
            {stripeStatus?.onboardingComplete ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary">
                <AlertCircle className="w-3 h-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </div>

          {stripeStatus?.onboardingComplete ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="stripe_enabled">Enable Stripe Payments</Label>
                <Switch
                  id="stripe_enabled"
                  checked={settings.stripe_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, stripe_enabled: checked })}
                />
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleStripeDashboard}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Stripe Dashboard
              </Button>
            </div>
          ) : (
            <Button 
              onClick={handleConnectStripe}
              disabled={isConnectingStripe}
              className="w-full btn-fantasy-primary"
            >
              {isConnectingStripe ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              Connect with Stripe
            </Button>
          )}
        </div>

        {/* PayPal Section */}
        <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Wallet className="w-6 h-6 text-blue-500" />
              <div>
                <h4 className="font-semibold">PayPal</h4>
                <p className="text-xs text-muted-foreground">Accept PayPal payments</p>
              </div>
            </div>
            {paypalGlobalEnabled ? (
              settings.paypal_enabled && settings.paypal_email ? (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Linked
                </Badge>
              ) : (
                <Badge variant="secondary">Not Linked</Badge>
              )
            ) : (
              <Badge variant="secondary">
                <AlertCircle className="w-3 h-3 mr-1" />
                Not Available
              </Badge>
            )}
          </div>

          {paypalGlobalEnabled ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="paypal_enabled">Enable PayPal Payments</Label>
                <Switch
                  id="paypal_enabled"
                  checked={settings.paypal_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, paypal_enabled: checked })}
                />
              </div>
              {settings.paypal_enabled && (
                <div className="space-y-2">
                  <Label htmlFor="paypal_email">PayPal Email Address</Label>
                  <Input
                    id="paypal_email"
                    type="email"
                    placeholder="your@paypal.com"
                    value={settings.paypal_email}
                    onChange={(e) => setSettings({ ...settings, paypal_email: e.target.value })}
                    className="bg-muted/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Buyers will send payments to this PayPal email
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              PayPal payments are not enabled by the platform administrator yet.
            </p>
          )}
        </div>

        {/* Preferred Method */}
        {(settings.stripe_enabled || settings.paypal_enabled) && (
          <div className="p-4 bg-muted/30 rounded-lg border border-border/50">
            <Label className="mb-3 block">Preferred Payment Method</Label>
            <div className="flex gap-3">
              {settings.stripe_enabled && (
                <Button
                  variant={settings.preferred_method === 'stripe' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSettings({ ...settings, preferred_method: 'stripe' })}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Stripe
                </Button>
              )}
              {settings.paypal_enabled && (
                <Button
                  variant={settings.preferred_method === 'paypal' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSettings({ ...settings, preferred_method: 'paypal' })}
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  PayPal
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This will be shown as your preferred payment method to buyers
            </p>
          </div>
        )}

        <Button 
          onClick={handleSave}
          disabled={isSaving}
          className="w-full btn-fantasy-primary"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Payment Settings
        </Button>
      </CardContent>
    </Card>
  );
}
