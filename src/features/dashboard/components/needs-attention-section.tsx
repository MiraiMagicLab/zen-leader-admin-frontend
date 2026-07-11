import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, type LucideIcon } from 'lucide-react';

import { AdminSkeletonBar } from '@/components/admin/admin-loading';
import { AdminQueryError } from '@/components/admin/admin-query-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type NeedsAttentionColumnConfig<T> = {
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

type NeedsAttentionSectionProps<T> = {
  columns: NeedsAttentionColumnConfig<T>[];
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

/** Single queue inside the needs-attention card. */
function AttentionQueue<T>({
  config,
}: {
  config: NeedsAttentionColumnConfig<T>;
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
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
          {Icon ? <Icon className="text-muted-foreground size-3.5 shrink-0" /> : null}
          <span className="truncate">{title}</span>
          {!isLoading && items.length > 0 ? (
            <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">
              {items.length}
            </Badge>
          ) : null}
        </p>
        <Link
          to={viewAllHref}
          className="text-primary shrink-0 text-xs font-medium hover:underline"
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
              className="border-border/60 hover:border-border hover:bg-muted/30 rounded-md border px-3 py-2 transition-colors"
            >
              <p className="truncate text-sm font-medium">{renderPrimary(item)}</p>
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
 * Actionable dashboard queues: pending moderation and enrollment failures.
 * Shows a single "all clear" state when every queue is empty.
 */
export function NeedsAttentionSection<T>({
  columns,
}: NeedsAttentionSectionProps<T>) {
  const isLoading = columns.some((column) => column.isLoading);
  const hasError = columns.some((column) => column.isError);
  const totalItems = columns.reduce((sum, column) => sum + column.items.length, 0);
  const allEmpty = !isLoading && !hasError && totalItems === 0;

  return (
    <Card className="flex h-full flex-col border-border/70 shadow-none ring-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="text-amber-500 size-4 shrink-0" />
          Needs attention
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        {allEmpty ? (
          <div className="admin-subtle-panel flex flex-1 flex-col items-center justify-center border-dashed px-4 py-8 text-center">
            <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 mb-2 size-8" />
            <p className="text-sm font-medium">All clear</p>
            <p className="text-muted-foreground mt-1 max-w-xs text-xs leading-relaxed">
              No pending reports or enrollment failures right now.
            </p>
          </div>
        ) : (
          <div
            className={cn(
              'grid flex-1 gap-6',
              columns.length > 1 ? 'sm:grid-cols-2' : 'grid-cols-1',
            )}
          >
            {columns.map((column) => (
              <AttentionQueue key={column.title} config={column} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
