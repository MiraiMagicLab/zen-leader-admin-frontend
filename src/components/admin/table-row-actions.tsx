import type { ColumnDef } from '@tanstack/react-table';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export const TABLE_ACTIONS_COLUMN_ID = 'actions';
export const TABLE_ACTIONS_COLUMN_WIDTH = 240;

export function tableActionsColumn<T>(): ColumnDef<T> {
  return {
    id: TABLE_ACTIONS_COLUMN_ID,
    header: () => <span className="block w-full text-right">Actions</span>,
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
        'flex w-full items-center justify-end gap-1.5 whitespace-nowrap',
        className,
      )}
    >
      {children}
    </div>
  );
}
