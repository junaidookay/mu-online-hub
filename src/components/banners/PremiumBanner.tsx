import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BannerItem {
  id: string;
  title: string;
  website: string;
  imageUrl: string;
}

const bannerData: BannerItem[] = [
  {
    id: '1',
    title: 'ARCANA MU ONLINE',
    website: 'www.arcanamuonline.com',
    imageUrl: 'https://images.unsplash.com/photo-1614854262318-831574f15f1f?w=800&h=200&fit=crop',
  },
  {
    id: '2',
    title: 'LEGENDS MU',
    website: 'www.legendsmu.com',
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&h=200&fit=crop',
  },
  {
    id: '3',
    title: 'PHOENIX MU SEASON 20',
    website: 'www.phoenixmu.net',
    imageUrl: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=800&h=200&fit=crop',
  },
];

const PremiumBanner = () => {
  const [currentBanner, setCurrentBanner] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % bannerData.length);
    }, 7000);
    
    return () => clearInterval(interval);
  }, [isPaused]);

  const goToPrev = () => {
    setCurrentBanner((prev) => (prev - 1 + bannerData.length) % bannerData.length);
  };

  const goToNext = () => {
    setCurrentBanner((prev) => (prev + 1) % bannerData.length);
  };

  const banner = bannerData[currentBanner];

  return (
    <div 
      className="relative premium-banner group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <a 
        href={`https://${banner.website}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <div className="relative aspect-[4/1] min-h-[120px] overflow-hidden rounded-lg border-2 border-primary/30">
          <img
            key={banner.id}
            src={banner.imageUrl}
            alt={banner.title}
            className="w-full h-full object-cover animate-fade-in"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold text-primary text-glow-gold">
                {banner.title}
              </h3>
              <p className="text-sm text-muted-foreground">{banner.website}</p>
            </div>
            <span className="vip-badge vip-gold">Premium</span>
          </div>
        </div>
      </a>

      {/* Navigation arrows */}
      <button
        onClick={(e) => { e.preventDefault(); goToPrev(); }}
        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-background/80 rounded-full 
                   opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={(e) => { e.preventDefault(); goToNext(); }}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-background/80 rounded-full 
                   opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
      >
        <ChevronRight size={20} />
      </button>

      {/* Dots indicator */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
        {bannerData.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentBanner(index)}
            className={`w-2 h-2 rounded-full transition-all ${
              index === currentBanner 
                ? 'bg-primary w-6' 
                : 'bg-muted-foreground/50 hover:bg-muted-foreground'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default PremiumBanner;
