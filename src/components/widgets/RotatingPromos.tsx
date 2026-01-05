import { useState, useEffect } from 'react';

interface PromoItem {
  id: string;
  text: string;
  highlight: string;
  link: string;
}

const promos: PromoItem[] = [
  { id: '1', text: 'MSPro Discount', highlight: '−20%', link: '#' },
  { id: '2', text: 'VPS only', highlight: '$9.99', link: '#' },
  { id: '3', text: 'Premium Files', highlight: '−30%', link: '#' },
  { id: '4', text: 'Antihack Sale', highlight: '−15%', link: '#' },
];

const events: PromoItem[] = [
  { id: '1', text: 'Castle Siege', highlight: 'Tonight 8PM', link: '#' },
  { id: '2', text: 'Blood Castle', highlight: 'Every 2h', link: '#' },
  { id: '3', text: 'Devil Square', highlight: 'Active Now', link: '#' },
  { id: '4', text: 'Chaos Castle', highlight: '10 PM', link: '#' },
];

interface RotatingPromosProps {
  type: 'discounts' | 'events';
}

const RotatingPromos = ({ type }: RotatingPromosProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const items = type === 'discounts' ? promos : events;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [items.length]);

  return (
    <div className="glass-card p-3 overflow-hidden">
      <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
        {type === 'discounts' ? 'Partner Discounts' : 'Server Events'}
      </h4>
      <div className="relative h-6 overflow-hidden">
        <a 
          href={items[currentIndex].link}
          key={currentIndex}
          className="absolute inset-0 flex items-center justify-between animate-slide-up hover:text-primary transition-colors"
        >
          <span className="text-xs font-medium">{items[currentIndex].text}</span>
          <span className={`text-xs font-bold ${type === 'discounts' ? 'text-green-400' : 'text-secondary'}`}>
            {items[currentIndex].highlight}
          </span>
        </a>
      </div>
    </div>
  );
};

export default RotatingPromos;
