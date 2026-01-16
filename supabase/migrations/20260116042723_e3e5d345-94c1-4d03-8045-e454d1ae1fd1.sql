-- Create messages table for buyer-seller communication
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies for messages
CREATE POLICY "Users can view their own messages"
ON public.messages
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can mark their received messages as read"
ON public.messages
FOR UPDATE
USING (auth.uid() = receiver_id);

-- Create conversations view for easier querying
CREATE OR REPLACE VIEW public.conversations AS
SELECT DISTINCT ON (conversation_partner)
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
ORDER BY conversation_partner, created_at DESC;

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Create index for faster message queries
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX idx_messages_listing ON public.messages(listing_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);