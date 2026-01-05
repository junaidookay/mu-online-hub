import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';

const slogans = [
  "The ultimate marketplace for MU Online...",
  "Find the best servers, services & partners...",
  "Your gateway to the MU Online universe...",
  "Premium advertising for serious projects...",
];

const Header = () => {
  const [currentSlogan, setCurrentSlogan] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlogan((prev) => (prev + 1) % slogans.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full glass-card border-b border-border/30">
      <div className="container flex items-center justify-between h-16 px-4">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-gradient-gold">
            MU Online Hub
          </h1>
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
          <Button variant="ghost" className="btn-fantasy-outline">
            MU Online Guides
          </Button>
          <Button variant="ghost" className="btn-fantasy-outline">
            Support
          </Button>
          <Button className="btn-fantasy-primary">
            Log in
          </Button>
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
          <Button variant="ghost" className="w-full justify-start">
            MU Online Guides
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            Support
          </Button>
          <Button className="btn-fantasy-primary w-full">
            Log in
          </Button>
        </nav>
      )}
    </header>
  );
};

export default Header;
