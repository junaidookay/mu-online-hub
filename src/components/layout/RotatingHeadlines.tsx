import { useState, useEffect } from 'react';

const headlines = [
  "Create your MU Online server with us",
  "Advertise your server today",
  "Become an Arcana Partner",
  "Premium services available now",
  "Join the largest MU community",
];

const RotatingHeadlines = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % headlines.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full py-3 overflow-hidden bg-gradient-to-r from-transparent via-muted/30 to-transparent">
      <div className="container flex justify-center">
        <div className="relative h-8 flex items-center justify-center overflow-hidden">
          <h2 
            key={currentIndex}
            className="text-xl md:text-2xl font-display font-semibold text-foreground text-glow-gold animate-fade-in"
          >
            {headlines[currentIndex]}
          </h2>
        </div>
      </div>
    </div>
  );
};

export default RotatingHeadlines;
