import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  ExternalLink, 
  Package,
  Calendar,
  User,
  ShoppingCart,
  Loader2,
  CheckCircle
} from 'lucide-react';
import Header from '@/components/layout/Header';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { categoryIcons, categoryLabels } from '@/lib/categories';
import { ReviewsSection } from '@/components/marketplace/ReviewsSection';
import { UserBadges } from '@/components/user/UserBadges';
import ContactSellerButton from '@/components/messaging/ContactSellerButton';
import { useListingViews } from '@/hooks/useListingViews';
import { CheckoutModal } from '@/components/checkout/CheckoutModal';
import { normalizeExternalUrl } from '@/lib/utils';

interface Listing {
  id: string;
  title: string;
  description: string | null;
  category: string;
  price_usd: number | null;
  website: string | null;
  image_url: string | null;
  is_published: boolean;
  expires_at: string | null;
  created_at: string;
  user_id: string;
}

interface SellerProfile {
  display_name: string | null;
  avatar_url: string | null;
}

interface SellerStats {
  seller_level: number;
  seller_xp: number;
  sales_count: number;
  badges: string[];
}

const ListingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [sellerStats, setSellerStats] = useState<SellerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  // Track listing view
  useListingViews(id);
  useEffect(() => {
    if (id) {
      fetchListing();
    }
  }, [id]);

  useEffect(() => {
    // Show success message if coming back from successful payment
    if (searchParams.get('success') === 'true') {
      toast({
        title: 'Purchase Successful!',
        description: 'Thank you for your purchase. The seller will be notified.',
      });
    }
  }, [searchParams]);

  const fetchListing = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', id)
      .single();

    if (data && !error) {
      setListing(data);
      
      // Fetch seller profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('user_id', data.user_id)
        .single();
      
      setSellerProfile(profile);

      // Fetch seller stats
      const { data: stats } = await supabase
        .from('user_stats')
        .select('seller_level, seller_xp, sales_count, badges')
        .eq('user_id', data.user_id)
        .single();
      
      setSellerStats(stats);
    } else {
      toast({
        title: 'Error',
        description: 'Listing not found',
        variant: 'destructive',
      });
      navigate('/marketplace');
    }
    setIsLoading(false);
  };

  const handlePurchase = async () => {
    if (!user) {
      toast({
        title: 'Login Required',
        description: 'Please login to purchase this listing',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    if (!listing?.price_usd) {
      // If no price, just open the website
      if (listing?.website) {
        window.open(listing.website, '_blank');
      }
      return;
    }

    // Open the checkout modal with payment options
    setShowCheckoutModal(true);
  };

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

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12 text-center">
          <p className="text-muted-foreground">Listing not found</p>
          <Button asChild className="mt-4">
            <Link to="/marketplace">Back to Marketplace</Link>
          </Button>
        </div>
      </div>
    );
  }

  const Icon = categoryIcons[listing.category] || Package;
  const websiteHref = normalizeExternalUrl(listing.website);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={`${listing.title} - MU Online Marketplace`}
        description={listing.description || `${categoryLabels[listing.category]} listing on MU Online Marketplace`}
        keywords={`MU Online, ${categoryLabels[listing.category]}, marketplace`}
      />
      <Header />
      
      <main className="container py-8">
        {/* Back Button */}
        <Button variant="ghost" asChild className="mb-6 gap-2">
          <Link to="/marketplace">
            <ArrowLeft size={18} />
            Back to Marketplace
          </Link>
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image */}
            {listing.image_url ? (
              <div className="glass-card overflow-hidden">
                <img 
                  src={listing.image_url} 
                  alt={listing.title}
                  className="w-full aspect-video object-cover"
                />
              </div>
            ) : (
              <div className="glass-card aspect-video flex items-center justify-center bg-muted/20">
                <Icon className="w-24 h-24 text-muted-foreground" />
              </div>
            )}

            {/* Details */}
            <div className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-primary/90">
                  <Icon className="w-3 h-3 mr-1" />
                  {categoryLabels[listing.category]}
                </Badge>
                {listing.expires_at && (
                  <Badge variant="outline" className="text-muted-foreground">
                    <Calendar className="w-3 h-3 mr-1" />
                    Expires {new Date(listing.expires_at).toLocaleDateString()}
                  </Badge>
                )}
              </div>

              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
                {listing.title}
              </h1>

              {listing.description && (
                <div className="prose prose-invert max-w-none">
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {listing.description}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Price Card */}
            <div className="glass-card p-6 glow-border-gold">
              {listing.price_usd ? (
                <div className="text-center mb-6">
                  <p className="text-sm text-muted-foreground mb-1">Price</p>
                  <p className="font-display text-4xl font-bold text-primary">
                    ${listing.price_usd.toFixed(2)}
                  </p>
                </div>
              ) : (
                <div className="text-center mb-6">
                  <p className="text-sm text-muted-foreground mb-1">Price</p>
                  <p className="font-display text-2xl font-bold text-primary">
                    Contact Seller
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {listing.price_usd ? (
                  <Button 
                    className="w-full btn-fantasy-primary gap-2"
                    onClick={handlePurchase}
                    disabled={isPurchasing}
                  >
                    {isPurchasing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="w-4 h-4" />
                    )}
                    {isPurchasing ? 'Processing...' : 'Buy Now'}
                  </Button>
                ) : null}

                {websiteHref && (
                  <Button 
                    variant="outline" 
                    className="w-full btn-fantasy-outline gap-2"
                    asChild
                  >
                    <a href={websiteHref} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                      Visit Website
                    </a>
                  </Button>
                )}

                {user?.id !== listing.user_id && (
                  <ContactSellerButton 
                    sellerId={listing.user_id}
                    listingId={listing.id}
                    listingTitle={listing.title}
                    className="w-full"
                  />
                )}
              </div>
            </div>

            {/* Seller Info */}
            <div className="glass-card p-6">
              <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                <User className="w-4 h-4" />
                Seller Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {sellerProfile?.avatar_url ? (
                    <img 
                      src={sellerProfile.avatar_url} 
                      alt="" 
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">
                      {sellerProfile?.display_name || 'Anonymous Seller'}
                    </p>
                    {sellerStats && sellerStats.sales_count > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {sellerStats.sales_count} sales
                      </p>
                    )}
                  </div>
                </div>
                
                {sellerStats && (
                  <UserBadges 
                    badges={sellerStats.badges || []}
                    sellerLevel={sellerStats.seller_level}
                    compact
                  />
                )}
                
                <p className="text-xs text-muted-foreground">
                  Listed on {new Date(listing.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Safety Notice */}
            <div className="glass-card p-4 border-l-4 border-yellow-500/50">
              <p className="text-xs text-muted-foreground">
                <strong className="text-yellow-500">Safety Notice:</strong> Always verify the seller 
                and product before making a purchase. MU Online Hub does not guarantee third-party products.
              </p>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-8">
          <ReviewsSection listingId={listing.id} sellerId={listing.user_id} />
        </div>
      </main>

      {/* Checkout Modal */}
      {listing.price_usd && (
        <CheckoutModal
          isOpen={showCheckoutModal}
          onClose={() => setShowCheckoutModal(false)}
          listing={{
            id: listing.id,
            title: listing.title,
            price_usd: listing.price_usd,
            user_id: listing.user_id,
          }}
          sellerName={sellerProfile?.display_name || 'Seller'}
        />
      )}
    </div>
  );
};

export default ListingDetail;
