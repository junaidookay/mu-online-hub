import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  RefreshCw, 
  Edit, 
  Trash2, 
  ExternalLink,
  Calendar,
  CreditCard
} from 'lucide-react';
import { format } from 'date-fns';
import { SLOT_CONFIG, getSlotConfig } from '@/lib/slotConfig';
import { useNavigate } from 'react-router-dom';
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

interface SlotPurchase {
  id: string;
  slot_id: number;
  package_id: string | null;
  is_active: boolean | null;
  expires_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface SlotListing {
  id: string;
  type: 'server' | 'advertisement' | 'banner' | 'promo' | 'text_server';
  name: string;
  website: string;
  slot_id: number | null;
  is_active: boolean | null;
  expires_at: string | null;
  created_at: string;
}

export const MySlotListings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [slotPurchases, setSlotPurchases] = useState<SlotPurchase[]>([]);
  const [listings, setListings] = useState<SlotListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<SlotListing | null>(null);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch slot purchases
      const { data: purchases } = await supabase
        .from('slot_purchases')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (purchases) {
        setSlotPurchases(purchases);
      }

      // Fetch all user's slot-based listings
      const allListings: SlotListing[] = [];

      // Servers (slots 3, 6)
      const { data: servers } = await supabase
        .from('servers')
        .select('id, name, website, slot_id, is_active, expires_at, created_at')
        .eq('user_id', user.id)
        .not('slot_id', 'is', null);

      if (servers) {
        allListings.push(...servers.map(s => ({
          ...s,
          type: 'server' as const,
        })));
      }

      // Advertisements (slots 1, 2)
      const { data: ads } = await supabase
        .from('advertisements')
        .select('id, title, website, slot_id, is_active, expires_at, created_at')
        .eq('user_id', user.id)
        .not('slot_id', 'is', null);

      if (ads) {
        allListings.push(...ads.map(a => ({
          ...a,
          type: 'advertisement' as const,
          name: a.title,
        })));
      }

      // Premium text servers (slot 4)
      const { data: textServers } = await supabase
        .from('premium_text_servers')
        .select('id, name, website, slot_id, is_active, expires_at, created_at')
        .eq('user_id', user.id);

      if (textServers) {
        allListings.push(...textServers.map(t => ({
          ...t,
          type: 'text_server' as const,
        })));
      }

      // Sort by created_at descending
      allListings.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setListings(allListings);

    } catch (error) {
      console.error('Error fetching listings:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch your listings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getListingStatus = (listing: SlotListing) => {
    if (!listing.is_active) {
      return { label: 'Inactive', variant: 'secondary' as const };
    }
    if (listing.expires_at && new Date(listing.expires_at) < new Date()) {
      return { label: 'Expired', variant: 'destructive' as const };
    }
    return { label: 'Active', variant: 'default' as const };
  };

  const handleDelete = async () => {
    if (!listingToDelete) return;

    let tableName: 'servers' | 'advertisements' | 'premium_text_servers';
    switch (listingToDelete.type) {
      case 'server':
        tableName = 'servers';
        break;
      case 'advertisement':
        tableName = 'advertisements';
        break;
      case 'text_server':
        tableName = 'premium_text_servers';
        break;
      default:
        return;
    }

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
        description: 'Listing deleted successfully',
      });
      fetchData();
    }

    setDeleteDialogOpen(false);
    setListingToDelete(null);
  };

  const handleRenew = (slotId: number) => {
    navigate(`/pricing`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="glass-card p-6 text-center">
        <h3 className="font-display text-lg font-semibold mb-2">No Listings Yet</h3>
        <p className="text-muted-foreground mb-4">
          Purchase a package to create your first homepage listing.
        </p>
        <Button onClick={() => navigate('/pricing')} className="btn-fantasy-primary">
          View Packages
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">My Homepage Listings</h3>
        <Button variant="ghost" size="sm" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="space-y-3">
        {listings.map((listing) => {
          const status = getListingStatus(listing);
          const slotConfig = listing.slot_id ? getSlotConfig(listing.slot_id) : null;

          return (
            <div
              key={listing.id}
              className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{listing.name}</span>
                  <Badge variant={status.variant}>{status.label}</Badge>
                  {slotConfig && (
                    <Badge variant="outline" className="text-xs">
                      {slotConfig.name}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <a
                    href={`https://${listing.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-primary"
                  >
                    {listing.website}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  {listing.expires_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Expires: {format(new Date(listing.expires_at), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {status.label === 'Expired' && listing.slot_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRenew(listing.slot_id!)}
                    className="text-primary"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Renew
                  </Button>
                )}
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

      {/* Active Slot Purchases Summary */}
      {slotPurchases.filter(p => p.is_active).length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Active Slot Purchases
          </h4>
          <div className="grid gap-2">
            {slotPurchases
              .filter(p => p.is_active)
              .map((purchase) => {
                const slotConfig = getSlotConfig(purchase.slot_id);
                const isExpired = purchase.expires_at && new Date(purchase.expires_at) < new Date();

                return (
                  <div
                    key={purchase.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      isExpired ? 'bg-destructive/10' : 'bg-primary/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {slotConfig?.name || `Slot ${purchase.slot_id}`}
                      </span>
                      {isExpired && (
                        <Badge variant="destructive" className="text-xs">
                          Expired
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {purchase.expires_at ? (
                        isExpired ? (
                          <span className="text-destructive">
                            Expired {format(new Date(purchase.expires_at), 'MMM d, yyyy')}
                          </span>
                        ) : (
                          `Expires ${format(new Date(purchase.expires_at), 'MMM d, yyyy')}`
                        )
                      ) : (
                        'No expiration'
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Listing?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{listingToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
