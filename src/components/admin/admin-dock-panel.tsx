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
  /** Mobile sheet open state; defaults to {@link open}. */
  mobileOpen?: boolean;
  /** Called when the mobile sheet is dismissed without clearing selection. */
  onMobileClose?: () => void;
  /** Keeps the desktop dock column visible with an empty hint when nothing is selected. */
  showPlaceholder?: boolean;
  placeholderTitle?: string;
  placeholderDescription?: string;
  className?: string;
};

/**
 * Empty dock column shown before a row is selected (desktop split layout).
 */
export function AdminDockEmpty({
  title = 'No selection',
  description = 'Click a table row to open the inspector dock.',
  className,
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center',
        className,
      )}
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-[14rem] text-xs">{description}</p>
    </div>
  );
}

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
 * Independent metric cards — tap any card to open or focus the dock panel.
 */
export function AdminDockIndicatorStrip({
  items,
  onOpen,
  className,
}: AdminDockIndicatorStripProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-3', className)}>
      {items.map((item) => (
        <AdminDockCard
          key={item.label}
          label={item.label}
          value={item.value}
          hint={item.hint}
          active={item.active}
          onClick={onOpen}
        />
      ))}
    </div>
  );
}

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
  mobileOpen,
  onMobileClose,
  showPlaceholder = false,
  placeholderTitle,
  placeholderDescription,
  className,
}: AdminDockPanelProps) {
  const sheetOpen = mobileOpen ?? open;
  const handleSheetOpenChange = (next: boolean) => {
    if (!next) {
      if (onMobileClose) {
        onMobileClose();
      } else {
        onClose();
      }
    }
  };
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

  const showDesktopDock = open || showPlaceholder;

  return (
    <>
      {/* Desktop inline dock — always reserved when showPlaceholder to avoid layout shift */}
      {showDesktopDock ? (
        <aside
          className={cn(
            'hidden w-full shrink-0 flex-col overflow-hidden rounded-xl border bg-card lg:flex lg:w-[22rem] xl:w-96',
            open ? 'shadow-sm' : 'border-dashed bg-muted/20',
            className,
          )}
        >
          {open ? (
            <>
              {header}
              {body}
              {footerBar}
            </>
          ) : (
            <AdminDockEmpty
              title={placeholderTitle}
              description={placeholderDescription}
            />
          )}
        </aside>
      ) : null}

      {/* Mobile sheet fallback */}
      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
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
