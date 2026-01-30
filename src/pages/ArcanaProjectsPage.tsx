import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import { SEOHead } from '@/components/SEOHead';
import { ExternalLink, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { Tables } from '@/integrations/supabase/types';
import { normalizeExternalUrl } from '@/lib/utils';

type ArcanaProject = Tables<'arcana_projects'>;

const fallbackProjects = [
  { id: '1', name: 'FIRATHIA', info: 'MU SEASON 20 TEMPRANA', image_url: 'https://images.unsplash.com/photo-1614854262318-831574f15f1f?w=150&h=100&fit=crop', website: 'firathia.com' },
  { id: '2', name: 'AON LE NIAO', info: 'X-1d 1ZS - 00IX (INSOWIC)', image_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=150&h=100&fit=crop', website: 'aonleniao.com' },
];

const ArcanaProjectsPage = () => {
  const [projects, setProjects] = useState<ArcanaProject[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

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
  const filteredProjects = displayProjects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.info?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <SEOHead 
        title="Arcana Projects | Arcana MU Online"
        description="Browse all Arcana-managed MU Online servers and projects."
      />
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold text-primary mb-2">Arcana Projects</h1>
            <p className="text-muted-foreground">Official Arcana-managed servers and projects</p>
          </div>

          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => {
              const href = normalizeExternalUrl(project.website);
              const CardComponent = href ? 'a' : 'div';
              const cardProps = href
                ? ({
                    href,
                    target: '_blank',
                    rel: 'noopener noreferrer',
                  } as const)
                : undefined;

              return (
                <CardComponent
                  key={project.id}
                  {...cardProps}
                  className="block group"
                >
                <div className="relative rounded-lg overflow-hidden border border-border/30 hover:border-primary/50 transition-all hover:glow-border-gold">
                  {project.image_url && (
                    <img 
                      src={project.image_url} 
                      alt={project.name}
                      className="w-full h-48 object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded live-indicator">LIVE</span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h4 className="font-display text-xl font-bold text-primary text-glow-gold">{project.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{project.info}</p>
                  </div>
                  <ExternalLink size={16} className="absolute top-3 right-3 text-muted-foreground opacity-0 group-hover:opacity-100" />
                </div>
                </CardComponent>
              );
            })}
          </div>

          {filteredProjects.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No projects found matching your search.
            </div>
          )}
        </main>
      </div>
    </>
  );
};

export default ArcanaProjectsPage;
