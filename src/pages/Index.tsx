import Header from '@/components/layout/Header';
import RotatingHeadlines from '@/components/layout/RotatingHeadlines';
import PremiumBanner from '@/components/banners/PremiumBanner';
import PremiumTextServers from '@/components/widgets/PremiumTextServers';
import QuickLinks from '@/components/widgets/QuickLinks';
import MarketplaceAdvertise from '@/components/sections/MarketplaceAdvertise';
import ServicesAdvertise from '@/components/sections/ServicesAdvertise';
import TopServers from '@/components/sections/TopServers';
import PartnersSection from '@/components/sections/PartnersSection';
import ArcanaProjects from '@/components/sections/ArcanaProjects';
import UpcomingServers from '@/components/widgets/UpcomingServers';
import RotatingPromos from '@/components/widgets/RotatingPromos';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <RotatingHeadlines />
      
      <main className="container py-6 space-y-6">
        {/* Top Row: Premium Text Servers + Banner + Upcoming Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Widget - Premium Text Servers */}
          <div className="lg:col-span-3">
            <PremiumTextServers />
          </div>
          
          {/* Center - Premium Banner */}
          <div className="lg:col-span-6">
            <PremiumBanner />
          </div>
          
          {/* Right Widget - Upcoming Servers */}
          <div className="lg:col-span-3">
            <UpcomingServers />
          </div>
        </div>

        {/* Quick Links Row */}
        <QuickLinks />

        {/* Rotating Promo Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <RotatingPromos type="discount" />
          <RotatingPromos type="event" />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column - Marketplace + Services */}
          <div className="lg:col-span-3 space-y-4">
            <MarketplaceAdvertise />
            <ServicesAdvertise />
          </div>

          {/* Center Column - Top Servers */}
          <div className="lg:col-span-6">
            <TopServers />
          </div>

          {/* Right Column - Partners + Arcana */}
          <div className="lg:col-span-3 space-y-4">
            <PartnersSection />
            <ArcanaProjects />
          </div>
        </div>

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
