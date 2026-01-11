import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { SEOHead } from '@/components/SEOHead';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, ShoppingCart, Store } from 'lucide-react';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

type AuthMode = 'login' | 'signup' | 'forgot';
type UserType = 'buyer' | 'seller';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const initialType = searchParams.get('type') === 'seller' ? 'seller' : 'buyer';

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [userType, setUserType] = useState<UserType>(initialType);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { user, signIn, signUp, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user && !isLoading) {
      // Check if user is a seller without categories (needs onboarding)
      checkSellerStatus(user.id);
    }
  }, [user, isLoading]);

  const checkSellerStatus = async (userId: string) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('user_id', userId)
      .single();

    if (profile?.user_type === 'seller') {
      // Check if seller has categories
      const { data: categories } = await supabase
        .from('seller_categories')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (!categories || categories.length === 0) {
        navigate('/seller-onboarding');
        return;
      }
      navigate('/seller-dashboard');
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setErrors({ email: emailResult.error.errors[0].message });
      return;
    }

    if (mode === 'forgot') {
      setIsSubmitting(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        setResetSent(true);
        toast({ title: 'Reset Email Sent', description: 'Check your email for the password reset link.' });
      }
      setIsSubmitting(false);
      return;
    }

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      setErrors({ password: passwordResult.error.errors[0].message });
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) {
          toast({ title: 'Login Failed', description: error.message, variant: 'destructive' });
        }
        // Navigation handled in useEffect after user state updates
      } else {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          toast({ title: 'Sign Up Failed', description: error.message, variant: 'destructive' });
        } else {
          // If seller, update profile and redirect to onboarding
          if (userType === 'seller') {
            // Profile will be created by trigger, but we need to update user_type
            // This will happen after the user confirms email or auto-confirm
            toast({ 
              title: 'Account Created!', 
              description: 'Welcome! Setting up your seller account...' 
            });
            // Wait briefly for the trigger to create the profile
            setTimeout(async () => {
              const { data: { user: newUser } } = await supabase.auth.getUser();
              if (newUser) {
                await supabase
                  .from('profiles')
                  .update({ user_type: 'seller' })
                  .eq('user_id', newUser.id);
                navigate('/seller-onboarding');
              }
            }, 1000);
          }
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <SEOHead 
        title={mode === 'signup' ? 'Sign Up - MU Online Hub' : 'Sign In - MU Online Hub'}
        description="Sign in to your MU Online Hub account to manage your servers and advertisements."
      />
      <div className="w-full max-w-md">
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold text-gradient-gold mb-2">MU Online Hub</h1>
            <p className="text-muted-foreground">
              {mode === 'login' && 'Sign in to your account'}
              {mode === 'signup' && 'Create a new account'}
              {mode === 'forgot' && 'Reset your password'}
            </p>
          </div>

          {mode === 'forgot' && resetSent ? (
            <div className="text-center space-y-4">
              <div className="text-green-400 text-lg">✓ Email Sent!</div>
              <p className="text-muted-foreground">Check your email for a password reset link.</p>
              <Button onClick={() => { setMode('login'); setResetSent(false); }} className="btn-fantasy-primary">
                Back to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div className="space-y-3">
                    <Label>I want to</Label>
                    <RadioGroup 
                      value={userType} 
                      onValueChange={(v) => setUserType(v as UserType)}
                      className="grid grid-cols-2 gap-3"
                    >
                      <label 
                        className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          userType === 'buyer' 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border/50 bg-muted/20 hover:border-border'
                        }`}
                      >
                        <RadioGroupItem value="buyer" className="sr-only" />
                        <ShoppingCart className={`w-5 h-5 ${userType === 'buyer' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div>
                          <div className="font-semibold text-sm">Buy</div>
                          <div className="text-xs text-muted-foreground">Browse & purchase</div>
                        </div>
                      </label>
                      <label 
                        className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          userType === 'seller' 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border/50 bg-muted/20 hover:border-border'
                        }`}
                      >
                        <RadioGroupItem value="seller" className="sr-only" />
                        <Store className={`w-5 h-5 ${userType === 'seller' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div>
                          <div className="font-semibold text-sm">Sell</div>
                          <div className="text-xs text-muted-foreground">List your products</div>
                        </div>
                      </label>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your display name" className="bg-muted/50" />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErrors({}); }} placeholder="Enter your email" className="bg-muted/50" />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              {mode !== 'forgot' && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => { setPassword(e.target.value); setErrors({}); }} placeholder="Enter your password" className="bg-muted/50 pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                </div>
              )}

              <Button type="submit" className="w-full btn-fantasy-primary" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {mode === 'login' && 'Sign In'}
                {mode === 'signup' && (userType === 'seller' ? 'Create Seller Account' : 'Create Account')}
                {mode === 'forgot' && 'Send Reset Link'}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center space-y-2">
            {mode === 'login' && (
              <>
                <button type="button" onClick={() => setMode('forgot')} className="text-sm text-muted-foreground hover:text-primary block w-full">Forgot password?</button>
                <button type="button" onClick={() => setMode('signup')} className="text-sm text-muted-foreground hover:text-primary">Don't have an account? Sign up</button>
              </>
            )}
            {mode === 'signup' && (
              <button type="button" onClick={() => setMode('login')} className="text-sm text-muted-foreground hover:text-primary">Already have an account? Sign in</button>
            )}
            {mode === 'forgot' && !resetSent && (
              <button type="button" onClick={() => setMode('login')} className="text-sm text-muted-foreground hover:text-primary">Back to login</button>
            )}
          </div>
        </div>
        <div className="mt-4 text-center">
          <button onClick={() => navigate('/')} className="text-sm text-muted-foreground hover:text-foreground">← Back to Home</button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
