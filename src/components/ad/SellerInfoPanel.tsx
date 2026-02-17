import { User, Calendar, ExternalLink, Crown, MessageCircle, Globe, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ContactSellerButton from '@/components/messaging/ContactSellerButton';

interface SellerInfoPanelProps {
  seller: {
    display_name: string | null;
    avatar_url: string | null;
    created_at: string;
  } | null;
  listingsCount: number;
  sellerId: string;
  listingTitle: string;
  website?: string;
  discordLink?: string;
  isPremium?: boolean;
  vipLevel?: string | null;
  priceUsd?: number | null;
  currentUserId?: string;
}

const SellerInfoPanel = ({
  seller,
  listingsCount,
  sellerId,
  listingTitle,
  website,
  discordLink,
  isPremium,
  vipLevel,
  priceUsd,
  currentUserId,
}: SellerInfoPanelProps) => {
  return (
    <div className="space-y-4">
      {/* Price & CTA */}
      <div className={`glass-card p-6 ${isPremium ? 'glow-border-gold' : ''}`}>
        {priceUsd != null && (
          <div className="text-center mb-5">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Price</p>
            <p className="font-display text-4xl font-bold text-primary">${priceUsd}</p>
          </div>
        )}

        <div className="space-y-3">
          {website && (
            <Button className="w-full btn-fantasy-primary gap-2" asChild>
              <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" />
                Visit Website
              </a>
            </Button>
          )}

          {discordLink && (
            <Button variant="outline" className="w-full gap-2" asChild>
              <a href={discordLink.startsWith('http') ? discordLink : `https://${discordLink}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4" />
                Join Discord
              </a>
            </Button>
          )}

          {currentUserId && currentUserId !== sellerId && (
            <ContactSellerButton sellerId={sellerId} listingTitle={listingTitle} className="w-full" />
          )}
        </div>
      </div>

      {/* Seller Info Card */}
      <div className="glass-card p-6">
        <h3 className="font-display font-semibold text-sm uppercase tracking-wider mb-4 text-muted-foreground">
          Seller Information
        </h3>

        <div className="flex items-center gap-3 mb-4">
          {seller?.avatar_url ? (
            <img src={seller.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-border" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border-2 border-border">
              <User className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="font-semibold text-foreground">{seller?.display_name || 'Anonymous'}</p>
            {isPremium && vipLevel && vipLevel !== 'none' && (
              <Badge className={vipLevel === 'diamond' ? 'bg-cyan-500/20 text-cyan-400 mt-1' : 'bg-yellow-500/20 text-yellow-400 mt-1'}>
                <Crown className="w-3 h-3 mr-1" />
                {vipLevel.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-3 text-sm">
          {seller?.created_at && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" /> Joined
              </span>
              <span className="text-foreground">{new Date(seller.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-2">
              <Package className="w-3.5 h-3.5" /> Listings
            </span>
            <span className="text-foreground">{listingsCount}</span>
          </div>

          {website && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" /> Website
              </span>
              <a
                href={website.startsWith('http') ? website : `https://${website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline truncate max-w-[160px]"
              >
                {website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SellerInfoPanel;
