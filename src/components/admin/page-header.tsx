import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type PageHeaderProps = {
  title: string;
  description?: string;
  /** Status badge or other chip rendered inline next to the title. */
  titleAddon?: ReactNode;
  actions?: ReactNode;
  className?: string;
  size?: 'default' | 'sm';
};

export function PageHeader({
  title,
  description,
  titleAddon,
  actions,
  className,
  size = 'default',
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1
            className={cn(
              'text-foreground font-semibold tracking-tight text-balance',
              size === 'sm' ? 'text-lg' : 'text-xl sm:text-2xl',
            )}
          >
            {title}
          </h1>
          {titleAddon ? <div className="flex shrink-0 items-center gap-2">{titleAddon}</div> : null}
        </div>
        {description ? (
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}
