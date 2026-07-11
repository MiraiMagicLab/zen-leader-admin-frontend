import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

import { AdminSkeletonBar } from '@/components/admin/admin-loading';
import { cn } from '@/lib/utils';

type StatCardProps = {
  title: string;
  value?: number | string;
  icon: LucideIcon;
  href?: string;
  isLoading?: boolean;
};

export function StatCard({ title, value, icon: Icon, href, isLoading }: StatCardProps) {
  const content = (
    <div
      className={cn(
        'admin-metric-card group flex h-full items-center gap-4 p-4',
      )}
    >
      <div className="bg-muted/70 text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-md border border-border/50">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs font-medium">{title}</p>
        {isLoading ? (
          <AdminSkeletonBar className="mt-1 h-7 w-16" />
        ) : (
          <p className="text-foreground mt-0.5 text-xl font-semibold tracking-tight tabular-nums">
            {value ?? 0}
          </p>
        )}
      </div>
      {href ? (
        <ArrowUpRight className="text-muted-foreground size-4 opacity-0 transition-opacity group-hover:opacity-100" />
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block h-full min-w-0 no-underline">
        {content}
      </Link>
    );
  }

  return content;
}
