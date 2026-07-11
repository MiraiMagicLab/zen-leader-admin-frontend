import { Link } from 'react-router-dom';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { QuickLinkItem } from '../constants/quick-links';

type DashboardQuickLinksProps = {
  items: QuickLinkItem[];
};

/**
 * Quick-action cards for navigating to common admin tasks.
 * Rendered as a compact card aligned with dashboard activity panels.
 */
export function DashboardQuickLinks({ items }: DashboardQuickLinksProps) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <h2 className="text-base font-medium">Quick actions</h2>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-2 py-2.5 no-underline transition-colors',
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
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
