import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type StatCardTone = 'blue' | 'emerald' | 'violet' | 'amber' | 'rose';

const toneStyles: Record<
  StatCardTone,
  { icon: string; glow: string; ring: string }
> = {
  blue: {
    icon: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    glow: 'bg-blue-500/10',
    ring: 'group-hover:ring-blue-500/20',
  },
  emerald: {
    icon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    glow: 'bg-emerald-500/10',
    ring: 'group-hover:ring-emerald-500/20',
  },
  violet: {
    icon: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    glow: 'bg-violet-500/10',
    ring: 'group-hover:ring-violet-500/20',
  },
  amber: {
    icon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    glow: 'bg-amber-500/10',
    ring: 'group-hover:ring-amber-500/20',
  },
  rose: {
    icon: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    glow: 'bg-rose-500/10',
    ring: 'group-hover:ring-rose-500/20',
  },
};

type StatCardProps = {
  title: string;
  value?: number | string;
  icon: LucideIcon;
  href?: string;
  tone?: StatCardTone;
  isLoading?: boolean;
};

export function StatCard({
  title,
  value,
  icon: Icon,
  href,
  tone = 'emerald',
  isLoading,
}: StatCardProps) {
  const styles = toneStyles[tone];

  const content = (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-card p-5 shadow-sm ring-1 ring-transparent transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-md',
        styles.ring,
        href && 'cursor-pointer',
      )}
    >
      <div
        aria-hidden
        className={cn(
          'absolute -top-6 -right-6 size-24 rounded-full blur-2xl transition-opacity group-hover:opacity-100',
          styles.glow,
        )}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className={cn('rounded-xl p-2.5', styles.icon)}>
          <Icon className="size-5" />
        </div>
        {href ? (
          <ArrowUpRight className="text-muted-foreground size-4 opacity-0 transition-opacity group-hover:opacity-100" />
        ) : null}
      </div>
      <div className="relative mt-4 space-y-1">
        <p className="text-muted-foreground text-sm font-medium">{title}</p>
        {isLoading ? (
          <Skeleton className="h-9 w-20" />
        ) : (
          <p className="text-3xl font-bold tracking-tight tabular-nums">
            {value ?? 0}
          </p>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block h-full w-full min-w-0 no-underline">
        {content}
      </Link>
    );
  }

  return content;
}
