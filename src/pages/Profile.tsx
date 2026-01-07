import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/upload/ImageUpload';
import { Loader2, Save, ArrowLeft, User } from 'lucide-react';

interface ProfileData {
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

const Profile = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<ProfileData>({
    display_name: '',
    avatar_url: '',
    email: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, email')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setProfile({
        display_name: data.display_name || '',
        avatar_url: data.avatar_url || '',
        email: data.email || user.email || '',
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
      })
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });
    }
    setSaving(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8 max-w-2xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/dashboard')} 
          className="mb-6 gap-2"
        >
          <ArrowLeft size={18} />
          Back to Dashboard
        </Button>

        <div className="glass-card p-8">
          <div className="flex items-center gap-3 mb-8">
            <User className="text-primary" size={28} />
            <h1 className="font-display text-2xl font-bold text-gradient-gold">
              Edit Profile
            </h1>
          </div>

          <div className="space-y-6">
            <div>
              <Label className="text-base mb-3 block">Profile Picture</Label>
              <div className="flex items-start gap-6">
                {profile.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Avatar" 
                    className="w-24 h-24 rounded-full object-cover border-2 border-primary"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                    <User size={32} className="text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <ImageUpload
                    bucket="banners"
                    userId={user.id}
                    onUploadComplete={(url) => setProfile({ ...profile, avatar_url: url })}
                    currentImageUrl={profile.avatar_url || undefined}
                    aspectRatio="1:1"
                    maxSizeMB={2}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={profile.display_name || ''}
                onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                placeholder="Your display name"
                className="bg-muted/50 mt-2"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={profile.email || ''}
                disabled
                className="bg-muted/30 mt-2 opacity-60"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email cannot be changed here
              </p>
            </div>

            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="btn-fantasy-primary w-full gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
