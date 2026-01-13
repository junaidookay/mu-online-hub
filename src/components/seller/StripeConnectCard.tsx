import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  CreditCard, ExternalLink, CheckCircle, AlertCircle, 
  Loader2, Wallet, ArrowRight 
} from 'lucide-react';

interface BalanceItem {
  amount: number;
  currency: string;
}

interface ConnectStatus {
  connected: boolean;
  stripeConfigured: boolean;
  onboardingComplete: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  balance?: {
    available: BalanceItem[];
    pending: BalanceItem[];
  };
}

export function StripeConnectCard() {
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchStatus();
    
    // Check for return from Stripe
    if (searchParams.get('stripe_success') === 'true') {
      toast({ title: 'Success', description: 'Your Stripe account has been connected!' });
      fetchStatus();
    } else if (searchParams.get('stripe_refresh') === 'true') {
      toast({ title: 'Info', description: 'Please complete your Stripe onboarding.' });
    }
  }, [searchParams]);

  const fetchStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-connect-status');
      if (error) throw error;
      setStatus(data);
    } catch (error: unknown) {
      console.error('Error fetching connect status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-connect-account');
      if (error) throw error;
      
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to start onboarding';
      toast({ title: 'Error', description: message, variant: 'destructive' });
      setIsConnecting(false);
    }
  };

  const handleDashboard = async () => {
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

  if (!status?.stripeConfigured) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Payment Setup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0" />
            <div>
              <p className="text-sm text-foreground">Payment system is being set up</p>
              <p className="text-xs text-muted-foreground">The admin will configure payments soon.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status.connected || !status.onboardingComplete) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Connect Your Stripe Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connect your Stripe account to receive payments directly from buyers. 
            You'll be able to withdraw your earnings at any time.
          </p>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Secure payment processing</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Direct deposits to your bank</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Real-time earnings tracking</span>
            </div>
          </div>

          <Button 
            onClick={handleConnect} 
            className="w-full btn-fantasy-primary"
            disabled={isConnecting}
          >
            {isConnecting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <ArrowRight className="w-4 h-4 mr-2" />
            )}
            {status.connected ? 'Complete Onboarding' : 'Connect with Stripe'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Connected and onboarding complete
  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Your Earnings
          </CardTitle>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
            <CheckCircle className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.balance && (
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Available Balance</p>
              <p className="text-xl font-bold text-green-400">
                {status.balance.available.length > 0 
                  ? `$${status.balance.available[0].amount.toFixed(2)}`
                  : '$0.00'}
              </p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Pending</p>
              <p className="text-xl font-bold text-yellow-400">
                {status.balance.pending.length > 0 
                  ? `$${status.balance.pending[0].amount.toFixed(2)}`
                  : '$0.00'}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={handleDashboard} 
            variant="outline"
            className="flex-1"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Stripe Dashboard
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground text-center">
          Manage payouts, view transactions, and update settings in your Stripe dashboard.
        </p>
      </CardContent>
    </Card>
  );
}