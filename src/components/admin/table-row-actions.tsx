import type { ColumnDef } from '@tanstack/react-table';
import type { LucideIcon } from 'lucide-react';
import { MoreHorizontal } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export const TABLE_ACTIONS_COLUMN_ID = 'actions';
export const TABLE_ACTIONS_COLUMN_WIDTH = 72;

/**
 * Standard actions column — single overflow menu per row.
 */
export function tableActionsColumn<T>(): ColumnDef<T> {
  return {
    id: TABLE_ACTIONS_COLUMN_ID,
    header: () => <span className="sr-only">Actions</span>,
    size: TABLE_ACTIONS_COLUMN_WIDTH,
    minSize: TABLE_ACTIONS_COLUMN_WIDTH,
    maxSize: TABLE_ACTIONS_COLUMN_WIDTH,
    enableSorting: false,
  };
}

type TableRowActionsProps = {
  children: ReactNode;
  className?: string;
};

export function TableRowActions({ children, className }: TableRowActionsProps) {
  return (
    <div
      className={cn('flex w-full items-center justify-end whitespace-nowrap', className)}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  );
}

export type TableActionMenuItem = {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
  hidden?: boolean;
};

type TableRowActionMenuProps = {
  items: TableActionMenuItem[];
  menuLabel?: string;
};

/**
 * Unified row actions: all actions live in one ⋯ dropdown menu.
 */
/**
 * @deprecated Prefer inline `AdminActionBar` buttons on dock footers and detail page headers.
 * Row/list dropdown menus are no longer used in admin PC flows.
 */
export function TableRowActionMenu({ items, menuLabel = 'Actions' }: TableRowActionMenuProps) {
  const visibleItems = items.filter((item) => !item.hidden);

  if (visibleItems.length === 0) {
    return null;
  }

  const destructiveItems = visibleItems.filter((item) => item.destructive);
  const regularItems = visibleItems.filter((item) => !item.destructive);

  return (
    <TableRowActions>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-muted-foreground h-8 gap-1 px-2.5 text-xs font-medium"
            aria-label={menuLabel}
          >
            <MoreHorizontal className="size-3.5" />
            Actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {regularItems.map((item) => {
            const Icon = item.icon;
            return (
              <DropdownMenuItem
                key={item.label}
                disabled={item.disabled}
                onClick={item.onClick}
              >
                {Icon ? <Icon className="mr-2 size-4" /> : null}
                {item.label}
              </DropdownMenuItem>
            );
          })}
          {regularItems.length > 0 && destructiveItems.length > 0 ? (
            <DropdownMenuSeparator />
          ) : null}
          {destructiveItems.map((item) => {
            const Icon = item.icon;
            return (
              <DropdownMenuItem
                key={item.label}
                disabled={item.disabled}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                onClick={item.onClick}
              >
                {Icon ? <Icon className="mr-2 size-4" /> : null}
                {item.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </TableRowActions>
  );
}
