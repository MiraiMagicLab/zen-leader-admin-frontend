import type { ComponentProps, ReactNode } from 'react';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

const GRID_COLS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};

const MAX_WIDTH: Record<'sm' | 'md' | 'lg' | 'full', string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  full: 'max-w-none',
};

type AdminPageTabsProps = {
  value: string;
  onValueChange: (value: string) => void;
  columns?: 2 | 3 | 4;
  maxWidth?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
  children: ReactNode;
};

type AdminTabsListProps = {
  columns?: 2 | 3 | 4;
  maxWidth?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
  children: ReactNode;
};

type AdminTabsContentProps = {
  value: string;
  className?: string;
  children: ReactNode;
};

/**
 * Root tabs wrapper with consistent vertical rhythm for admin detail pages.
 */
export function AdminPageTabs({
  value,
  onValueChange,
  className,
  children,
}: AdminPageTabsProps) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className={cn('space-y-4', className)}>
      {children}
    </Tabs>
  );
}

/** Bordered segmented tab list aligned with admin filter chips. */
export function AdminTabsList({
  columns = 2,
  maxWidth = 'md',
  className,
  children,
}: AdminTabsListProps) {
  return (
    <TabsList
      className={cn(
        'grid h-10 w-full gap-1 rounded-md border border-border/70 bg-muted/35 p-1',
        GRID_COLS[columns] ?? 'grid-cols-2',
        MAX_WIDTH[maxWidth],
        className,
      )}
    >
      {children}
    </TabsList>
  );
}

/** Tab trigger sized for admin segmented controls. */
export function AdminTabsTrigger({
  className,
  ...props
}: ComponentProps<typeof TabsTrigger>) {
  return (
    <TabsTrigger
      className={cn('h-full rounded-sm px-3 text-sm', className)}
      {...props}
    />
  );
}

/** Tab panel with standard admin spacing. */
export function AdminTabsContent({
  value,
  className,
  children,
}: AdminTabsContentProps) {
  return (
    <TabsContent value={value} className={cn('space-y-4', className)}>
      {children}
    </TabsContent>
  );
}
