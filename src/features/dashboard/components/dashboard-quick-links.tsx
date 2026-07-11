import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { QuickLinkItem } from '../constants/quick-links';

type DashboardQuickLinksProps = {
  items: QuickLinkItem[];
};

/**
 * Quick-action cards for navigating to common admin tasks.
 * Renders as a vertical stack with icon, title, description, and arrow.
 */
export function DashboardQuickLinks({ items }: DashboardQuickLinksProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium">Quick actions</h2>
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 no-underline transition-colors',
                'hover:bg-muted/50',
              )}
            >
              <div className="bg-muted/60 text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors group-hover:bg-muted">
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-foreground text-sm font-medium leading-none">
                  {item.title}
                </p>
                <p className="text-muted-foreground mt-1 text-xs leading-snug">
                  {item.description}
                </p>
              </div>
              <ArrowUpRight className="text-muted-foreground size-4 shrink-0 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
