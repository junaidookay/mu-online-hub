import { useState, useEffect } from 'react';
import { Sparkles, ExternalLink, UserPlus, Mail, Users, Gamepad2 } from 'lucide-react';
import Header from '@/components/layout/Header';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { normalizeExternalUrl } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  info: string | null;
  website: string;
  image_url: string | null;
}

const ArcanaProjectsPage = () => {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    serverName: '',
    website: '',
    message: '',
  });

  useEffect(() => {
    const fetchProjects = async () => {
      const { data } = await supabase
        .from('arcana_projects')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      
      if (data) setProjects(data);
    };
    fetchProjects();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Application Submitted!",
      description: "We'll review your application and get back to you soon.",
    });
    setFormData({ name: '', email: '', serverName: '', website: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Arcana MU Online Partner Projects - Premium Server Network"
        description="Discover the Arcana ecosystem - a network of premium MU Online servers managed by industry experts. Join as a player or become a partner."
        keywords="Arcana MU Online, partner projects, premium servers, MU Online network"
      />
      <Header />
      
      <main className="container py-8">
        {/* Hero Section */}
        <div className="glass-card p-6 md:p-10 mb-8 text-center glow-border-gold">
          <Sparkles className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="font-display text-2xl md:text-4xl font-bold text-gradient-gold mb-4">
            Arcana Partner Projects
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto mb-6 text-lg">
            The Arcana ecosystem brings together premium MU Online servers managed by industry 
            veterans. Experience top-tier gameplay or join our partner network.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { icon: Users, text: 'Growing Community' },
              { icon: Gamepad2, text: 'Premium Servers' },
              { icon: Sparkles, text: 'Revenue Share' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2">
                <item.icon className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Active Projects */}
        <section className="mb-12">
          <h2 className="font-display text-xl md:text-2xl font-bold text-center mb-8">
            Active Partner Servers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
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
                  className="glass-card overflow-hidden group hover:glow-border-gold transition-all"
                >
                  {project.image_url && (
                    <div className="aspect-video relative overflow-hidden">
                      <img 
                        src={project.image_url} 
                        alt={project.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <Badge className="absolute top-2 right-2 vip-gold">ARCANA</Badge>
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-display font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                        {project.name}
                      </h3>
                      <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {project.info && (
                      <p className="text-sm text-muted-foreground">{project.info}</p>
                    )}
                  </div>
                </CardComponent>
              );
            })}
          </div>

          {projects.length === 0 && (
            <div className="glass-card p-8 text-center">
              <p className="text-muted-foreground">Partner projects coming soon...</p>
            </div>
          )}
        </section>

        {/* Partner Application */}
        <section id="apply" className="max-w-2xl mx-auto">
          <div className="glass-card p-6 md:p-8 glow-border-gold">
            <div className="text-center mb-6">
              <UserPlus className="w-10 h-10 text-primary mx-auto mb-3" />
              <h2 className="font-display text-xl font-bold">Become a Partner</h2>
              <p className="text-sm text-muted-foreground">
                Join the Arcana network and grow your server with our support
              </p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
                <Input
                  type="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Server Name"
                  value={formData.serverName}
                  onChange={(e) => setFormData({ ...formData, serverName: e.target.value })}
                  required
                />
                <Input
                  placeholder="Server Website"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  required
                />
              </div>
              <Textarea
                placeholder="Tell us about your server and why you want to partner..."
                rows={4}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
              />
              <Button type="submit" className="w-full btn-fantasy-primary">
                <UserPlus className="w-4 h-4 mr-2" />
                Submit Application
              </Button>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ArcanaProjectsPage;
