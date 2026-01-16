import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ContactSellerButtonProps {
  sellerId: string;
  listingId?: string;
  listingTitle?: string;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const ContactSellerButton = ({
  sellerId,
  listingId,
  listingTitle,
  className,
  variant = 'outline',
  size = 'default',
}: ContactSellerButtonProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleContact = async () => {
    if (!user) {
      toast.error('Please sign in to contact the seller');
      navigate('/auth');
      return;
    }

    if (user.id === sellerId) {
      toast.error("You can't message yourself");
      return;
    }

    setLoading(true);

    try {
      // Check if there's already a conversation
      const { data: existingMessages } = await supabase
        .from('messages')
        .select('id')
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${sellerId}),and(sender_id.eq.${sellerId},receiver_id.eq.${user.id})`
        )
        .limit(1);

      if (existingMessages && existingMessages.length > 0) {
        // Navigate to existing conversation
        navigate(`/messages/${sellerId}`);
      } else {
        // Create initial message
        const initialMessage = listingTitle
          ? `Hi! I'm interested in your listing: "${listingTitle}"`
          : "Hi! I'd like to chat with you.";

        const { error } = await supabase.from('messages').insert({
          sender_id: user.id,
          receiver_id: sellerId,
          content: initialMessage,
          listing_id: listingId || null,
        });

        if (error) throw error;

        toast.success('Conversation started!');
        navigate(`/messages/${sellerId}`);
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleContact}
      disabled={loading}
      className={className}
    >
      <MessageCircle className="w-4 h-4 mr-2" />
      {loading ? 'Starting...' : 'Contact Seller'}
    </Button>
  );
};

export default ContactSellerButton;
