import type { ReactNode } from 'react';
import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type AdminFilterBarProps = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Extra filters (Select, Switch, chips) rendered after search. */
  children?: ReactNode;
  /** Optional trailing actions (e.g. clear filters, export). */
  trailing?: ReactNode;
  onClear?: () => void;
  clearLabel?: string;
  className?: string;
  showClear?: boolean;
};

/**
 * Compact server-filter row used above DataTable on list pages.
 */
export function AdminFilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  children,
  trailing,
  onClear,
  clearLabel = 'Clear',
  className,
  showClear = false,
}: AdminFilterBarProps) {
  const hasSearch = typeof onSearchChange === 'function';

  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center',
        className,
      )}
    >
      {hasSearch ? (
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={searchValue ?? ''}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 rounded-md border-border/70 pl-9"
            aria-label={searchPlaceholder}
          />
        </div>
      ) : null}
      {children ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>
      ) : null}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {trailing}
        {showClear && onClear ? (
          <Button type="button" variant="ghost" size="sm" onClick={onClear}>
            <X className="size-4" />
            {clearLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
