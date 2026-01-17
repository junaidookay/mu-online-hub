import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  Menu, X, LogOut, Shield, User, Crown, UserCircle, Store, Wrench, 
  Server, Sparkles, DollarSign, Package, LayoutDashboard, ShoppingBag, Search, Users, MessageCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

const slogans = [
  "The ultimate marketplace for MU Online...",
  "Find the best servers, services & partners...",
  "Your gateway to the MU Online universe...",
  "Premium advertising for serious projects...",
];

const navLinks = [
  { icon: Store, label: 'Marketplace', href: '/marketplace', description: 'Digital products & server files' },
  { icon: Wrench, label: 'Services', href: '/services', description: 'Professional MU services' },
  { icon: Server, label: 'Create Server', href: '/create-server', description: 'Launch your server' },
  { icon: Sparkles, label: 'Arcana', href: '/arcana-projects', description: 'Partner network' },
];

const Header = () => {
  const [currentSlogan, setCurrentSlogan] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userType, setUserType] = useState<'buyer' | 'seller' | null>(null);
  const { user, isAdmin, signOut, isLoading } = useAuth();
  const navigate = useNavigate();
  const unreadMessages = useUnreadMessages();
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlogan((prev) => (prev + 1) % slogans.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserType();
    } else {
      setUserType(null);
    }
  }, [user]);

  const fetchUserType = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('user_id', user.id)
      .single();
    
    if (data?.user_type) {
      setUserType(data.user_type as 'buyer' | 'seller');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isSeller = userType === 'seller';

  return (
    <header className="sticky top-0 z-50 w-full glass-card border-b border-border/30">
      <div className="container flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-4">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-gradient-gold">
              MU Online Hub
            </h1>
          </button>
          <div className="hidden lg:block overflow-hidden max-w-[250px]">
            <p 
              key={currentSlogan}
              className="text-sm text-muted-foreground animate-fade-in truncate"
            >
              {slogans[currentSlogan]}
            </p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger className="bg-transparent hover:bg-muted/50 text-sm">
                  Browse
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid gap-2 p-4 w-[300px]">
                    {navLinks.map((link) => (
                      <Link
                        key={link.href}
                        to={link.href}
                        className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors group"
                      >
                        <link.icon className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                        <div>
                          <div className="text-sm font-medium">{link.label}</div>
                          <div className="text-xs text-muted-foreground">{link.description}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          <Button variant="ghost" size="sm" className="text-sm" onClick={() => navigate('/pricing')}>
            <Crown size={14} className="mr-1" />
            Premium
          </Button>

          {!isLoading && (
            <>
              {user ? (
                <>
                  <NotificationBell />
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="relative"
                    onClick={() => navigate('/messages')}
                  >
                    <MessageCircle size={18} />
                    {unreadMessages > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium">
                        {unreadMessages > 99 ? '99+' : unreadMessages}
                      </span>
                    )}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <User size={14} />
                        {user.email?.split('@')[0]}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {/* General section */}
                      <DropdownMenuLabel className="text-xs text-muted-foreground">General</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                        <LayoutDashboard size={16} className="mr-2" />
                        My Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/messages')} className="flex items-center justify-between">
                        <span className="flex items-center">
                          <MessageCircle size={16} className="mr-2" />
                          Messages
                        </span>
                        {unreadMessages > 0 && (
                          <span className="min-w-[20px] h-[20px] px-1 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                            {unreadMessages > 99 ? '99+' : unreadMessages}
                          </span>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/profile')}>
                        <UserCircle size={16} className="mr-2" />
                        My Profile
                      </DropdownMenuItem>

                    {/* Seller section */}
                    {isSeller && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-muted-foreground">Seller</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => navigate('/seller-dashboard')}>
                          <Store size={16} className="mr-2" />
                          Seller Dashboard
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/seller/earnings')}>
                          <DollarSign size={16} className="mr-2" />
                          Earnings
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/seller/profile/${user.id}`)}>
                          <User size={16} className="mr-2" />
                          Public Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/seller-dashboard/create')}>
                          <Package size={16} className="mr-2" />
                          Create Listing
                        </DropdownMenuItem>
                      </>
                    )}

                    {/* Buyer section - show option to become seller */}
                    {!isSeller && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-muted-foreground">Buyer</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => navigate('/buyer/dashboard')}>
                          <LayoutDashboard size={16} className="mr-2" />
                          Buyer Dashboard
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/marketplace')}>
                          <ShoppingBag size={16} className="mr-2" />
                          Browse Marketplace
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/sellers')}>
                          <Users size={16} className="mr-2" />
                          Find Sellers
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/seller-onboarding')}>
                          <Store size={16} className="mr-2" />
                          Become a Seller
                        </DropdownMenuItem>
                      </>
                    )}

                    {/* Admin section */}
                    {isAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-muted-foreground">Admin</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => navigate('/admin')}>
                          <Shield size={16} className="mr-2" />
                          Admin Panel
                        </DropdownMenuItem>
                      </>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                      <LogOut size={16} className="mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </>
              ) : (
                <Button className="btn-fantasy-primary" size="sm" onClick={() => navigate('/auth')}>
                  Log in
                </Button>
              )}
            </>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-foreground"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <nav className="md:hidden flex flex-col gap-1 p-4 border-t border-border/30 animate-fade-in">
          <div className="pb-2 mb-2 border-b border-border/30">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Browse</p>
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <link.icon className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-sm font-medium">{link.label}</div>
                  <div className="text-xs text-muted-foreground">{link.description}</div>
                </div>
              </Link>
            ))}
          </div>
          
          <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate('/pricing'); setIsMenuOpen(false); }}>
            <Crown size={16} className="mr-2" />
            Premium
          </Button>
          
          {!isLoading && (
            <>
              {user ? (
                <>
                  <div className="pb-2 mb-2 border-b border-border/30">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 mt-2">Account</p>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate('/dashboard'); setIsMenuOpen(false); }}>
                      <LayoutDashboard size={16} className="mr-2" />
                      My Dashboard
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate('/messages'); setIsMenuOpen(false); }}>
                      <MessageCircle size={16} className="mr-2" />
                      Messages
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate('/profile'); setIsMenuOpen(false); }}>
                      <UserCircle size={16} className="mr-2" />
                      My Profile
                    </Button>
                  </div>

                  {isSeller && (
                    <div className="pb-2 mb-2 border-b border-border/30">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Seller</p>
                      <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate('/seller-dashboard'); setIsMenuOpen(false); }}>
                        <Store size={16} className="mr-2" />
                        Seller Dashboard
                      </Button>
                      <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate('/seller/earnings'); setIsMenuOpen(false); }}>
                        <DollarSign size={16} className="mr-2" />
                        Earnings
                      </Button>
                      <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate(`/seller/profile/${user.id}`); setIsMenuOpen(false); }}>
                        <User size={16} className="mr-2" />
                        Public Profile
                      </Button>
                    </div>
                  )}

                  {!isSeller && (
                    <div className="pb-2 mb-2 border-b border-border/30">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Buyer</p>
                      <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate('/buyer/dashboard'); setIsMenuOpen(false); }}>
                        <LayoutDashboard size={16} className="mr-2" />
                        Buyer Dashboard
                      </Button>
                      <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate('/marketplace'); setIsMenuOpen(false); }}>
                        <ShoppingBag size={16} className="mr-2" />
                        Browse Marketplace
                      </Button>
                      <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate('/sellers'); setIsMenuOpen(false); }}>
                        <Users size={16} className="mr-2" />
                        Find Sellers
                      </Button>
                      <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate('/seller-onboarding'); setIsMenuOpen(false); }}>
                        <Store size={16} className="mr-2" />
                        Become a Seller
                      </Button>
                    </div>
                  )}

                  {isAdmin && (
                    <Button variant="ghost" className="w-full justify-start" onClick={() => { navigate('/admin'); setIsMenuOpen(false); }}>
                      <Shield size={16} className="mr-2" />
                      Admin Panel
                    </Button>
                  )}
                  <Button variant="ghost" className="w-full justify-start text-destructive" onClick={handleSignOut}>
                    <LogOut size={16} className="mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <Button className="btn-fantasy-primary w-full" onClick={() => { navigate('/auth'); setIsMenuOpen(false); }}>
                  Log in
                </Button>
              )}
            </>
          )}
        </nav>
      )}
    </header>
  );
};

export default Header;
