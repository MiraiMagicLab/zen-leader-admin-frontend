import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { Copy, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/admin/page-header';
import { ServerPagination } from '@/components/admin/server-pagination';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { queryKeys } from '@/hooks/query-keys';
import { ADMIN_LIST_PAGE_SIZE } from '@/lib/admin-pagination';
import { ADMIN_PAGE_META } from '@/lib/admin-page-meta';
import { formatDateTime } from '@/lib/format';
import { useAdminPageMeta } from '@/lib/page-meta';
import { ROUTES } from '@/routes/paths';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import { paymentsApi } from '@/services/payments/payments-api';
import type { AdminPaymentOrderResponse } from '@/services/types/domain';

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Awaiting payment',
  PAID: 'Paid',
  ENROLL_FAILED: 'Enrollment failed',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
  REFUND_PENDING: 'Refund pending',
  REFUNDED: 'Refunded',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  ...Object.entries(PAYMENT_STATUS_LABEL).map(([value, label]) => ({ value, label })),
];

function paymentStatusLabel(status: string) {
  return PAYMENT_STATUS_LABEL[status] ?? status;
}

export function PaymentsPage() {
  useAdminPageMeta(ADMIN_PAGE_META.payments);

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
        ADMIN_LIST_PAGE_SIZE,
        statusFilter === 'all' ? undefined : statusFilter,
        searchKeyword || undefined,
      ),
  });

  const retryMutation = useMutation({
    mutationFn: (orderId: string) => paymentsApi.retryEnrollment(orderId),
    onSuccess: () => {
      toast.success('Enrollment retry started.');
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
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-mono text-xs"
            title="Copy full order code"
            onClick={() => {
              void navigator.clipboard?.writeText(row.original.orderId);
              toast.success('Order code copied.');
            }}
          >
            {row.original.orderId.slice(0, 8)}…
            <Copy className="size-3" />
          </button>
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
        cell: ({ row }) => (
          <Button variant="link" className="h-auto p-0" asChild>
            <Link to={ROUTES.courseRunDetail(row.original.courseRunId)}>
              {row.original.courseRunCode}
            </Link>
          </Button>
        ),
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => `${row.original.amount.toLocaleString()} ${row.original.currency}`,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant="secondary">{paymentStatusLabel(row.original.status)}</Badge>
        ),
      },
      {
        id: 'enrollment',
        header: 'Enrollment',
        cell: ({ row }) => {
          const order = row.original;
          if (order.enrollmentActive) {
            return <Badge>Enrolled</Badge>;
          }
          if (order.status === 'ENROLL_FAILED') {
            return <Badge variant="destructive">Enrollment failed</Badge>;
          }
          if (order.status === 'PAID') {
            return <Badge variant="outline">Awaiting enrollment</Badge>;
          }
          if (order.status === 'PENDING') {
            return <Badge variant="outline">Awaiting payment</Badge>;
          }
          return <span className="text-muted-foreground text-xs">—</span>;
        },
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to={ROUTES.courseRunDetail(row.original.courseRunId)}>Open run</Link>
            </Button>
            {row.original.status === 'ENROLL_FAILED' ||
            (row.original.status === 'PAID' && !row.original.enrollmentActive) ? (
              <Button
                variant="outline"
                size="sm"
                disabled={retryMutation.isPending}
                onClick={() => retryMutation.mutate(row.original.orderId)}
              >
                Retry enrollment
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [retryMutation],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Payments"
        description="Review payment orders and resolve pending enrollments."
        actions={
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
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
            placeholder="Search by name, email, or order code"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm">Orders on page</p>
            <p className="mt-2 text-2xl font-semibold">{ordersQuery.data?.data?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm">Awaiting payment</p>
            <p className="mt-2 text-2xl font-semibold">
              {ordersQuery.data?.data?.filter((order) => order.status === 'PENDING').length ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm">Enrollment issues</p>
            <p className="mt-2 text-2xl font-semibold">
              {ordersQuery.data?.data?.filter(
                (order) =>
                  order.status === 'ENROLL_FAILED' ||
                  (order.status === 'PAID' && !order.enrollmentActive),
              ).length ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={ordersQuery.data?.data ?? []}
        isLoading={ordersQuery.isLoading}
        emptyMessage="No payment orders yet."
        showRowIndex
        pageOffset={page * ADMIN_LIST_PAGE_SIZE}
        showPagination={false}
      />

      <ServerPagination
        page={page}
        totalPages={ordersQuery.data?.totalPages ?? 1}
        onPageChange={setPage}
      />
    </div>
  );
}
