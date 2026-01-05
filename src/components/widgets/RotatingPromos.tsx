import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type RotatingPromo = Tables<'rotating_promos'>;

const fallbackPromos = [
  { id: '1', text: 'MSPro Discount', highlight: '−20%', link: '#' },
  { id: '2', text: 'VPS only', highlight: '$9.99', link: '#' },
];

const fallbackEvents = [
  { id: '1', text: 'Castle Siege', highlight: 'Tonight 8PM', link: '#' },
  { id: '2', text: 'Blood Castle', highlight: 'Every 2h', link: '#' },
];

interface RotatingPromosProps {
  type: 'discount' | 'event';
}

const RotatingPromos = ({ type }: RotatingPromosProps) => {
  const [promos, setPromos] = useState<RotatingPromo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchPromos = async () => {
      const { data } = await supabase
        .from('rotating_promos')
        .select('*')
        .eq('is_active', true)
        .eq('promo_type', type)
        .order('created_at');
      
      if (data) {
        setPromos(data);
      }
    };
    fetchPromos();
  }, [type]);

  const items = promos.length > 0 ? promos : (type === 'discount' ? fallbackPromos : fallbackEvents);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [items.length]);

  const currentItem = items[currentIndex];
  if (!currentItem) return null;

  return (
    <div className="glass-card p-3 overflow-hidden">
      <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
        {type === 'discount' ? 'Partner Discounts' : 'Server Events'}
      </h4>
      <div className="relative h-6 overflow-hidden">
        <a 
          href={currentItem.link || '#'}
          key={currentIndex}
          className="absolute inset-0 flex items-center justify-between animate-slide-up hover:text-primary transition-colors"
        >
          <span className="text-xs font-medium">{currentItem.text}</span>
          <span className={`text-xs font-bold ${type === 'discount' ? 'text-green-400' : 'text-secondary'}`}>
            {currentItem.highlight}
          </span>
        </a>
      </div>
    </div>
  );
};

export default RotatingPromos;
