import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { Copy, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/admin/page-header';
import { ServerPagination } from '@/components/admin/server-pagination';
import { DataTable } from '@/components/data-table/data-table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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

function canRetryEnrollment(order: AdminPaymentOrderResponse): boolean {
  return (
    order.status === 'ENROLL_FAILED' ||
    (order.status === 'PAID' && !order.enrollmentActive)
  );
}

export function PaymentsPage() {
  useAdminPageMeta(ADMIN_PAGE_META.payments);

  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);

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

  const rows = ordersQuery.data?.data ?? [];
  // Only orders with enrollment issues can be retried.
  const retryableRows = rows.filter(canRetryEnrollment);
  const selectedRetryable = retryableRows.filter((order) => selectedIds.includes(order.orderId));
  const allRetryableSelected =
    retryableRows.length > 0 && selectedRetryable.length === retryableRows.length;

  const toggleRow = useCallback((orderId: string, checked: boolean) => {
    setSelectedIds((current) =>
      checked ? [...new Set([...current, orderId])] : current.filter((id) => id !== orderId),
    );
  }, []);

  const retryableIds = retryableRows.map((order) => order.orderId).join(',');
  const toggleAll = useCallback(
    (checked: boolean) => {
      setSelectedIds(checked ? (retryableIds ? retryableIds.split(',') : []) : []);
    },
    [retryableIds],
  );

  const runBulkRetry = async () => {
    const targets = selectedRetryable.map((order) => order.orderId);
    setBulkPending(true);
    try {
      for (const orderId of targets) {
        await paymentsApi.retryEnrollment(orderId);
      }
      toast.success(
        `Enrollment retry started for ${targets.length} ${
          targets.length === 1 ? 'order' : 'orders'
        }.`,
      );
      setSelectedIds([]);
      void queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setBulkPending(false);
      setBulkOpen(false);
    }
  };

  const columns = useMemo<ColumnDef<AdminPaymentOrderResponse>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <Checkbox
            aria-label="Select all retryable orders on this page"
            checked={allRetryableSelected}
            disabled={retryableRows.length === 0}
            onCheckedChange={(checked) => toggleAll(checked === true)}
          />
        ),
        cell: ({ row }) =>
          canRetryEnrollment(row.original) ? (
            <Checkbox
              aria-label="Select order"
              checked={selectedIds.includes(row.original.orderId)}
              onCheckedChange={(checked) => toggleRow(row.original.orderId, checked === true)}
            />
          ) : null,
        enableSorting: false,
      },
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
        meta: { className: 'hidden md:table-cell' },
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
    [retryMutation, selectedIds, allRetryableSelected, retryableRows, toggleAll, toggleRow],
  );

  return (
    <div className="space-y-6">
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

      {selectedRetryable.length > 0 ? (
        <div className="bg-muted/40 flex flex-wrap items-center gap-2 rounded-lg border p-3">
          <span className="text-sm font-medium">{selectedRetryable.length} selected</span>
          <div className="flex flex-1 flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={bulkPending}
              onClick={() => setBulkOpen(true)}
            >
              <RefreshCw className="mr-2 size-4" />
              Retry enrollment ({selectedRetryable.length})
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={rows}
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

      <AlertDialog
        open={bulkOpen}
        onOpenChange={(open) => {
          if (!open && !bulkPending) {
            setBulkOpen(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retry enrollment for selected orders?</AlertDialogTitle>
            <AlertDialogDescription>
              This will start an enrollment retry for {selectedRetryable.length}{' '}
              {selectedRetryable.length === 1 ? 'order' : 'orders'} with enrollment issues.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkPending}
              onClick={(event) => {
                event.preventDefault();
                void runBulkRetry();
              }}
            >
              {bulkPending ? 'Working…' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
