import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Link, useNavigate } from 'react-router-dom';
import { Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { AdminBulkBar } from '@/components/admin/admin-bulk-bar';
import { AdminFilterBar } from '@/components/admin/admin-filter-bar';
import { AdminDockLayout, AdminDockPanel } from '@/components/admin/admin-dock-panel';
import { InspectorField } from '@/components/admin/admin-inspector';
import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { AdminQueryError } from '@/components/admin/admin-query-state';
import { ServerPagination } from '@/components/admin/server-pagination';
import { TableRowActionMenu, tableActionsColumn } from '@/components/admin/table-row-actions';
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
import { Checkbox } from '@/components/ui/checkbox';
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
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<AdminPaymentOrderResponse | null>(null);

  const clearSelectedOrder = useCallback(() => setSelectedOrder(null), []);

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
  const hasActiveFilters = statusFilter !== 'all' || Boolean(search.trim());

  // Keep the inspector snapshot in sync after a retry mutation invalidates the list.
  const selectedLiveOrder =
    (selectedOrder && rows.find((order) => order.orderId === selectedOrder.orderId)) ||
    selectedOrder;

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
            <div onClick={(event) => event.stopPropagation()}>
              <Checkbox
                aria-label="Select order"
                checked={selectedIds.includes(row.original.orderId)}
                onCheckedChange={(checked) => toggleRow(row.original.orderId, checked === true)}
              />
            </div>
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
            onClick={(event) => {
              event.stopPropagation();
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
          <Button
            variant="link"
            className="h-auto p-0"
            asChild
            onClick={(event) => event.stopPropagation()}
          >
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
        ...tableActionsColumn<AdminPaymentOrderResponse>(),
        cell: ({ row }) => (
          <TableRowActionMenu
            primaryLabel="Open"
            onPrimary={() => navigate(ROUTES.courseRunDetail(row.original.courseRunId))}
            items={
              canRetryEnrollment(row.original)
                ? [
                    {
                      label: 'Retry enrollment',
                      icon: RefreshCw,
                      onClick: () => retryMutation.mutate(row.original.orderId),
                    },
                  ]
                : []
            }
          />
        ),
      },
    ],
    [navigate, retryMutation, selectedIds, allRetryableSelected, retryableRows, toggleAll, toggleRow],
  );

  return (
    <AdminPageShell
      variant="list"
      density="compact"
      title="Payments"
      description="Review payment orders and resolve pending enrollments. Select a row to inspect."
      actions={
        <Button variant="outline" size="sm" onClick={() => void ordersQuery.refetch()}>
          <RefreshCw className="mr-2 size-4" />
          Refresh
        </Button>
      }
      toolbar={
        <AdminFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by name, email, or order code"
          showClear={hasActiveFilters}
          clearLabel="Clear filters"
          onClear={() => {
            setSearch('');
            setStatusFilter('all');
          }}
        >
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
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
        </AdminFilterBar>
      }
    >
      <>
        <AdminDockLayout dockOpen={Boolean(selectedLiveOrder)}>
          <div className="space-y-3">
            {ordersQuery.isError ? (
              <AdminQueryError
                message={getApiErrorMessage(ordersQuery.error)}
                onRetry={() => void ordersQuery.refetch()}
              />
            ) : null}

            <AdminBulkBar count={selectedRetryable.length}>
              <Button
                variant="ghost"
                size="sm"
                disabled={bulkPending}
                onClick={() => setBulkOpen(true)}
              >
                <RefreshCw className="mr-2 size-4" />
                Retry enrollment
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                Clear
              </Button>
            </AdminBulkBar>

            <DataTable
              columns={columns}
              data={rows}
              isLoading={ordersQuery.isLoading}
              emptyMessage="No payment orders yet."
              showRowIndex
              pageOffset={page * ADMIN_LIST_PAGE_SIZE}
              showPagination={false}
              activeRowId={selectedLiveOrder?.orderId ?? null}
              getRowId={(row) => row.orderId}
              onRowClick={setSelectedOrder}
            />

            <ServerPagination
              page={page}
              totalPages={ordersQuery.data?.totalPages ?? 1}
              onPageChange={(nextPage) => {
                setPage(nextPage);
                clearSelectedOrder();
              }}
            />
          </div>
        </AdminDockLayout>

        <AdminDockPanel
          open={Boolean(selectedLiveOrder)}
          onClose={clearSelectedOrder}
          title="Order detail"
          description={
            selectedLiveOrder ? `Order ${selectedLiveOrder.orderId.slice(0, 8)}…` : undefined
          }
          footer={
            selectedLiveOrder && canRetryEnrollment(selectedLiveOrder) ? (
              <Button
                size="sm"
                disabled={retryMutation.isPending}
                onClick={() => retryMutation.mutate(selectedLiveOrder.orderId)}
              >
                <RefreshCw className="mr-2 size-4" />
                Retry enrollment
              </Button>
            ) : null
          }
        >
          {selectedLiveOrder ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <InspectorField label="Order ID" value={selectedLiveOrder.orderId} mono className="col-span-2" />
              <InspectorField
                label="Status"
                value={<Badge variant="secondary">{paymentStatusLabel(selectedLiveOrder.status)}</Badge>}
              />
              <InspectorField label="Provider" value={selectedLiveOrder.provider} />
              <InspectorField
                label="User"
                value={
                  <div>
                    <p>{selectedLiveOrder.userDisplayName}</p>
                    <p className="text-muted-foreground text-xs">{selectedLiveOrder.userEmail}</p>
                  </div>
                }
                className="col-span-2"
              />
              <InspectorField
                label="Course run"
                value={
                  <Link
                    className="text-primary hover:underline"
                    to={ROUTES.courseRunDetail(selectedLiveOrder.courseRunId)}
                  >
                    {selectedLiveOrder.courseRunCode}
                  </Link>
                }
                className="col-span-2"
              />
              <InspectorField
                label="Amount"
                value={`${selectedLiveOrder.amount.toLocaleString()} ${selectedLiveOrder.currency}`}
              />
              <InspectorField label="Created" value={formatDateTime(selectedLiveOrder.createdAt)} />
              <InspectorField label="Expires at" value={formatDateTime(selectedLiveOrder.expiresAt)} />
              <InspectorField label="Paid at" value={formatDateTime(selectedLiveOrder.paidAt)} />
              <InspectorField
                label="Enrollment active"
                value={
                  selectedLiveOrder.enrollmentActive == null
                    ? '—'
                    : selectedLiveOrder.enrollmentActive
                      ? 'Yes'
                      : 'No'
                }
              />
              <InspectorField
                label="Enrollment retry count"
                value={selectedLiveOrder.enrollmentRetryCount}
              />
              <InspectorField
                label="Enrollment failure code"
                value={selectedLiveOrder.enrollmentFailureCode}
                mono
                className="col-span-2"
              />
              <InspectorField
                label="Enrollment failure message"
                value={selectedLiveOrder.enrollmentFailureMessage}
                className="col-span-2"
              />
            </dl>
          ) : null}
        </AdminDockPanel>
      </>

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
    </AdminPageShell>
  );
}
