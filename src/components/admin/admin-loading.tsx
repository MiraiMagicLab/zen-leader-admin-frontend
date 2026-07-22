import type { ReactNode } from 'react';

import { ZenBlockLoader, ZenPageLoading } from '@/components/admin/zen-breathing-loader';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/** Shared neutral skeleton bar — always gray, never brand-colored. */
export function AdminSkeletonBar({
  className,
}: {
  className?: string;
}) {
  return (
    <Skeleton
      className={cn('bg-muted-foreground/12 dark:bg-muted-foreground/18', className)}
    />
  );
}

type AdminTableSkeletonProps = {
  rows?: number;
  columns?: number;
  className?: string;
};

/**
 * Table body skeleton for server-paged lists (course runs, users, etc.).
 */
export function AdminTableSkeleton({
  rows = 8,
  columns = 5,
  className,
}: AdminTableSkeletonProps) {
  const widthPattern = ['w-full', 'w-4/5', 'w-3/5', 'w-2/3', 'w-1/2'];

  return (
    <div className={cn('divide-y rounded-md border bg-card', className)}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: columns }).map((__, colIndex) => (
            <AdminSkeletonBar
              key={colIndex}
              className={cn('h-4 flex-1', widthPattern[colIndex % widthPattern.length])}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

type AdminPageLoadingProps = {
  title?: boolean;
  description?: boolean;
  table?: boolean;
  /** When true, show branded zen loader instead of gray skeleton layout. */
  branded?: boolean;
  className?: string;
};

/**
 * Full page first-paint skeleton while lazy route chunks load.
 * Pass `branded` for auth / cold-start surfaces that need the zen loader.
 */
export function AdminPageLoading({
  title = true,
  description = true,
  table = true,
  branded = false,
  className,
}: AdminPageLoadingProps) {
  if (branded) {
    return <ZenPageLoading className={cn('py-16', className)} />;
  }

  return (
    <div className={cn('space-y-6', className)}>
      {title ? <AdminSkeletonBar className="h-8 w-56" /> : null}
      {description ? <AdminSkeletonBar className="h-4 w-96 max-w-full" /> : null}
      {table ? <AdminTableSkeleton /> : null}
    </div>
  );
}

type AdminInlineLoadingProps = {
  label?: string;
  className?: string;
};

/** Small inline horizontal block loader for mutations inside panels. */
export function AdminInlineLoading({
  label = 'Loading…',
  className,
}: AdminInlineLoadingProps) {
  return (
    <div
      className={cn(
        'text-muted-foreground flex items-center gap-2 text-sm',
        className,
      )}
    >
      <ZenBlockLoader size={18} compact label={label} />
      {label}
    </div>
  );
}

type AdminPanelSkeletonProps = {
  lines?: number;
  className?: string;
};

/** Inspector / dock / card panel placeholder. */
export function AdminPanelSkeleton({
  lines = 4,
  className,
}: AdminPanelSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <div key={index} className="space-y-2">
          <AdminSkeletonBar className="h-3 w-20" />
          <AdminSkeletonBar className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

type AdminLoadingOverlayProps = {
  children: ReactNode;
  loading?: boolean;
  label?: string;
};

/** Dim content and show inline loader during refetch. */
export function AdminLoadingOverlay({
  children,
  loading = false,
  label,
}: AdminLoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {loading ? (
        <div className="bg-background/60 absolute inset-0 flex items-center justify-center rounded-lg backdrop-blur-[1px]">
          <AdminInlineLoading label={label} />
        </div>
      ) : null}
    </div>
  );
}
