import { Store, Wrench, Server, Users } from 'lucide-react';

const links = [
  { icon: Store, label: 'MU Online Marketplace', subtitle: 'Websites, Server Files, Antihack etc.', href: '#marketplace' },
  { icon: Wrench, label: 'MU Online Services', subtitle: 'Configurations, Streamer, Custom, Video, Banner', href: '#services' },
  { icon: Server, label: 'Create your MU Online server with us', subtitle: 'Professional server setup and management', href: '#create' },
  { icon: Users, label: 'Arcana Partner Projects', subtitle: 'Join our exclusive partner program', href: '#arcana' },
];

const QuickLinks = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {links.map((link, index) => (
        <a
          key={index}
          href={link.href}
          className="glass-card p-3 flex flex-col items-center text-center group hover:glow-border-gold transition-all"
        >
          <link.icon className="w-6 h-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-semibold text-foreground">{link.label}</span>
          <span className="text-[9px] text-muted-foreground mt-1 line-clamp-2">{link.subtitle}</span>
        </a>
      ))}
    </div>
  );
};

export default QuickLinks;
