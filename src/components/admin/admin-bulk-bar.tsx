import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type AdminBulkBarProps = {
  count: number;
  label?: string;
  children: ReactNode;
  className?: string;
};

/**
 * Flat bulk-selection toolbar — no nested card chrome.
 */
export function AdminBulkBar({
  count,
  label = 'selected',
  children,
  className,
}: AdminBulkBarProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2 py-1', className)}>
      <span className="text-muted-foreground text-sm">
        {count} {label}
      </span>
      <div className="ml-auto flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
