'use client';

import type { ReactNode } from 'react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type AdminInspectorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Narrower for metadata; wider for nested tables. */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeClass: Record<NonNullable<AdminInspectorProps['size']>, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-xl',
};

/**
 * Docked right inspector for read-only drill-down (audit, payments, moderation, user).
 * Prefer this over a full edit Sheet when the primary job is inspection + light actions.
 */
export function AdminInspector({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
}: AdminInspectorProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          'flex w-full flex-col gap-0 p-0',
          sizeClass[size],
          className,
        )}
      >
        <SheetHeader className="space-y-1 border-b px-5 py-4 pr-12 text-left">
          <SheetTitle className="truncate text-base">{title}</SheetTitle>
          {description ? (
            <SheetDescription className="text-sm">{description}</SheetDescription>
          ) : (
            <SheetDescription className="sr-only">Inspector panel</SheetDescription>
          )}
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="space-y-4 px-5 py-4">{children}</div>
        </ScrollArea>
        {footer ? (
          <>
            <Separator />
            <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-3">
              {footer}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

type InspectorFieldProps = {
  label: string;
  value?: ReactNode;
  mono?: boolean;
  className?: string;
};

/**
 * Label/value row for inspector metadata grids.
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
