import { Link } from 'react-router-dom';
import { AlertTriangle, type LucideIcon } from 'lucide-react';

import { AdminSkeletonBar } from '@/components/admin/admin-loading';
import { AdminQueryError } from '@/components/admin/admin-query-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type AttentionColumnConfig<T> = {
  title: string;
  icon?: LucideIcon;
  viewAllHref: string;
  items: T[];
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  emptyMessage: string;
  onRetry?: () => void;
  renderPrimary: (item: T) => string;
  renderSecondary: (item: T) => string;
  keyExtractor: (item: T) => string;
};

type AttentionSectionProps<T> = {
  columns: AttentionColumnConfig<T>[];
};

/** Skeleton placeholder for loading state. */
function AttentionItemSkeleton() {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: 3 }).map((_, i) => (
        <AdminSkeletonBar key={i} className="h-11 w-full rounded-lg" />
      ))}
    </div>
  );
}

/** Single column inside the attention section. */
function AttentionColumn<T>({
  config,
  className,
}: {
  config: AttentionColumnConfig<T>;
  className?: string;
}) {
  const {
    title,
    icon: Icon,
    viewAllHref,
    items,
    isLoading,
    isError,
    error,
    emptyMessage,
    onRetry,
    renderPrimary,
    renderSecondary,
    keyExtractor,
  } = config;

  if (isError) {
    return (
      <AdminQueryError
        title={title}
        message={(error as Error)?.message ?? 'Failed to load.'}
        onRetry={onRetry}
        className={cn('lg:col-span-3', className)}
      />
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          {Icon ? <Icon className="text-muted-foreground size-3.5" /> : null}
          {title}
        </p>
        <Link
          to={viewAllHref}
          className="text-primary text-xs font-medium hover:underline"
        >
          View all
        </Link>
      </div>

      {isLoading ? (
        <AttentionItemSkeleton />
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{emptyMessage}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li
              key={keyExtractor(item)}
              className="group border-border/60 hover:border-border hover:bg-muted/30 rounded-lg border p-2.5 transition-colors"
            >
              <p className="truncate text-sm font-medium">
                {renderPrimary(item)}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {renderSecondary(item)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * "Needs attention" card with up to 3 columns showing pending items.
 * Each column is independently loaded and handles its own error state.
 */
export function AttentionSection<T>({
  columns,
}: AttentionSectionProps<T>) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="text-amber-500 size-4" />
          Needs attention
        </CardTitle>
        <Badge variant="secondary">Recent</Badge>
      </CardHeader>
      <CardContent
        className="grid gap-6 lg:grid-cols-3"
      >
        {columns.map((col) => (
          <AttentionColumn key={col.title} config={col} />
        ))}
      </CardContent>
    </Card>
  );
}
