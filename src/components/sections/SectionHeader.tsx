import { ReactNode } from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  action?: ReactNode;
}

const SectionHeader = ({ title, subtitle, badge, action }: SectionHeaderProps) => {
  return (
    <div className="section-header flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h3 className="font-display text-sm md:text-base font-semibold text-foreground">
          {title}
        </h3>
        {subtitle && (
          <span className="text-xs text-muted-foreground hidden md:inline">
            {subtitle}
          </span>
        )}
        {badge}
      </div>
      {action}
    </div>
  );
};

export default SectionHeader;
