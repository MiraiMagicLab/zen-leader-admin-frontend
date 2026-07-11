'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';

import { AdminPanelSkeleton } from '@/components/admin/admin-loading';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type AdminDockLayoutProps = {
  children: ReactNode;
  /** When true, main content shifts left so the floating dock does not cover the table. */
  dockOpen?: boolean;
  className?: string;
};

/**
 * List workspace that makes room for the fixed floating dock on large screens.
 */
export function AdminDockLayout({
  children,
  dockOpen = false,
  className,
}: AdminDockLayoutProps) {
  return (
    <div
      className={cn(
        'min-w-0 transition-[margin] duration-200 ease-out',
        dockOpen && 'lg:mr-[calc(20rem+1.5rem)] xl:mr-[calc(22rem+1.5rem)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

type AdminDockPanelProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  isLoading?: boolean;
  /**
   * Raise above modal overlays so the floating card stays visible
   * while a Dialog / AlertDialog is open (dialog content stays on top).
   */
  stacked?: boolean;
  className?: string;
};

type AdminDockIndicatorStripProps = {
  items: Array<{
    label: string;
    value?: ReactNode;
    hint?: string;
    active?: boolean;
  }>;
  onOpen?: () => void;
  className?: string;
};

/**
 * Compact stat chips — tap to open the floating dock (mobile).
 */
export function AdminDockIndicatorStrip({
  items,
  onOpen,
  className,
}: AdminDockIndicatorStripProps) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={onOpen}
          className={cn(
            'rounded-md px-3 py-2 text-left transition-colors',
            item.active ? 'bg-muted' : 'bg-muted/50 hover:bg-muted',
          )}
        >
          <span className="text-muted-foreground block text-[10px] font-medium tracking-wide uppercase">
            {item.label}
          </span>
          <span className="line-clamp-1 text-sm font-medium">{item.value ?? '—'}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Flat key-value row inside the dock — no nested card chrome.
 */
export function AdminDockStatRow({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value?: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn('space-y-0.5 py-2', className)}>
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      <p className="text-sm font-medium">{value ?? '—'}</p>
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}

/**
 * Floating inspector card — inset from top/right/bottom, not edge-locked like a sheet.
 */
export function AdminDockPanel({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  isLoading = false,
  stacked = false,
  className,
}: AdminDockPanelProps) {
  if (!open) {
    return null;
  }

  const header = (
    <div className="flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3">
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold">{title}</h2>
        {description ? (
          <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
        ) : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        onClick={onClose}
        aria-label="Close panel"
      >
        <X className="size-4" />
      </Button>
    </div>
  );

  const body = (
    <ScrollArea className="min-h-0 flex-1">
      <div className="px-4 py-3">
        {isLoading ? <AdminPanelSkeleton lines={5} /> : children}
      </div>
    </ScrollArea>
  );

  const footerBar = footer ? (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t px-4 py-3">
      {footer}
    </div>
  ) : null;

  return (
    <aside
      role="complementary"
      aria-label={title}
      data-stacked={stacked ? 'true' : undefined}
      className={cn(
        'bg-card fixed flex flex-col overflow-hidden rounded-lg border shadow-xl',
        stacked ? 'z-[60]' : 'z-40',
        'max-sm:inset-x-3 max-sm:top-[4.5rem] max-sm:bottom-3',
        'sm:right-4 sm:bottom-4 sm:top-[4.5rem] sm:w-80',
        'xl:w-[22rem]',
        className,
      )}
    >
      {header}
      {body}
      {footerBar}
    </aside>
  );
}

/** @deprecated Use AdminDockStatRow for flat dock content. */
export function AdminDockCard({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value?: ReactNode;
  hint?: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <AdminDockStatRow
      label={label}
      value={value}
      hint={hint}
      className={className}
    />
  );
}
