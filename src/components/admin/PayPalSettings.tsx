import { useState, useEffect } from 'react';
import { Wallet, CheckCircle, XCircle, Loader2, AlertTriangle, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const PayPalSettings = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);

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
      }
    } catch (err) {
      console.error('Error fetching PayPal config:', err);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('payment_config')
        .upsert({
          config_key: 'paypal',
          is_enabled: isEnabled,
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
        ) : isEnabled ? (
          <div className="flex items-center gap-2 text-green-500">
            <CheckCircle className="w-5 h-5" />
            <span>PayPal is enabled - Sellers can link their PayPal accounts</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-yellow-500">
            <AlertTriangle className="w-5 h-5" />
            <span>PayPal is currently disabled</span>
          </div>
        )}
      </div>

      {/* Configuration */}
      <div className="glass-card p-6">
        <h4 className="font-display font-semibold mb-4">PayPal Configuration</h4>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <Label htmlFor="paypal_enabled" className="font-semibold">Enable PayPal Payments</Label>
              <p className="text-sm text-muted-foreground mt-1">
                When enabled, sellers can link their PayPal email to receive payments from buyers.
              </p>
            </div>
            <Switch
              id="paypal_enabled"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>

          <div className="p-4 bg-muted/30 rounded-lg">
            <h5 className="font-semibold mb-2">How PayPal Works</h5>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary">1.</span>
                <span>Sellers link their PayPal email in their payment settings</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">2.</span>
                <span>Buyers see PayPal as a payment option at checkout</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">3.</span>
                <span>Buyers pay directly to seller's PayPal (peer-to-peer)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">4.</span>
                <span>No platform fees are collected for PayPal transactions</span>
              </li>
            </ul>
          </div>

          <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-sm text-yellow-400">
              <strong>Note:</strong> PayPal payments are direct transfers between buyers and sellers. 
              The platform does not process or handle these payments.
            </p>
          </div>

          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="w-full btn-fantasy-primary"
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
  );
};
