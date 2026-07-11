import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type TechnicalDetailsProps = {
  children: ReactNode;
  summary?: string;
  className?: string;
  defaultOpen?: boolean;
};

/**
 * Collapsed technical/reference block for UUIDs and debug fields.
 * Keeps inspector panels focused on human-readable ops data by default.
 */
export function TechnicalDetails({
  children,
  summary = 'Technical details',
  className,
  defaultOpen = false,
}: TechnicalDetailsProps) {
  return (
    <details
      open={defaultOpen || undefined}
      className={cn(
        'admin-subtle-panel group border-dashed px-3 py-2',
        className,
      )}
    >
      <summary className="text-muted-foreground cursor-pointer list-none text-xs font-medium select-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-1.5">
          <span className="text-foreground/50 group-open:rotate-90 inline-block transition-transform">
            ›
          </span>
          {summary}
        </span>
      </summary>
      <div className="mt-3 space-y-3">{children}</div>
    </details>
  );
}
