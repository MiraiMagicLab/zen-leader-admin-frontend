'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type InspectorFieldProps = {
  label: string;
  value?: ReactNode;
  mono?: boolean;
  className?: string;
};

/**
 * Label/value row for dock / detail metadata grids.
 * Pair with {@link AdminDockPanel} for list drill-down (not edge-locked sheets).
 */
export function InspectorField({
  label,
  value,
  mono = false,
  className,
}: InspectorFieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          'text-sm break-words',
          mono && 'font-mono text-xs tabular-nums',
        )}
      >
        {value == null || value === '' ? (
          <span className="text-muted-foreground">—</span>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
