import MarketplaceAdvertise from '@/components/sections/MarketplaceAdvertise';
import ServicesAdvertise from '@/components/sections/ServicesAdvertise';
import TopServers from '@/components/sections/TopServers';
import PartnersSection from '@/components/sections/PartnersSection';
import ArcanaProjects from '@/components/sections/ArcanaProjects';

const BottomGrid = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left Column - Marketplace & Services Ads */}
      <div className="lg:col-span-2 space-y-4">
        <MarketplaceAdvertise />
        <ServicesAdvertise />
      </div>

      {/* Center Column - Top Servers */}
      <div className="lg:col-span-6">
        <TopServers />
      </div>

      {/* Right Column - Partners & Arcana Projects */}
      <div className="lg:col-span-4 space-y-4">
        <PartnersSection />
        <ArcanaProjects />
      </div>
    </div>
  );
};

export default BottomGrid;
