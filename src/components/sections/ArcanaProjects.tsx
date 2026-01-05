import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import SectionHeader from './SectionHeader';
import { ExternalLink } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type ArcanaProject = Tables<'arcana_projects'>;

const fallbackProjects = [
  { id: '1', name: 'FIRATHIA', info: 'MU SEASON 20 TEMPRANA', image_url: 'https://images.unsplash.com/photo-1614854262318-831574f15f1f?w=150&h=100&fit=crop', website: 'firathia.com' },
  { id: '2', name: 'AON LE NIAO', info: 'X-1d 1ZS - 00IX (INSOWIC)', image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=150&h=100&fit=crop', website: 'aonleniao.com' },
];

const ArcanaProjects = () => {
  const [projects, setProjects] = useState<ArcanaProject[]>([]);

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase
        .from('arcana_projects')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (data) {
        setProjects(data);
      }
    };
    fetchProjects();
  }, []);

  const displayProjects = projects.length > 0 ? projects : fallbackProjects;

  return (
    <div className="glass-card overflow-hidden">
      <SectionHeader 
        title="Arcana Projects" 
        badge={<span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded live-indicator ml-2">LIVE</span>}
      />
      <div className="p-2 space-y-3">
        {displayProjects.map((project) => (
          <a
            key={project.id}
            href={`https://${project.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <div className="relative rounded-lg overflow-hidden border border-border/30 hover:border-primary/50 transition-all hover:glow-border-gold">
              {project.image_url && (
                <img 
                  src={project.image_url} 
                  alt={project.name}
                  className="w-full h-24 object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <h4 className="font-display text-sm font-bold text-primary text-glow-gold">{project.name}</h4>
                <p className="text-[10px] text-muted-foreground">{project.info}</p>
              </div>
              <ExternalLink size={12} className="absolute top-2 right-2 text-muted-foreground opacity-0 group-hover:opacity-100" />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default ArcanaProjects;
