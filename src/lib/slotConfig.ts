// Homepage slot configuration
// Each slot maps to a specific homepage section

export const SLOT_CONFIG = {
  1: {
    id: 1,
    name: 'Marketplace Advertise',
    description: 'MU Online Marketplace – Advertise',
    createPath: '/create-listing',
    type: 'marketplace',
    table: 'advertisements',
    icon: 'ShoppingBag',
  },
  2: {
    id: 2,
    name: 'Services Advertise',
    description: 'MU Online Services – Advertise',
    createPath: '/create-listing',
    type: 'services',
    table: 'advertisements',
    icon: 'Wrench',
  },
  3: {
    id: 3,
    name: 'Top 50 Servers',
    description: 'Top 50 MU Online Servers',
    createPath: '/create-listing',
    type: 'top50',
    table: 'servers',
    icon: 'Trophy',
  },
  4: {
    id: 4,
    name: 'Premium Text Servers',
    description: 'Premium Text Servers Widget',
    createPath: '/create-listing',
    type: 'text-server',
    table: 'premium_text_servers',
    icon: 'Type',
  },
  5: {
    id: 5,
    name: 'Main Banner',
    description: 'Main Premium Banner Carousel',
    createPath: '/create-listing',
    type: 'main-banner',
    table: 'premium_banners',
    icon: 'Image',
  },
  6: {
    id: 6,
    name: 'Upcoming & Recent',
    description: 'Upcoming & Recent Servers',
    createPath: '/create-listing',
    type: 'upcoming-server',
    table: 'servers',
    icon: 'Calendar',
  },
  7: {
    id: 7,
    name: 'Partner Discounts',
    description: 'Partner Discounts Section',
    createPath: '/create-listing',
    type: 'partner-discount',
    table: 'rotating_promos',
    icon: 'Percent',
  },
  8: {
    id: 8,
    name: 'Server Events',
    description: 'Server Events Section',
    createPath: '/create-listing',
    type: 'server-event',
    table: 'rotating_promos',
    icon: 'Sparkles',
  },
} as const;

export type SlotId = keyof typeof SLOT_CONFIG;

export const getSlotConfig = (slotId: number) => {
  return SLOT_CONFIG[slotId as SlotId] || null;
};

export const getSlotRedirectUrl = (slotId: number, packageId: string) => {
  const config = getSlotConfig(slotId);
  if (!config) return '/dashboard';
  return `${config.createPath}?type=${config.type}&slot=${slotId}&package=${packageId}`;
};
