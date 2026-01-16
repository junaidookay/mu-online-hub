import MarketplaceAdvertise from '@/components/sections/MarketplaceAdvertise';
import ServicesAdvertise from '@/components/sections/ServicesAdvertise';
import TopServers from '@/components/sections/TopServers';
import PartnersSection from '@/components/sections/PartnersSection';
import ArcanaProjects from '@/components/sections/ArcanaProjects';

const BottomGrid = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
      {/* Left Column 1 - Marketplace Ads */}
      <div className="lg:col-span-2">
        <MarketplaceAdvertise />
      </div>

      {/* Left Column 2 - Services Ads */}
      <div className="lg:col-span-2">
        <ServicesAdvertise />
      </div>

      {/* Center Column - Top Servers (Primary Focus - Widest) */}
      <div className="lg:col-span-4 md:col-span-2 lg:row-span-1">
        <TopServers />
      </div>

      {/* Right Column 1 - Partners */}
      <div className="lg:col-span-2">
        <PartnersSection />
      </div>

      {/* Right Column 2 - Arcana Projects */}
      <div className="lg:col-span-2">
        <ArcanaProjects />
      </div>
    </div>
  );
};

export default BottomGrid;
