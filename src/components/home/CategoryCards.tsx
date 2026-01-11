import { Store, Wrench, Server, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const categories = [
  {
    icon: Store,
    title: 'MU Online Marketplace',
    subtitle: 'Websites, Server Files, Antihack etc.',
    href: '/marketplace',
  },
  {
    icon: Wrench,
    title: 'MU Online Services',
    subtitle: 'Configurations, Streamer, Custom, Video, Banner',
    href: '/services',
  },
  {
    icon: Server,
    title: 'Create your MU Online server with us',
    subtitle: 'Professional server setup and management',
    href: '/create-server',
  },
  {
    icon: Users,
    title: 'Arcana Partner Projects',
    subtitle: 'Join our exclusive partner program',
    href: '/arcana-projects',
  },
];

const CategoryCards = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {categories.map((cat) => (
        <Link
          key={cat.title}
          to={cat.href}
          className="glass-card p-6 text-center hover:glow-border-gold transition-all duration-300 group"
        >
          <cat.icon className="w-10 h-10 mx-auto mb-3 text-primary group-hover:scale-110 transition-transform" />
          <h3 className="font-display text-sm font-semibold text-foreground mb-1">
            {cat.title}
          </h3>
          <p className="text-xs text-muted-foreground">{cat.subtitle}</p>
        </Link>
      ))}
    </div>
  );
};

export default CategoryCards;
