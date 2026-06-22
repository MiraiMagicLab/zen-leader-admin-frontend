'use client';

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  isLoading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  showRowIndex?: boolean;
  pageOffset?: number;
  /** Client pagination inside the table. Set false when the page handles server paging. */
  showPagination?: boolean;
};

function rowIndexColumn<TData>(): ColumnDef<TData, unknown> {
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
        {row.index + 1}
      </span>
    ),
  };
}

export function DataTable<TData, TValue>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'Không có dữ liệu.',
  pageSize = 10,
  showRowIndex = false,
  pageOffset = 0,
  showPagination = true,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const allColumns = showRowIndex
    ? [rowIndexColumn<TData>(), ...columns]
    : columns;

  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    ...(showPagination ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    initialState: { pagination: { pageSize: showPagination ? pageSize : data.length || pageSize } },
  });

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={
                      header.column.id === '__stt'
                        ? { width: 48, minWidth: 48, textAlign: 'center' }
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
              <TableRow>
                <TableCell colSpan={allColumns.length} className="h-24 text-center">
                  <Spinner className="mx-auto" />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/40">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={
                        cell.column.id === '__stt'
                          ? { textAlign: 'center' }
                          : undefined
                      }
                    >
                      {cell.column.id === '__stt'
                        ? pageOffset + (cell.row.index as number) + 1
                        : flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={allColumns.length} className="h-24 text-center">
                  {emptyMessage}
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
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Trước
          </Button>
          <span className="text-muted-foreground text-sm">
            Trang {table.getState().pagination.pageIndex + 1} /{' '}
            {table.getPageCount() || 1}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Sau
          </Button>
        </div>
      ) : null}
    </div>
  );
}
