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
export const TABLE_ACTIONS_COLUMN_WIDTH = 112;

/**
 * Standard actions column — primary text action + overflow menu only.
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
      className={cn(
        'flex w-full items-center justify-end gap-0.5 whitespace-nowrap',
        className,
      )}
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
  primaryLabel?: string;
  onPrimary?: () => void;
  items: TableActionMenuItem[];
  menuLabel?: string;
};

/**
 * Unified row actions: one subtle primary action + ⋯ overflow menu.
 */
export function TableRowActionMenu({
  primaryLabel,
  onPrimary,
  items,
  menuLabel = 'Row actions',
}: TableRowActionMenuProps) {
  const visibleItems = items.filter((item) => !item.hidden);
  const destructiveItems = visibleItems.filter((item) => item.destructive);
  const regularItems = visibleItems.filter((item) => !item.destructive);

  if (!onPrimary && visibleItems.length === 0) {
    return null;
  }

  return (
    <TableRowActions>
      {onPrimary && primaryLabel ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-foreground h-8 px-2 font-medium"
          onClick={onPrimary}
        >
          {primaryLabel}
        </Button>
      ) : null}
      {visibleItems.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground size-8"
              aria-label={menuLabel}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
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
      ) : null}
    </TableRowActions>
  );
}
