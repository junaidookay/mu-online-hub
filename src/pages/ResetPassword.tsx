import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, ArrowLeft, CheckCircle } from 'lucide-react';
import { z } from 'zod';

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    // Check if we have an access token from the reset link
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    
    if (!accessToken) {
      // No token, might be direct navigation - check session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          toast({
            title: 'Invalid Link',
            description: 'This password reset link is invalid or has expired.',
            variant: 'destructive',
          });
          navigate('/auth');
        }
      });
    }
  }, [navigate, toast]);

  const validatePassword = (): boolean => {
    const newErrors: string[] = [];

    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.push(...e.errors.map(err => err.message));
      }
    }

    if (password !== confirmPassword) {
      newErrors.push('Passwords do not match');
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword()) return;

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setSuccess(true);
      toast({
        title: 'Password Updated',
        description: 'Your password has been successfully updated.',
      });

      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    }

    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-16 max-w-md">
          <div className="glass-card p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold mb-2">
              Password Updated!
            </h1>
            <p className="text-muted-foreground mb-4">
              Your password has been successfully updated. Redirecting to dashboard...
            </p>
            <Button onClick={() => navigate('/dashboard')} className="btn-fantasy-primary">
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-16 max-w-md">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/auth')} 
          className="mb-6 gap-2"
        >
          <ArrowLeft size={18} />
          Back to Login
        </Button>

        <div className="glass-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="text-primary" size={28} />
            <h1 className="font-display text-2xl font-bold text-gradient-gold">
              Set New Password
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                className="bg-muted/50 mt-2"
                required
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="bg-muted/50 mt-2"
                required
              />
            </div>

            {errors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <ul className="text-sm text-destructive space-y-1">
                  {errors.map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Password must be at least 8 characters with uppercase, lowercase, and numbers.
            </div>

            <Button 
              type="submit"
              disabled={loading}
              className="btn-fantasy-primary w-full gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
