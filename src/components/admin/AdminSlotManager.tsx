import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  RefreshCw, 
  Trash2, 
  Eye,
  GripVertical,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { SLOT_CONFIG, getSlotConfig } from '@/lib/slotConfig';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SlotListing {
  id: string;
  user_id: string;
  name: string;
  website: string;
  slot_id: number | null;
  is_active: boolean | null;
  expires_at: string | null;
  created_at: string;
  rotation_order?: number | null;
  table: string;
}

interface SlotPurchase {
  id: string;
  user_id: string;
  slot_id: number;
  is_active: boolean | null;
  expires_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export const AdminSlotManager = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  
  const [listings, setListings] = useState<Record<number, SlotListing[]>>({});
  const [slotPurchases, setSlotPurchases] = useState<SlotPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<SlotListing | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchAllData();
    }
  }, [isAdmin]);

  const fetchAllData = async () => {
    setLoading(true);

    try {
      const allListings: Record<number, SlotListing[]> = {};

      // Initialize all slots
      for (let i = 1; i <= 8; i++) {
        allListings[i] = [];
      }

      // Fetch servers (slots 3, 6)
      const { data: servers } = await supabase
        .from('servers')
        .select('*')
        .not('slot_id', 'is', null)
        .order('rotation_order');

      if (servers) {
        servers.forEach(s => {
          if (s.slot_id && allListings[s.slot_id]) {
            allListings[s.slot_id].push({
              id: s.id,
              user_id: s.user_id,
              name: s.name,
              website: s.website,
              slot_id: s.slot_id,
              is_active: s.is_active,
              expires_at: s.expires_at,
              created_at: s.created_at,
              rotation_order: s.rotation_order,
              table: 'servers',
            });
          }
        });
      }

      // Fetch advertisements (slots 1, 2)
      const { data: ads } = await supabase
        .from('advertisements')
        .select('*')
        .not('slot_id', 'is', null)
        .order('rotation_order');

      if (ads) {
        ads.forEach(a => {
          if (a.slot_id && allListings[a.slot_id]) {
            allListings[a.slot_id].push({
              id: a.id,
              user_id: a.user_id,
              name: a.title,
              website: a.website,
              slot_id: a.slot_id,
              is_active: a.is_active,
              expires_at: a.expires_at,
              created_at: a.created_at,
              rotation_order: a.rotation_order,
              table: 'advertisements',
            });
          }
        });
      }

      // Fetch premium text servers (slot 4)
      const { data: textServers } = await supabase
        .from('premium_text_servers')
        .select('*')
        .order('rotation_order');

      if (textServers) {
        textServers.forEach(t => {
          if (t.slot_id && allListings[t.slot_id]) {
            allListings[t.slot_id].push({
              id: t.id,
              user_id: t.user_id,
              name: t.name,
              website: t.website,
              slot_id: t.slot_id,
              is_active: t.is_active,
              expires_at: t.expires_at,
              created_at: t.created_at,
              rotation_order: t.rotation_order,
              table: 'premium_text_servers',
            });
          }
        });
      }

      // Fetch premium banners (slot 5)
      const { data: banners } = await supabase
        .from('premium_banners')
        .select('*')
        .order('display_order');

      if (banners) {
        banners.forEach(b => {
          if (b.slot_id && allListings[b.slot_id]) {
            allListings[b.slot_id].push({
              id: b.id,
              user_id: '', // Banners are admin-only
              name: b.title,
              website: b.website,
              slot_id: b.slot_id,
              is_active: b.is_active,
              expires_at: null,
              created_at: b.created_at,
              rotation_order: b.display_order,
              table: 'premium_banners',
            });
          }
        });
      }

      // Fetch rotating promos (slots 7, 8)
      const { data: promos } = await supabase
        .from('rotating_promos')
        .select('*')
        .order('created_at');

      if (promos) {
        promos.forEach(p => {
          if (p.slot_id && allListings[p.slot_id]) {
            allListings[p.slot_id].push({
              id: p.id,
              user_id: '',
              name: p.text,
              website: p.link || '',
              slot_id: p.slot_id,
              is_active: p.is_active,
              expires_at: p.expires_at,
              created_at: p.created_at,
              rotation_order: null,
              table: 'rotating_promos',
            });
          }
        });
      }

      setListings(allListings);

      // Fetch all slot purchases
      const { data: purchases } = await supabase
        .from('slot_purchases')
        .select('*')
        .order('created_at', { ascending: false });

      if (purchases) {
        setSlotPurchases(purchases);
      }

    } catch (error) {
      console.error('Error fetching slot data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch slot data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (listing: SlotListing) => {
    const tableName = listing.table as 'servers' | 'advertisements' | 'premium_text_servers' | 'premium_banners' | 'rotating_promos';
    const { error } = await supabase
      .from(tableName)
      .update({ is_active: !listing.is_active })
      .eq('id', listing.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update listing',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Updated',
        description: `Listing ${listing.is_active ? 'deactivated' : 'activated'}`,
      });
      fetchAllData();
    }
  };

  const handleDelete = async () => {
    if (!listingToDelete) return;

    const tableName = listingToDelete.table as 'servers' | 'advertisements' | 'premium_text_servers' | 'premium_banners' | 'rotating_promos';
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', listingToDelete.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete listing',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Deleted',
        description: 'Listing removed from slot',
      });
      fetchAllData();
    }

    setDeleteDialogOpen(false);
    setListingToDelete(null);
  };

  const handleActivatePayPalPurchase = async (purchaseId: string, durationDays: number = 30) => {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const { error } = await supabase
      .from('slot_purchases')
      .update({
        is_active: true,
        completed_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .eq('id', purchaseId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to activate purchase',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Activated',
        description: 'PayPal purchase has been activated',
      });
      fetchAllData();
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const slotIds = Object.keys(SLOT_CONFIG).map(Number);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Homepage Slot Manager</h2>
        <Button variant="outline" onClick={fetchAllData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Pending PayPal Purchases */}
      {slotPurchases.filter(p => !p.is_active && !p.completed_at).length > 0 && (
        <div className="glass-card p-4 border-yellow-500/50">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-yellow-500">
            <Clock className="w-4 h-4" />
            Pending PayPal Verifications
          </h3>
          <div className="space-y-2">
            {slotPurchases
              .filter(p => !p.is_active && !p.completed_at)
              .map(purchase => {
                const slotConfig = getSlotConfig(purchase.slot_id);
                return (
                  <div
                    key={purchase.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div>
                      <span className="text-sm font-medium">
                        {slotConfig?.name || `Slot ${purchase.slot_id}`}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        ID: {purchase.id.slice(0, 8)}... | Created: {format(new Date(purchase.created_at), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleActivatePayPalPurchase(purchase.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Activate
                    </Button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <Tabs defaultValue="1" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
          {slotIds.map((slotId) => {
            const config = getSlotConfig(slotId);
            const count = listings[slotId]?.length || 0;
            return (
              <TabsTrigger 
                key={slotId} 
                value={slotId.toString()}
                className="text-xs px-3 py-2"
              >
                {config?.name || `Slot ${slotId}`}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {slotIds.map((slotId) => {
          const config = getSlotConfig(slotId);
          const slotListings = listings[slotId] || [];

          return (
            <TabsContent key={slotId} value={slotId.toString()}>
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{config?.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {config?.description} 
                      {config?.isFree && <Badge variant="secondary" className="ml-2">FREE</Badge>}
                      {config?.maxListings && ` (Max: ${config.maxListings})`}
                    </p>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Active: </span>
                    <span className="font-medium text-green-400">
                      {slotListings.filter(l => l.is_active).length}
                    </span>
                    <span className="text-muted-foreground"> / Total: </span>
                    <span className="font-medium">{slotListings.length}</span>
                  </div>
                </div>

                {slotListings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No listings in this slot yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {slotListings.map((listing, index) => {
                      const isExpired = listing.expires_at && new Date(listing.expires_at) < new Date();
                      
                      return (
                        <div
                          key={listing.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border ${
                            isExpired 
                              ? 'bg-destructive/10 border-destructive/30' 
                              : listing.is_active 
                                ? 'bg-muted/30 border-border/50' 
                                : 'bg-muted/10 border-border/20'
                          }`}
                        >
                          <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{listing.name}</span>
                              {isExpired && (
                                <Badge variant="destructive" className="text-xs">Expired</Badge>
                              )}
                              {!listing.is_active && !isExpired && (
                                <Badge variant="secondary" className="text-xs">Inactive</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {listing.website && (
                                <a
                                  href={`https://${listing.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 hover:text-primary"
                                >
                                  {listing.website.slice(0, 30)}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              {listing.expires_at && (
                                <span>
                                  Expires: {format(new Date(listing.expires_at), 'MMM d, yyyy')}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Switch
                              checked={listing.is_active ?? false}
                              onCheckedChange={() => handleToggleActive(listing)}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setListingToDelete(listing);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          );
        })}
      </Tabs>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Listing?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{listingToDelete?.name}" from this slot? 
              This will delete the listing entirely.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
