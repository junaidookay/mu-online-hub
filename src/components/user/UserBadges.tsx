import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Award, Crown, Medal, Shield, Star, TrendingUp, Heart, Zap } from 'lucide-react';

interface UserBadgesProps {
  badges: string[];
  buyerLevel?: number;
  sellerLevel?: number;
  compact?: boolean;
}

const badgeConfig: Record<string, { 
  label: string; 
  icon: React.ComponentType<{ className?: string }>; 
  color: string;
  description: string;
}> = {
  bronze_buyer: {
    label: 'Bronze Buyer',
    icon: Medal,
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    description: 'Spent $100+ on the marketplace'
  },
  silver_buyer: {
    label: 'Silver Buyer',
    icon: Medal,
    color: 'bg-gray-400/20 text-gray-300 border-gray-400/30',
    description: 'Spent $500+ on the marketplace'
  },
  gold_buyer: {
    label: 'Gold Buyer',
    icon: Crown,
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    description: 'Spent $1000+ on the marketplace'
  },
  bronze_seller: {
    label: 'Bronze Seller',
    icon: Award,
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    description: 'Earned $100+ from sales'
  },
  silver_seller: {
    label: 'Silver Seller',
    icon: Award,
    color: 'bg-gray-400/20 text-gray-300 border-gray-400/30',
    description: 'Earned $500+ from sales'
  },
  gold_seller: {
    label: 'Gold Seller',
    icon: Crown,
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    description: 'Earned $1000+ from sales'
  },
  trusted_seller: {
    label: 'Trusted Seller',
    icon: Shield,
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    description: 'Completed 10+ sales successfully'
  },
  loyal_buyer: {
    label: 'Loyal Buyer',
    icon: Heart,
    color: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    description: 'Made 10+ purchases'
  }
};

const levelConfig = {
  buyer: [
    { level: 1, label: 'Newcomer', icon: Star, color: 'text-muted-foreground' },
    { level: 2, label: 'Regular', icon: Star, color: 'text-blue-400' },
    { level: 3, label: 'Enthusiast', icon: Star, color: 'text-purple-400' },
    { level: 4, label: 'Expert', icon: Zap, color: 'text-yellow-400' },
    { level: 5, label: 'Elite', icon: Crown, color: 'text-orange-400' }
  ],
  seller: [
    { level: 1, label: 'Starter', icon: TrendingUp, color: 'text-muted-foreground' },
    { level: 2, label: 'Rising', icon: TrendingUp, color: 'text-blue-400' },
    { level: 3, label: 'Established', icon: Award, color: 'text-purple-400' },
    { level: 4, label: 'Pro', icon: Award, color: 'text-yellow-400' },
    { level: 5, label: 'Elite', icon: Crown, color: 'text-orange-400' }
  ]
};

export const UserBadges = ({ badges, buyerLevel = 1, sellerLevel = 1, compact = false }: UserBadgesProps) => {
  const buyerLevelInfo = levelConfig.buyer.find(l => l.level === buyerLevel) || levelConfig.buyer[0];
  const sellerLevelInfo = levelConfig.seller.find(l => l.level === sellerLevel) || levelConfig.seller[0];

  if (compact) {
    // Show only the most prestigious badges
    const topBadges = badges.slice(0, 2);
    return (
      <div className="flex items-center gap-1">
        {topBadges.map((badge) => {
          const config = badgeConfig[badge];
          if (!config) return null;
          const Icon = config.icon;
          return (
            <TooltipProvider key={badge}>
              <Tooltip>
                <TooltipTrigger>
                  <Icon className={`w-4 h-4 ${config.color.split(' ')[1]}`} />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{config.label}</p>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Levels */}
      <div className="flex flex-wrap gap-2">
        {buyerLevel > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className={`${buyerLevelInfo.color}`}>
                  <buyerLevelInfo.icon className="w-3 h-3 mr-1" />
                  Buyer Lv.{buyerLevel}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{buyerLevelInfo.label} Buyer</p>
                <p className="text-xs text-muted-foreground">
                  Level up by purchasing more items
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {sellerLevel > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className={`${sellerLevelInfo.color}`}>
                  <sellerLevelInfo.icon className="w-3 h-3 mr-1" />
                  Seller Lv.{sellerLevel}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{sellerLevelInfo.label} Seller</p>
                <p className="text-xs text-muted-foreground">
                  Level up by completing more sales
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Achievement Badges */}
      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {badges.map((badge) => {
            const config = badgeConfig[badge];
            if (!config) return null;
            const Icon = config.icon;
            
            return (
              <TooltipProvider key={badge}>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge className={`${config.color} border`}>
                      <Icon className="w-3 h-3 mr-1" />
                      {config.label}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{config.label}</p>
                    <p className="text-xs text-muted-foreground">{config.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      )}

      {badges.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No badges earned yet. Keep buying and selling to unlock achievements!
        </p>
      )}
    </div>
  );
};

export const UserLevelBadge = ({ level, type }: { level: number; type: 'buyer' | 'seller' }) => {
  const config = levelConfig[type];
  const levelInfo = config.find(l => l.level === level) || config[0];
  const Icon = levelInfo.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="outline" className={`${levelInfo.color}`}>
            <Icon className="w-3 h-3 mr-1" />
            {type === 'buyer' ? 'Buyer' : 'Seller'} Lv.{level}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{levelInfo.label} {type === 'buyer' ? 'Buyer' : 'Seller'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
