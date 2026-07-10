import type { ReactNode } from 'react';

import { PageHeader } from '@/components/admin/page-header';
import { cn } from '@/lib/utils';

type AdminPageShellProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Tighter vertical rhythm for data-dense list pages. */
  density?: 'default' | 'compact';
  /** List pages use a smaller title and hide long descriptions by default. */
  variant?: 'default' | 'list';
};

/**
 * Standard admin page frame: header, optional filter toolbar, then content.
 * Keeps list/detail pages visually consistent without nested card chrome.
 */
export function AdminPageShell({
  title,
  description,
  actions,
  toolbar,
  children,
  className,
  density = 'default',
  variant = 'default',
}: AdminPageShellProps) {
  const isList = variant === 'list';

  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-col',
        density === 'compact' || isList ? 'gap-4' : 'gap-6',
        className,
      )}
    >
      <PageHeader
        title={title}
        description={isList ? undefined : description}
        actions={actions}
        size={isList ? 'sm' : 'default'}
      />
      {isList && description ? (
        <p className="text-muted-foreground -mt-2 max-w-2xl text-sm">{description}</p>
      ) : null}
      {toolbar ? (
        <div className="flex min-w-0 flex-col gap-3">{toolbar}</div>
      ) : null}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
