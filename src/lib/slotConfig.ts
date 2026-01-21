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
    isFree: false,
    maxListings: null, // unlimited
    hasRotation: true,
  },
  2: {
    id: 2,
    name: 'Services Advertise',
    description: 'MU Online Services – Advertise',
    createPath: '/create-listing',
    type: 'services',
    table: 'advertisements',
    icon: 'Wrench',
    isFree: false,
    maxListings: null,
    hasRotation: true,
  },
  3: {
    id: 3,
    name: 'Top 50 Servers',
    description: 'Top 50 MU Online Servers',
    createPath: '/create-listing',
    type: 'top50',
    table: 'servers',
    icon: 'Trophy',
    isFree: false,
    maxListings: 50,
    hasRotation: true,
  },
  4: {
    id: 4,
    name: 'Premium Text Servers',
    description: 'Premium Text Servers Widget',
    createPath: '/create-listing',
    type: 'text-server',
    table: 'premium_text_servers',
    icon: 'Type',
    isFree: false,
    maxListings: 10, // configurable
    hasRotation: true,
  },
  5: {
    id: 5,
    name: 'Main Banner',
    description: 'Main Premium Banner Carousel',
    createPath: '/create-listing',
    type: 'main-banner',
    table: 'premium_banners',
    icon: 'Image',
    isFree: false,
    maxListings: 3,
    hasRotation: true,
  },
  6: {
    id: 6,
    name: 'Upcoming & Recent',
    description: 'Upcoming & Recent Servers (FREE)',
    createPath: '/create-listing',
    type: 'upcoming-server',
    table: 'servers',
    icon: 'Calendar',
    isFree: true, // FREE SLOT
    maxListings: null,
    hasRotation: false,
  },
  7: {
    id: 7,
    name: 'Partner Discounts',
    description: 'Partner Discounts Section',
    createPath: '/create-listing',
    type: 'partner-discount',
    table: 'rotating_promos',
    icon: 'Percent',
    isFree: false,
    maxListings: null,
    hasRotation: true,
  },
  8: {
    id: 8,
    name: 'Server Events',
    description: 'Server Events Section',
    createPath: '/create-listing',
    type: 'server-event',
    table: 'rotating_promos',
    icon: 'Sparkles',
    isFree: false,
    maxListings: null,
    hasRotation: true,
  },
} as const;

export type SlotId = keyof typeof SLOT_CONFIG;

export const getSlotConfig = (slotId: number) => {
  return SLOT_CONFIG[slotId as SlotId] || null;
};

export const getSlotRedirectUrl = (slotId: number, packageId?: string) => {
  const config = getSlotConfig(slotId);
  if (!config) return '/dashboard';
  const baseUrl = `${config.createPath}?type=${config.type}&slot=${slotId}`;
  return packageId ? `${baseUrl}&package=${packageId}` : baseUrl;
};

export const isSlotFree = (slotId: number): boolean => {
  const config = getSlotConfig(slotId);
  return config?.isFree ?? false;
};

export const FREE_SLOT_ID = 6;
