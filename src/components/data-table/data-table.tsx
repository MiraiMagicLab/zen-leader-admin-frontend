'use client';

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type RowData,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import { Inbox, ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminSkeletonBar } from '@/components/admin/admin-loading';
import {
  TABLE_ACTIONS_COLUMN_ID,
  TABLE_ACTIONS_COLUMN_WIDTH,
} from '@/components/admin/table-row-actions';
import { cn } from '@/lib/utils';

declare module '@tanstack/react-table' {
  // Per-column className applied to both the header cell and body cells.
  // Use for responsive hiding, e.g. meta: { className: 'hidden md:table-cell' }.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
  }
}

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  emptyMessage?: string;
  emptyTitle?: string;
  pageSize?: number;
  showRowIndex?: boolean;
  pageOffset?: number;
  /** Client pagination inside the table. Set false when the page handles server paging. */
  showPagination?: boolean;
  onRowClick?: (row: TData) => void;
  /** Highlights the active row (dock / inspector selection). */
  activeRowId?: string | null;
  getRowId?: (row: TData) => string;
  /** Compact row height for dense admin lists. */
  density?: 'default' | 'compact';
  className?: string;
};

function rowIndexColumn<TData>(pageOffset: number): ColumnDef<TData, unknown> {
  return {
    id: '__stt',
    header: 'STT',
    size: 48,
    minSize: 48,
    maxSize: 64,
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm tabular-nums">
        {pageOffset + row.index + 1}
      </span>
    ),
  };
}

/**
 * Enterprise data table with sticky header, skeleton loading, and density control.
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No data.',
  emptyTitle = 'No results',
  pageSize = 10,
  showRowIndex = true,
  pageOffset = 0,
  showPagination = true,
  onRowClick,
  activeRowId = null,
  getRowId,
  density = 'compact',
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const allColumns = showRowIndex
    ? [rowIndexColumn<TData>(pageOffset), ...columns]
    : columns;

  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    ...(showPagination ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    initialState: {
      pagination: { pageSize: showPagination ? pageSize : data.length || pageSize },
    },
  });

  const cellPad = density === 'compact' ? 'py-2' : 'py-3';

  return (
    <div className={cn('space-y-3', className)}>
      <div className="admin-panel overflow-hidden">
        <Table containerClassName="relative max-h-[min(70vh,720px)] overflow-auto">
            <TableHeader className="sticky top-0 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent border-b-0">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'sticky top-0 bg-muted/95 backdrop-blur-xs border-b border-border/80',
                        header.column.columnDef.meta?.className,
                        header.column.id === TABLE_ACTIONS_COLUMN_ID && 'text-right',
                      )}
                      style={
                        header.column.id === '__stt'
                          ? { width: 48, minWidth: 48, textAlign: 'center' }
                          : header.column.id === TABLE_ACTIONS_COLUMN_ID
                            ? {
                                width: TABLE_ACTIONS_COLUMN_WIDTH,
                                minWidth: TABLE_ACTIONS_COLUMN_WIDTH,
                              }
                            : undefined
                      }
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: Math.min(pageSize, 8) }).map((_, rowIndex) => (
                  <TableRow key={`skeleton-${rowIndex}`} className="hover:bg-transparent">
                    {allColumns.map((_, colIndex) => (
                      <TableCell key={`skeleton-${rowIndex}-${colIndex}`} className={cellPad}>
                        <AdminSkeletonBar
                          className={cn(
                            'h-4',
                            colIndex === 0
                              ? 'w-8'
                              : colIndex === allColumns.length - 1
                                ? 'w-10'
                                : 'w-full max-w-[10rem]',
                          )}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => {
                  const rowId = getRowId?.(row.original);
                  const isActive =
                    activeRowId != null && rowId != null && activeRowId === rowId;

                  return (
                  <TableRow
                    key={row.id}
                    className={cn(
                      'hover:bg-muted/30',
                      onRowClick && 'cursor-pointer',
                      isActive && 'bg-muted/55 border-l-2 border-l-primary/70',
                    )}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                    data-state={row.getIsSelected() ? 'selected' : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          cellPad,
                          cell.column.columnDef.meta?.className,
                          cell.column.id === TABLE_ACTIONS_COLUMN_ID && 'text-right',
                        )}
                        style={
                          cell.column.id === '__stt'
                            ? { textAlign: 'center' }
                            : cell.column.id === TABLE_ACTIONS_COLUMN_ID
                              ? {
                                  width: TABLE_ACTIONS_COLUMN_WIDTH,
                                  minWidth: TABLE_ACTIONS_COLUMN_WIDTH,
                                  whiteSpace: 'nowrap',
                                }
                              : undefined
                        }
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  );
                })
              ) : (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={allColumns.length} className="p-6">
                    <Empty className="border-0 p-6">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Inbox className="size-5" />
                        </EmptyMedia>
                        <EmptyTitle>{emptyTitle}</EmptyTitle>
                        <EmptyDescription>{emptyMessage}</EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
      </div>
      {showPagination ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-muted-foreground text-sm tabular-nums">
            Page {table.getState().pagination.pageIndex + 1} /{' '}
            {table.getPageCount() || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
