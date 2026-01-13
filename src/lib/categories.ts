import { 
  Globe, FileCode, Shield, Rocket, Code, Server, 
  Palette, Paintbrush, Camera, Megaphone, Video, 
  Users, Award, TrendingUp, Package 
} from 'lucide-react';

// Mu Marketplace categories
export const marketplaceCategories = [
  { id: 'mu_websites', label: 'MU Online Websites', icon: Globe, description: 'Website templates and custom designs' },
  { id: 'mu_server_files', label: 'MU Online Server Files', icon: FileCode, description: 'Complete server packages and files' },
  { id: 'mu_protection', label: 'MU Online Protection', icon: Shield, description: 'Antihack and security systems' },
  { id: 'mu_app_developer', label: 'Application Developer', icon: Code, description: 'Custom applications and tools' },
  { id: 'mu_launchers', label: 'MU Online Launchers', icon: Rocket, description: 'Game launchers and auto-updaters' },
  { id: 'mu_installers', label: 'MU Online Installers', icon: Package, description: 'Game installers and setup tools' },
  { id: 'mu_hosting', label: 'Hosting Services', icon: Server, description: 'Server hosting and infrastructure' },
] as const;

// Mu Services categories
export const serviceCategories = [
  { id: 'server_development', label: 'Server Development', icon: Code, description: 'Custom server development and modifications' },
  { id: 'design_branding', label: 'Design & Branding', icon: Palette, description: 'Logo design, branding, and visual identity' },
  { id: 'skins_customization', label: 'In-Game Skins', icon: Paintbrush, description: 'Custom skins and visual modifications' },
  { id: 'media', label: 'Media Production', icon: Camera, description: 'Screenshots, trailers, and media content' },
  { id: 'promotion', label: 'Promotion', icon: Megaphone, description: 'Server promotion and advertising' },
  { id: 'streaming', label: 'Streaming', icon: Video, description: 'Live streaming and content creation' },
  { id: 'content_creators', label: 'Content Creators', icon: Users, description: 'YouTube, social media content' },
  { id: 'event_master', label: 'Event Master / Moderator', icon: Award, description: 'In-game events and moderation' },
  { id: 'marketing_growth', label: 'Marketing & Growth', icon: TrendingUp, description: 'Marketing strategies and growth' },
] as const;

// Combined for onboarding
export const allCategories = [...marketplaceCategories, ...serviceCategories];

// Category type
export type CategoryId = typeof allCategories[number]['id'];
export type MarketplaceCategoryId = typeof marketplaceCategories[number]['id'];
export type ServiceCategoryId = typeof serviceCategories[number]['id'];

// Helper to get category by ID
export const getCategoryById = (id: string) => 
  allCategories.find(cat => cat.id === id);

// Category icons map for quick lookup
export const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  mu_websites: Globe,
  mu_server_files: FileCode,
  mu_protection: Shield,
  mu_app_developer: Code,
  mu_launchers: Rocket,
  mu_installers: Package,
  mu_hosting: Server,
  server_development: Code,
  design_branding: Palette,
  skins_customization: Paintbrush,
  media: Camera,
  promotion: Megaphone,
  streaming: Video,
  content_creators: Users,
  event_master: Award,
  marketing_growth: TrendingUp,
  // Legacy categories (keeping for backwards compatibility)
  websites: Globe,
  server_files: FileCode,
  antihack: Shield,
  launchers: Rocket,
  custom_scripts: Code,
};

// Category labels map
export const categoryLabels: Record<string, string> = {
  mu_websites: 'MU Online Websites',
  mu_server_files: 'MU Online Server Files',
  mu_protection: 'MU Online Protection',
  mu_app_developer: 'Application Developer',
  mu_launchers: 'MU Online Launchers',
  mu_installers: 'MU Online Installers',
  mu_hosting: 'Hosting Services',
  server_development: 'Server Development',
  design_branding: 'Design & Branding',
  skins_customization: 'In-Game Skins',
  media: 'Media Production',
  promotion: 'Promotion',
  streaming: 'Streaming',
  content_creators: 'Content Creators',
  event_master: 'Event Master / Moderator',
  marketing_growth: 'Marketing & Growth',
  // Legacy categories
  websites: 'Websites',
  server_files: 'Server Files',
  antihack: 'Antihack',
  launchers: 'Launchers',
  custom_scripts: 'Custom Scripts',
};