import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/admin/page-header';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { queryKeys } from '@/hooks/query-keys';
import { formatDateTime } from '@/lib/format';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import { paymentsApi } from '@/services/payments/payments-api';
import type { AdminPaymentOrderResponse } from '@/services/types/domain';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'PENDING', label: 'PENDING' },
  { value: 'PAID', label: 'PAID' },
  { value: 'ENROLL_FAILED', label: 'ENROLL_FAILED' },
  { value: 'EXPIRED', label: 'EXPIRED' },
  { value: 'CANCELLED', label: 'CANCELLED' },
  { value: 'REFUND_PENDING', label: 'REFUND_PENDING' },
  { value: 'REFUNDED', label: 'REFUNDED' },
];

export function PaymentsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(0);
      setSearchKeyword(search.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const ordersQuery = useQuery({
    queryKey: queryKeys.payments.list(page, statusFilter, searchKeyword),
    queryFn: () =>
      paymentsApi.listOrders(
        page,
        20,
        statusFilter === 'all' ? undefined : statusFilter,
        searchKeyword || undefined,
      ),
  });

  const retryMutation = useMutation({
    mutationFn: (orderId: string) => paymentsApi.retryEnrollment(orderId),
    onSuccess: () => {
      toast.success('Re-enrollment attempted.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const columns = useMemo<ColumnDef<AdminPaymentOrderResponse>[]>(
    () => [
      {
        accessorKey: 'orderId',
        header: 'Order code',
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.orderId.slice(0, 8)}…</span>
        ),
      },
      {
        id: 'user',
        header: 'User',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.userDisplayName}</p>
            <p className="text-muted-foreground text-xs">{row.original.userEmail}</p>
          </div>
        ),
      },
      {
        accessorKey: 'courseRunCode',
        header: 'Course run',
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) =>
          `${row.original.amount.toLocaleString()} ${row.original.currency}`,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <Badge variant="secondary">{row.original.status}</Badge>,
      },
      {
        accessorKey: 'enrollmentActive',
        header: 'Enrolled',
        cell: ({ row }) =>
          row.original.enrollmentActive ? (
            <Badge>Active</Badge>
          ) : (
            <Badge variant="outline">Not yet</Badge>
          ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Created at',
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) =>
          row.original.status === 'ENROLL_FAILED' ||
          (row.original.status === 'PAID' && !row.original.enrollmentActive) ? (
            <Button
              variant="outline"
              size="sm"
              disabled={retryMutation.isPending}
              onClick={() => retryMutation.mutate(row.original.orderId)}
            >
              Retry enrollment
            </Button>
          ) : null,
      },
    ],
    [retryMutation],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Payments"
        description="Track orders and handle enrollment errors after payment."
        actions={
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void ordersQuery.refetch()}
            >
              <RefreshCw className="mr-2 size-4" />
               Refresh
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Search by name, email, or order code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={ordersQuery.data?.data ?? []}
        isLoading={ordersQuery.isLoading}
        emptyMessage="No payment orders yet."
        showRowIndex
        pageOffset={page * 20}
        showPagination={false}
      />

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 0}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous page
        </Button>
        <span className="text-muted-foreground text-sm">
          Page {page + 1} / {ordersQuery.data?.totalPages ?? 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page + 1 >= (ordersQuery.data?.totalPages ?? 1)}
          onClick={() => setPage((p) => p + 1)}
        >
          Next page
        </Button>
      </div>
    </div>
  );
}
