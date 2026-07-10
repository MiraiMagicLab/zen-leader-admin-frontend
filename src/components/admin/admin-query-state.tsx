import type { ReactNode } from 'react';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';

import {
  AdminPageLoading,
  AdminPanelSkeleton,
  AdminSkeletonBar,
  AdminTableSkeleton,
} from '@/components/admin/admin-loading';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { cn } from '@/lib/utils';

type AdminQueryErrorProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
};

/**
 * Inline error banner for failed list/detail queries (not mutation toasts).
 */
export function AdminQueryError({
  title = 'Could not load data',
  message = 'Something went wrong. Try again.',
  onRetry,
  className,
}: AdminQueryErrorProps) {
  return (
    <Alert variant="destructive" className={cn(className)}>
      <AlertCircle />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span>{message}</span>
        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 w-fit"
            onClick={onRetry}
          >
            <RefreshCw className="size-3.5" />
            Retry
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

type AdminEmptyStateProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

/**
 * Standalone empty state for non-table surfaces (dashboard panels, detail sections).
 */
export function AdminEmptyState({
  title = 'Nothing here yet',
  description = 'There is no data to show for this view.',
  action,
  className,
}: AdminEmptyStateProps) {
  return (
    <Empty className={cn('border bg-card', className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox className="size-5" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action}
    </Empty>
  );
}

type AdminListSkeletonProps = {
  rows?: number;
  className?: string;
};

/**
 * @deprecated Prefer AdminTableSkeleton — kept for backward compatibility.
 */
export function AdminListSkeleton({ rows = 6, className }: AdminListSkeletonProps) {
  return <AdminTableSkeleton rows={rows} className={className} />;
}

type AdminDetailSkeletonProps = {
  className?: string;
};

/**
 * Detail-page skeleton for course/event/run workspaces.
 */
export function AdminDetailSkeleton({ className }: AdminDetailSkeletonProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="space-y-2">
        <AdminSkeletonBar className="h-8 w-64" />
        <AdminSkeletonBar className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <AdminSkeletonBar className="h-24 rounded-xl" />
        <AdminSkeletonBar className="h-24 rounded-xl" />
        <AdminSkeletonBar className="h-24 rounded-xl" />
      </div>
      <AdminSkeletonBar className="h-64 rounded-xl" />
    </div>
  );
}

/** Lazy route / full page loading state. */
export { AdminPageLoading as AdminRouteLoading };

/** Panel / inspector loading placeholder. */
export { AdminPanelSkeleton };
