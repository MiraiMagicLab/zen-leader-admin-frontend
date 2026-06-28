import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
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
        'bg-card group flex h-full items-center gap-4 rounded-xl border p-4 shadow-sm transition-colors',
        href && 'hover:bg-muted/40',
      )}
    >
      <div className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-sm">{title}</p>
        {isLoading ? (
          <Skeleton className="mt-1 h-7 w-16" />
        ) : (
          <p className="text-2xl font-semibold tabular-nums">{value ?? 0}</p>
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
