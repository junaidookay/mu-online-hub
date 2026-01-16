import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send, ArrowLeft, MessageCircle, Package } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  listing_id: string | null;
}

interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  lastMessage: string;
  lastMessageAt: string;
  hasUnread: boolean;
  listingId: string | null;
  listingTitle: string | null;
}

interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

const Messages = () => {
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [activePartner, setActivePartner] = useState<Profile | null>(null);
  const [activeListing, setActiveListing] = useState<{ id: string; title: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchConversations();
  }, [user]);

  useEffect(() => {
    if (partnerId && user) {
      fetchMessages(partnerId);
      fetchPartnerProfile(partnerId);
    }
  }, [partnerId, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (partnerId && (newMsg.sender_id === partnerId || newMsg.receiver_id === partnerId)) {
            setMessages((prev) => [...prev, newMsg]);
          }
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, partnerId]);

  const fetchConversations = async () => {
    if (!user) return;

    const { data: messagesData, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    // Group by conversation partner
    const conversationMap = new Map<string, {
      partnerId: string;
      lastMessage: string;
      lastMessageAt: string;
      hasUnread: boolean;
      listingId: string | null;
    }>();

    messagesData?.forEach((msg) => {
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          partnerId,
          lastMessage: msg.content,
          lastMessageAt: msg.created_at,
          hasUnread: msg.receiver_id === user.id && !msg.is_read,
          listingId: msg.listing_id,
        });
      }
    });

    // Fetch partner profiles
    const partnerIds = Array.from(conversationMap.keys());
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', partnerIds);

    // Fetch listing titles
    const listingIds = Array.from(conversationMap.values())
      .map(c => c.listingId)
      .filter(Boolean) as string[];
    
    const { data: listings } = await supabase
      .from('listings')
      .select('id, title')
      .in('id', listingIds);

    const listingMap = new Map(listings?.map(l => [l.id, l.title]) || []);
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

    const convos: Conversation[] = Array.from(conversationMap.values()).map(c => ({
      partnerId: c.partnerId,
      partnerName: profileMap.get(c.partnerId)?.display_name || 'Unknown User',
      partnerAvatar: profileMap.get(c.partnerId)?.avatar_url || null,
      lastMessage: c.lastMessage,
      lastMessageAt: c.lastMessageAt,
      hasUnread: c.hasUnread,
      listingId: c.listingId,
      listingTitle: c.listingId ? listingMap.get(c.listingId) || null : null,
    }));

    setConversations(convos);
    setLoading(false);
  };

  const fetchMessages = async (partnerId: string) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(data || []);

    // Mark as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', partnerId)
      .eq('receiver_id', user.id)
      .eq('is_read', false);

    // Check if there's a listing associated
    const messageWithListing = data?.find(m => m.listing_id);
    if (messageWithListing?.listing_id) {
      const { data: listing } = await supabase
        .from('listings')
        .select('id, title')
        .eq('id', messageWithListing.listing_id)
        .single();
      
      if (listing) {
        setActiveListing(listing);
      }
    }
  };

  const fetchPartnerProfile = async (partnerId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .eq('user_id', partnerId)
      .single();

    if (data) {
      setActivePartner(data);
    }
  };

  const sendMessage = async () => {
    if (!user || !partnerId || !newMessage.trim()) return;

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: partnerId,
      content: newMessage.trim(),
      listing_id: activeListing?.id || null,
    });

    if (error) {
      toast.error('Failed to send message');
      return;
    }

    setNewMessage('');
    fetchMessages(partnerId);
    fetchConversations();
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <Card className="lg:col-span-1 flex flex-col">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageCircle className="w-5 h-5 text-primary" />
                Messages
              </CardTitle>
            </CardHeader>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {conversations.length === 0 && !loading && (
                  <p className="text-sm text-muted-foreground p-4 text-center">
                    No conversations yet
                  </p>
                )}
                {conversations.map((convo) => (
                  <button
                    key={convo.partnerId}
                    onClick={() => navigate(`/messages/${convo.partnerId}`)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      partnerId === convo.partnerId
                        ? 'bg-primary/10 border border-primary/30'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={convo.partnerAvatar || undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {convo.partnerName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate">
                            {convo.partnerName}
                          </span>
                          {convo.hasUnread && (
                            <Badge variant="default" className="w-2 h-2 p-0 rounded-full" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {convo.lastMessage}
                        </p>
                        {convo.listingTitle && (
                          <p className="text-[10px] text-primary truncate flex items-center gap-1 mt-0.5">
                            <Package className="w-3 h-3" />
                            {convo.listingTitle}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2 flex flex-col">
            {partnerId && activePartner ? (
              <>
                <CardHeader className="border-b py-3">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden"
                      onClick={() => navigate('/messages')}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={activePartner.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {activePartner.display_name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-base">
                        {activePartner.display_name || 'Unknown User'}
                      </CardTitle>
                      {activeListing && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          Regarding: {activeListing.title}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.sender_id === user.id ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                            msg.sender_id === user.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <p
                            className={`text-[10px] mt-1 ${
                              msg.sender_id === user.id
                                ? 'text-primary-foreground/70'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {format(new Date(msg.created_at), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                <div className="p-4 border-t">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendMessage();
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Select a conversation to start messaging</p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Messages;
