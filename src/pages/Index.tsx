import Header from '@/components/layout/Header';
import PremiumBanner from '@/components/banners/PremiumBanner';
import PremiumTextServers from '@/components/widgets/PremiumTextServers';
import UpcomingServers from '@/components/widgets/UpcomingServers';
import RotatingPromos from '@/components/widgets/RotatingPromos';
import { SEOHead } from '@/components/SEOHead';
import HeroSection from '@/components/home/HeroSection';
import CategoryCards from '@/components/home/CategoryCards';
import BottomGrid from '@/components/home/BottomGrid';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead />
      <Header />
      
      <main className="container py-6 space-y-6">
        {/* Hero Headline */}
        <HeroSection />

        {/* Top Row: Premium Text Servers + Banner + Upcoming Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-3">
            <PremiumTextServers />
          </div>
          <div className="lg:col-span-6">
            <PremiumBanner />
          </div>
          <div className="lg:col-span-3">
            <UpcomingServers />
          </div>
        </div>

        {/* Rotating Promo Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RotatingPromos type="discount" />
          <RotatingPromos type="event" />
        </div>

        {/* Category Cards */}
        <CategoryCards />

        {/* Bottom Grid: Marketplace, Services, Servers, Partners, Arcana */}
        <BottomGrid />

        {/* Footer */}
        <footer className="text-center py-8 border-t border-border/30">
          <p className="font-display text-lg text-gradient-gold mb-2">MU Online Hub</p>
          <p className="text-xs text-muted-foreground">
            The ultimate marketplace for MU Online servers, services & partners
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Contact</a>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;
