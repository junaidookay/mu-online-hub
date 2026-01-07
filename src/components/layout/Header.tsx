import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Menu, X, LogOut, Shield, User, Crown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const slogans = [
  "The ultimate marketplace for MU Online...",
  "Find the best servers, services & partners...",
  "Your gateway to the MU Online universe...",
  "Premium advertising for serious projects...",
];

const Header = () => {
  const [currentSlogan, setCurrentSlogan] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAdmin, signOut, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlogan((prev) => (prev + 1) % slogans.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

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
          <div className="hidden md:block overflow-hidden max-w-[300px]">
            <p 
              key={currentSlogan}
              className="text-sm text-muted-foreground animate-fade-in truncate"
            >
              {slogans[currentSlogan]}
            </p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2">
          <Button variant="ghost" className="btn-fantasy-outline" onClick={() => navigate('/pricing')}>
            <Crown size={16} className="mr-1" />
            Premium
          </Button>
          <Button variant="ghost" className="btn-fantasy-outline">
            Support
          </Button>

          {!isLoading && (
            <>
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="btn-fantasy-secondary gap-2">
                      <User size={16} />
                      {user.email?.split('@')[0]}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      <User size={16} className="mr-2" />
                      My Dashboard
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => navigate('/admin')}>
                        <Shield size={16} className="mr-2" />
                        Admin Panel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                      <LogOut size={16} className="mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button className="btn-fantasy-primary" onClick={() => navigate('/auth')}>
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
        <nav className="md:hidden flex flex-col gap-2 p-4 border-t border-border/30 animate-fade-in">
          <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/pricing')}>
            <Crown size={16} className="mr-2" />
            Premium
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            Support
          </Button>
          {!isLoading && (
            <>
              {user ? (
                <>
                  <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/dashboard')}>
                    <User size={16} className="mr-2" />
                    My Dashboard
                  </Button>
                  {isAdmin && (
                    <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/admin')}>
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
                <Button className="btn-fantasy-primary w-full" onClick={() => navigate('/auth')}>
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
