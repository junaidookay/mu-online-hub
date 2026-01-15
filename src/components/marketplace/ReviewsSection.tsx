import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Star, User, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Review {
  id: string;
  rating: number;
  title: string | null;
  content: string | null;
  is_verified_purchase: boolean;
  created_at: string;
  reviewer_profile?: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  reviewer_stats?: {
    buyer_level: number;
    badges: string[];
  } | null;
}

interface ReviewsSectionProps {
  listingId: string;
  sellerId: string;
}

export const ReviewsSection = ({ listingId, sellerId }: ReviewsSectionProps) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  useEffect(() => {
    fetchReviews();
    if (user) {
      checkPurchaseAndReview();
    }
  }, [listingId, user]);

  const fetchReviews = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        title,
        content,
        is_verified_purchase,
        created_at,
        reviewer_id
      `)
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false });

    if (data && !error) {
      // Fetch reviewer profiles separately
      const reviewsWithProfiles = await Promise.all(
        data.map(async (review) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url')
            .eq('user_id', review.reviewer_id)
            .single();
          
          const { data: stats } = await supabase
            .from('user_stats')
            .select('buyer_level, badges')
            .eq('user_id', review.reviewer_id)
            .single();

          return {
            ...review,
            reviewer_profile: profile,
            reviewer_stats: stats
          };
        })
      );
      setReviews(reviewsWithProfiles);
    }
    setIsLoading(false);
  };

  const checkPurchaseAndReview = async () => {
    // Check if user has completed a purchase
    const { data: purchase } = await supabase
      .from('listing_purchases')
      .select('id')
      .eq('listing_id', listingId)
      .eq('user_id', user?.id)
      .eq('status', 'completed')
      .limit(1)
      .single();

    setHasPurchased(!!purchase);

    // Check if user has already reviewed
    const { data: review } = await supabase
      .from('reviews')
      .select('id')
      .eq('listing_id', listingId)
      .eq('reviewer_id', user?.id)
      .limit(1)
      .single();

    setHasReviewed(!!review);
  };

  const handleSubmitReview = async () => {
    if (!user) {
      toast.error('Please sign in to leave a review');
      return;
    }

    setIsSubmitting(true);
    
    const { error } = await supabase.from('reviews').insert({
      listing_id: listingId,
      seller_id: sellerId,
      reviewer_id: user.id,
      rating,
      title: title || null,
      content: content || null,
      is_verified_purchase: hasPurchased
    });

    if (error) {
      toast.error('Failed to submit review');
      console.error(error);
    } else {
      toast.success('Review submitted successfully!');
      setShowForm(false);
      setTitle('');
      setContent('');
      setRating(5);
      fetchReviews();
      setHasReviewed(true);

      // Send email notification to seller
      try {
        // Get seller info
        const { data: sellerProfile } = await supabase
          .from('profiles')
          .select('email, display_name')
          .eq('user_id', sellerId)
          .single();

        // Get listing info
        const { data: listing } = await supabase
          .from('listings')
          .select('title')
          .eq('id', listingId)
          .single();

        // Get reviewer info
        const { data: reviewerProfile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .single();

        if (sellerProfile?.email) {
          await supabase.functions.invoke('send-email', {
            body: {
              type: 'new_review',
              to: sellerProfile.email,
              data: {
                sellerName: sellerProfile.display_name || 'Seller',
                listingTitle: listing?.title || 'Your Listing',
                listingId,
                rating: rating.toString(),
                reviewTitle: title || '',
                reviewContent: content || '',
                reviewerName: reviewerProfile?.display_name || 'A buyer',
                isVerified: hasPurchased.toString(),
                siteUrl: window.location.origin
              }
            }
          });
        }
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
        // Don't show error to user, review was still submitted
      }
    }
    setIsSubmitting(false);
  };

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
    : 0;

  const StarRating = ({ value, onChange }: { value: number; onChange?: (v: number) => void }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-5 h-5 cursor-pointer transition-colors ${
            star <= value ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'
          }`}
          onClick={() => onChange?.(star)}
        />
      ))}
    </div>
  );

  const getBuyerBadge = (level: number) => {
    if (level >= 5) return { label: 'Elite Buyer', color: 'bg-purple-500/20 text-purple-400' };
    if (level >= 4) return { label: 'Gold Buyer', color: 'bg-yellow-500/20 text-yellow-400' };
    if (level >= 3) return { label: 'Silver Buyer', color: 'bg-gray-400/20 text-gray-300' };
    if (level >= 2) return { label: 'Bronze Buyer', color: 'bg-orange-500/20 text-orange-400' };
    return null;
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Reviews
            {reviews.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
              </span>
            )}
          </CardTitle>
          {reviews.length > 0 && (
            <div className="flex items-center gap-2">
              <StarRating value={Math.round(averageRating)} />
              <span className="font-bold">{averageRating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Write Review Button */}
        {user && user.id !== sellerId && !hasReviewed && (
          <div>
            {!showForm ? (
              <Button onClick={() => setShowForm(true)} variant="outline">
                Write a Review
              </Button>
            ) : (
              <div className="space-y-4 p-4 border border-border/50 rounded-lg">
                <div>
                  <label className="text-sm font-medium mb-2 block">Rating</label>
                  <StarRating value={rating} onChange={setRating} />
                </div>
                <Input
                  placeholder="Review title (optional)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Textarea
                  placeholder="Share your experience with this listing..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                />
                {hasPurchased && (
                  <p className="text-sm text-green-500 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Verified purchase - your review will be marked as verified
                  </p>
                )}
                <div className="flex gap-2">
                  <Button onClick={handleSubmitReview} disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Review'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {hasReviewed && (
          <p className="text-sm text-muted-foreground">You have already reviewed this listing.</p>
        )}

        {/* Reviews List */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="h-24 bg-muted/20 rounded animate-pulse" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No reviews yet. Be the first to review!</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => {
              const buyerBadge = getBuyerBadge(review.reviewer_stats?.buyer_level || 1);
              
              return (
                <div key={review.id} className="p-4 border border-border/50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        {review.reviewer_profile?.avatar_url ? (
                          <img 
                            src={review.reviewer_profile.avatar_url} 
                            alt="" 
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {review.reviewer_profile?.display_name || 'Anonymous'}
                          </span>
                          {review.is_verified_purchase && (
                            <Badge className="bg-green-500/20 text-green-400 text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                          {buyerBadge && (
                            <Badge className={`text-xs ${buyerBadge.color}`}>
                              {buyerBadge.label}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(review.created_at), 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    <StarRating value={review.rating} />
                  </div>
                  {review.title && (
                    <h4 className="font-semibold mb-1">{review.title}</h4>
                  )}
                  {review.content && (
                    <p className="text-muted-foreground">{review.content}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
