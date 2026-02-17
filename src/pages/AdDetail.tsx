import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Calendar, User, Clock, Globe, Loader2, Crown, Image as ImageIcon, MessageCircle } from 'lucide-react';
import Header from '@/components/layout/Header';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import ContactSellerButton from '@/components/messaging/ContactSellerButton';
import { useAuth } from '@/contexts/AuthContext';
import ImageLightbox from '@/components/gallery/ImageLightbox';
import { toast } from 'sonner';

type Advertisement = Tables<'advertisements'>;

interface SellerProfile {
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

const AdDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [ad, setAd] = useState<Advertisement | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (slug) fetchAd();
  }, [slug]);

  const fetchAd = async () => {
    setIsLoading(true);
    const query = supabase.from('advertisements').select('*').eq('slug', slug!).maybeSingle();
    let { data } = await query;
    if (!data) {
      const { data: byId } = await supabase.from('advertisements').select('*').eq('id', slug!).maybeSingle();
      data = byId;
    }
    if (data) {
      setAd(data);
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, created_at')
        .eq('user_id', data.user_id)
        .maybeSingle();
      setSeller(profile);
    } else {
      setNotFound(true);
    }
    setIsLoading(false);
  };

  const adType = ad?.ad_type || 'marketplace';
  const backPath = adType === 'services' ? '/services-ads' : '/marketplace-ads';
  const backLabel = adType === 'services' ? 'Services Ads' : 'Marketplace Ads';

  // Build gallery from banner_url (future: extend with gallery_urls column)
  const galleryImages = ad?.banner_url ? [ad.banner_url] : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (notFound || !ad) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead title="Listing Not Available" />
        <Header />
        <div className="container py-12 text-center">
          <h1 className="text-2xl font-display font-bold text-foreground mb-4">Listing Not Available</h1>
          <p className="text-muted-foreground mb-6">This listing may have expired or been removed.</p>
          <Button asChild><Link to={backPath}>Back to {backLabel}</Link></Button>
        </div>
      </div>
    );
  }

  const isExpired = ad.expires_at && new Date(ad.expires_at) < new Date();
  const isInactive = !ad.is_active;
  const isPremium = ad.vip_level && ad.vip_level !== 'none';
  const sellerId = ad.user_id;
  const isValidSellerId = typeof sellerId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sellerId);

  if (isExpired || isInactive) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead title="Listing Not Available" />
        <Header />
        <div className="container py-12 text-center">
          <h1 className="text-2xl font-display font-bold text-foreground mb-4">Listing Not Available</h1>
          <p className="text-muted-foreground mb-6">This listing has expired or is no longer active.</p>
          <Button asChild><Link to={backPath}>Back to {backLabel}</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${ad.title} - MU Online ${adType === 'services' ? 'Services' : 'Marketplace'}`}
        description={ad.description || `${ad.title} on MU Online Hub`}
      />
      <Header />

      {lightboxOpen && galleryImages.length > 0 && (
        <ImageLightbox
          images={galleryImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      <main className="container py-8">
        <Button variant="ghost" asChild className="mb-6 gap-2">
          <Link to={backPath}>
            <ArrowLeft size={18} />
            Back to {backLabel}
          </Link>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Banner / Gallery */}
            {galleryImages.length > 0 ? (
              <div className={`glass-card overflow-hidden ${isPremium ? 'glow-border-gold' : ''}`}>
                <div
                  className="cursor-pointer relative group"
                  onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
                >
                  <img src={galleryImages[0]} alt={ad.title} className="w-full aspect-video object-cover" />
                  <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-foreground opacity-0 group-hover:opacity-80 transition-opacity" />
                  </div>
                </div>

                {/* Thumbnail gallery row */}
                {galleryImages.length > 1 && (
                  <div className="p-2 flex gap-2 overflow-x-auto scrollbar-thin">
                    {galleryImages.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => { setLightboxIndex(i); setLightboxOpen(true); }}
                        className={`shrink-0 w-20 h-14 rounded overflow-hidden border-2 transition-colors ${
                          i === 0 ? 'border-primary' : 'border-border/30 hover:border-primary/50'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-card aspect-video flex items-center justify-center bg-muted/20">
                <Globe className="w-24 h-24 text-muted-foreground" />
              </div>
            )}

            {/* Details */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <Badge variant="outline">{adType === 'services' ? 'Service' : 'Marketplace'}</Badge>
                {isPremium && (
                  <Badge className={ad.vip_level === 'diamond' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-yellow-500/20 text-yellow-400'}>
                    <Crown className="w-3 h-3 mr-1" />
                    {ad.vip_level?.toUpperCase()} Premium
                  </Badge>
                )}
                {ad.category && <Badge variant="secondary">{ad.category}</Badge>}
              </div>

              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">{ad.title}</h1>

              {ad.description && (
                <div className="prose prose-invert max-w-none">
                  <p className="text-muted-foreground whitespace-pre-wrap">{ad.description}</p>
                </div>
              )}

              <div className="flex items-center gap-4 mt-6 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Created {new Date(ad.created_at).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Updated {new Date(ad.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className={`glass-card p-6 ${isPremium ? 'glow-border-gold' : ''}`}>
              {ad.price_usd && (
                <div className="text-center mb-6">
                  <p className="text-sm text-muted-foreground mb-1">Price</p>
                  <p className="font-display text-4xl font-bold text-primary">${ad.price_usd}</p>
                </div>
              )}
              <div className="space-y-3">
                <Button className="w-full btn-fantasy-primary gap-2" asChild>
                  <a href={`https://${ad.website}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                    Visit Website
                  </a>
                </Button>
                {user?.id !== sellerId && (
                  isValidSellerId ? (
                    <ContactSellerButton sellerId={sellerId} listingTitle={ad.title} className="w-full" />
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => toast.error('Seller messaging is not available for this ad')}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Contact Seller
                    </Button>
                  )
                )}
              </div>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                <User className="w-4 h-4" />
                Seller Information
              </h3>
              <div className="flex items-center gap-3">
                {seller?.avatar_url ? (
                  <img src={seller.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{seller?.display_name || 'Anonymous'}</p>
                  {seller?.created_at && (
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(seller.created_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {ad.expires_at && (
              <div className="glass-card p-4 border-l-4 border-yellow-500/50">
                <p className="text-xs text-muted-foreground">
                  <strong className="text-yellow-500">Expires:</strong>{' '}
                  {new Date(ad.expires_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdDetail;
