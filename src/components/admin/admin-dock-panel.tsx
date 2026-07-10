'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';

import { AdminPanelSkeleton } from '@/components/admin/admin-loading';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type AdminDockLayoutProps = {
  children: ReactNode;
  dock?: ReactNode;
  className?: string;
};

/**
 * Split list + dock workspace. Table stays visible; dock opens beside it on large screens.
 */
export function AdminDockLayout({ children, dock, className }: AdminDockLayoutProps) {
  return (
    <div className={cn('flex min-h-0 flex-col gap-4 lg:flex-row lg:items-start', className)}>
      <div className="min-w-0 flex-1">{children}</div>
      {dock}
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
  className?: string;
};

/**
 * Right-hand dock panel for row inspection (desktop inline, mobile sheet).
 */
export function AdminDockPanel({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  isLoading = false,
  className,
}: AdminDockPanelProps) {
  const header = (
    <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
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
    <ScrollArea className="flex-1">
      <div className="px-4 py-4">
        {isLoading ? <AdminPanelSkeleton lines={5} /> : children}
      </div>
    </ScrollArea>
  );

  const footerBar = footer ? (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t px-4 py-3">
      {footer}
    </div>
  ) : null;

  return (
    <>
      {/* Desktop inline dock */}
      {open ? (
        <aside
          className={cn(
            'hidden w-full shrink-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm lg:flex lg:w-[22rem] xl:w-96',
            className,
          )}
        >
          {header}
          {body}
          {footerBar}
        </aside>
      ) : null}

      {/* Mobile sheet fallback */}
      <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md lg:hidden">
          <SheetHeader className="space-y-1 border-b px-4 py-3 pr-12 text-left">
            <SheetTitle className="text-sm">{title}</SheetTitle>
            {description ? (
              <SheetDescription className="text-xs">{description}</SheetDescription>
            ) : (
              <SheetDescription className="sr-only">Detail panel</SheetDescription>
            )}
          </SheetHeader>
          {body}
          {footerBar}
        </SheetContent>
      </Sheet>
    </>
  );
}

type AdminDockCardProps = {
  label: string;
  value?: ReactNode;
  hint?: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
};

/**
 * Compact dock indicator card — tap to expand the dock panel for that entity.
 */
export function AdminDockCard({
  label,
  value,
  hint,
  active = false,
  onClick,
  className,
}: AdminDockCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left transition-colors',
        active
          ? 'border-foreground/20 bg-muted shadow-sm'
          : 'bg-card hover:bg-muted/60',
        className,
      )}
    >
      <span className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
        {label}
      </span>
      <span className="line-clamp-2 text-sm font-medium">{value ?? '—'}</span>
      {hint ? <span className="text-muted-foreground text-xs">{hint}</span> : null}
    </button>
  );
}
