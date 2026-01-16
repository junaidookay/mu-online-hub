-- Fix function search path
CREATE OR REPLACE FUNCTION public.get_user_conversations()
RETURNS TABLE (
  conversation_id TEXT,
  conversation_partner UUID,
  listing_id UUID,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  has_unread BOOLEAN
)
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT ON (
    CASE 
      WHEN sender_id < receiver_id THEN sender_id || '-' || receiver_id
      ELSE receiver_id || '-' || sender_id
    END
  )
    CASE 
      WHEN sender_id < receiver_id THEN sender_id || '-' || receiver_id
      ELSE receiver_id || '-' || sender_id
    END as conversation_id,
    CASE 
      WHEN sender_id = auth.uid() THEN receiver_id
      ELSE sender_id
    END as conversation_partner,
    listing_id,
    content as last_message,
    created_at as last_message_at,
    CASE WHEN receiver_id = auth.uid() AND is_read = false THEN true ELSE false END as has_unread
  FROM public.messages
  WHERE sender_id = auth.uid() OR receiver_id = auth.uid()
  ORDER BY 
    CASE 
      WHEN sender_id < receiver_id THEN sender_id || '-' || receiver_id
      ELSE receiver_id || '-' || sender_id
    END,
    created_at DESC
$$;