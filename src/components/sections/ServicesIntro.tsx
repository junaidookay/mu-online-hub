import { Wrench, ArrowRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const ServicesIntro = () => {
  return (
    <div className="glass-card overflow-hidden">
      <div className="section-header">
        <div className="flex items-center gap-3">
          <Wrench className="w-5 h-5 text-secondary" />
          <h2 className="font-display text-base md:text-lg font-semibold text-foreground">
            MU Online Services
          </h2>
        </div>
      </div>
      
      <div className="p-4 md:p-6">
        <p className="text-sm text-muted-foreground mb-4">
          Professional services for your MU Online server. From custom configurations to 
          promotional videos, banners, and streaming services.
        </p>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {['Configurations', 'Streaming', 'Videos', 'Banners'].map((item) => (
            <div key={item} className="bg-muted/30 rounded px-2 py-1 text-center">
              <span className="text-xs text-foreground">{item}</span>
            </div>
          ))}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button asChild className="btn-fantasy-primary flex-1 bg-gradient-to-b from-secondary/90 to-secondary text-secondary-foreground border-secondary/50 hover:from-secondary hover:to-secondary/80">
            <Link to="/services" className="flex items-center justify-center gap-2">
              <Wrench className="w-4 h-4" />
              Browse Services
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" className="btn-fantasy-outline flex-1">
            <Link to="/seller-onboarding" className="flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              List Your Service
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ServicesIntro;
