import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Loader2, Image as ImageIcon, Tag } from 'lucide-react';
import Header from '@/components/layout/Header';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ImageLightbox from '@/components/gallery/ImageLightbox';
import VideoEmbed from '@/components/ad/VideoEmbed';
import SellerInfoPanel from '@/components/ad/SellerInfoPanel';
import DOMPurify from 'dompurify';
import { categoryLabels } from '@/lib/categories';
import type { Tables } from '@/integrations/supabase/types';

type AdvertisementType = Tables<'advertisements'>;

interface SellerProfile {
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

const AdDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [ad, setAd] = useState<AdvertisementType | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [sellerListingsCount, setSellerListingsCount] = useState(0);
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
      const [profileRes, countRes] = await Promise.all([
        supabase.from('profiles').select('display_name, avatar_url, created_at').eq('user_id', data.user_id).maybeSingle(),
        supabase.from('advertisements').select('id', { count: 'exact', head: true }).eq('user_id', data.user_id).eq('is_active', true),
      ]);
      setSeller(profileRes.data);
      setSellerListingsCount(countRes.count || 0);
    } else {
      setNotFound(true);
    }
    setIsLoading(false);
  };

  const adType = ad?.ad_type || 'marketplace';
  const backPath = adType === 'services' ? '/services-ads' : '/marketplace-ads';
  const backLabel = adType === 'services' ? 'Services Ads' : 'Marketplace Ads';
  const galleryImages = ad?.banner_url ? [ad.banner_url] : [];
  const isPremium = ad?.vip_level && ad.vip_level !== 'none';

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

  const metaDescription = ad.short_description || ad.description || `${ad.title} on MU Online Hub`;
  const sanitizedFullDescription = ad.full_description
    ? DOMPurify.sanitize(ad.full_description)
    : null;
  const tags: string[] = ad.tags || [];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={`${ad.title} - MU Online ${adType === 'services' ? 'Services' : 'Marketplace'}`}
        description={metaDescription}
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
            {/* Banner - Original Aspect Ratio */}
            {galleryImages.length > 0 ? (
              <div className={`glass-card overflow-hidden ${isPremium ? 'glow-border-gold' : ''}`}>
                <div
                  className="cursor-pointer relative group"
                  onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
                >
                  <img
                    src={galleryImages[0]}
                    alt={ad.title}
                    className="w-full h-auto object-contain"
                    loading="lazy"
                    style={{ maxHeight: '500px' }}
                  />
                  <div className="absolute inset-0 bg-background/0 group-hover:bg-background/20 transition-colors flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-foreground opacity-0 group-hover:opacity-80 transition-opacity" />
                  </div>
                </div>

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
            ) : null}

            {/* Title + Badges */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <Badge variant="outline">{adType === 'services' ? 'Service' : 'Marketplace'}</Badge>
                {isPremium && (
                  <Badge className={ad.vip_level === 'diamond' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-yellow-500/20 text-yellow-400'}>
                    <span className="mr-1">👑</span>
                    {ad.vip_level?.toUpperCase()} Premium
                  </Badge>
                )}
                {ad.category && (
                  <Badge variant="secondary">{categoryLabels[ad.category] || ad.category}</Badge>
                )}
              </div>

              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">{ad.title}</h1>

              {/* Short Description */}
              {ad.short_description && (
                <p className="text-muted-foreground text-base leading-relaxed mb-4">{ad.short_description}</p>
              )}

              {/* Structured Fields */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mb-4">
                {ad.delivery_time && (
                  <span>⏱ Delivery: <span className="text-foreground">{ad.delivery_time}</span></span>
                )}
                {ad.price_range && (
                  <span>💰 Range: <span className="text-foreground">{ad.price_range}</span></span>
                )}
                {ad.location && (
                  <span>📍 Location: <span className="text-foreground">{ad.location}</span></span>
                )}
                {ad.experience_level && (
                  <span>⭐ Experience: <span className="text-foreground">{ad.experience_level}</span></span>
                )}
                {ad.supported_seasons && (
                  <span>🎮 Seasons: <span className="text-foreground">{ad.supported_seasons}</span></span>
                )}
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="gap-1 text-xs">
                      <Tag className="w-3 h-3" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-4 text-xs text-muted-foreground border-t border-border pt-4">
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

            {/* Video Embed */}
            {ad.video_url && <VideoEmbed url={ad.video_url} />}

            {/* Full Description (Rich HTML) */}
            {sanitizedFullDescription && (
              <div className="glass-card p-6">
                <h2 className="font-display text-lg font-semibold mb-4 text-foreground">Full Description</h2>
                <div
                  className="prose prose-invert max-w-none 
                    prose-headings:font-display prose-headings:text-foreground
                    prose-p:text-muted-foreground prose-p:leading-relaxed
                    prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                    prose-li:text-muted-foreground
                    prose-strong:text-foreground"
                  dangerouslySetInnerHTML={{ __html: sanitizedFullDescription }}
                />
              </div>
            )}

            {/* Fallback: plain description if no full_description */}
            {!sanitizedFullDescription && ad.description && (
              <div className="glass-card p-6">
                <h2 className="font-display text-lg font-semibold mb-4 text-foreground">Description</h2>
                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{ad.description}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <SellerInfoPanel
              seller={seller}
              listingsCount={sellerListingsCount}
              sellerId={ad.user_id}
              listingTitle={ad.title}
              website={ad.website}
              discordLink={ad.discord_link}
              isPremium={isPremium}
              vipLevel={ad.vip_level}
              priceUsd={ad.price_usd}
              currentUserId={user?.id}
            />

            {ad.expires_at && (
              <div className="glass-card p-4 border-l-4 border-yellow-500/50 mt-4">
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
