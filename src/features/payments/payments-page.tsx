import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Copy, RefreshCw } from 'lucide-react';
import { adminToast as toast } from '@/lib/admin-toast';

import { AdminBulkBar } from '@/components/admin/admin-bulk-bar';
import { AdminFilterBar } from '@/components/admin/admin-filter-bar';
import { ConfirmDialog, type PendingConfirm } from '@/components/admin/confirm-dialog';
import { FilterSelect } from '@/components/admin/filter-select';
import { AdminDockLayout, AdminDockPanel } from '@/components/admin/admin-dock-panel';
import { InspectorField } from '@/components/admin/admin-inspector';
import { TechnicalDetails } from '@/components/admin/technical-details';
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
import { queryKeys } from '@/hooks/query-keys';
import { ADMIN_LIST_PAGE_SIZE } from '@/lib/admin-pagination';
import { ADMIN_PAGE_META } from '@/lib/admin-page-meta';
import { formatDateTime } from '@/lib/format';
import { humanizeEnumValue } from '@/lib/humanize';
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
  return PAYMENT_STATUS_LABEL[status] ?? humanizeEnumValue(status);
}

const PROVIDER_LABEL: Record<string, string> = {
  VNPAY: 'VNPay',
  PAYPAL: 'PayPal',
  MOMO: 'MoMo',
  STRIPE: 'Stripe',
  MANUAL: 'Manual',
};

function paymentProviderLabel(provider: string | null | undefined): string {
  if (!provider?.trim()) return '—';
  return PROVIDER_LABEL[provider.toUpperCase()] ?? humanizeEnumValue(provider);
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
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState(() => {
    const status = searchParams.get('status');
    if (status && STATUS_OPTIONS.some((option) => option.value === status)) {
      return status;
    }
    return 'all';
  });
  const [search, setSearch] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);
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
    onError: (error) => toast.error(error),
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

  const runConfirm = async () => {
    if (!pendingConfirm) return;
    setConfirmPending(true);
    try {
      await pendingConfirm.action();
      setPendingConfirm(null);
    } finally {
      setConfirmPending(false);
    }
  };

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
      toast.error(error);
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
        id: 'user',
        header: 'Learner',
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
        cell: ({ row }) =>
          `${row.original.amount.toLocaleString('vi-VN')} ${row.original.currency}`,
      },
      {
        accessorKey: 'provider',
        header: 'Provider',
        meta: { className: 'hidden lg:table-cell' },
        cell: ({ row }) => paymentProviderLabel(row.original.provider),
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
        cell: ({ row }) => {
          const order = row.original;
          const items = [
            {
              label: 'Open course run',
              onClick: () => navigate(ROUTES.courseRunDetail(order.courseRunId)),
            },
            {
              label: 'Copy order reference',
              icon: Copy,
              onClick: () => {
                void navigator.clipboard?.writeText(order.orderId);
                toast.success('Order reference copied.');
              },
            },
            ...(canRetryEnrollment(order)
              ? [
                  {
                    label: 'Retry enrollment',
                    icon: RefreshCw,
                    onClick: () =>
                      setPendingConfirm({
                        title: 'Retry enrollment for this order?',
                        description: `Re-enroll ${order.userDisplayName} into ${order.courseRunCode}.`,
                        confirmLabel: 'Retry enrollment',
                        variant: 'default' as const,
                        action: async () => {
                          await retryMutation.mutateAsync(order.orderId);
                        },
                      }),
                  },
                ]
              : []),
          ];

          return (
            <TableRowActionMenu
              items={items}
              menuLabel={`Actions for ${order.userDisplayName}`}
            />
          );
        },
      },
    ],
    [navigate, retryMutation, selectedIds, allRetryableSelected, retryableRows, toggleAll, toggleRow],
  );

  return (
    <AdminPageShell
      variant="list"
      density="compact"
      title="Payments"
      description="Track checkouts, resolve enrollment failures, and open related course runs."
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
          searchPlaceholder="Search learner name, email, or course run"
          showClear={hasActiveFilters}
          clearLabel="Clear filters"
          onClear={() => {
            setSearch('');
            setStatusFilter('all');
          }}
        >
          <FilterSelect
            ariaLabel="Payment status"
            placeholder="Status"
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={(value) => {
              setPage(0);
              setStatusFilter(value);
            }}
          />
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
          stacked={pendingConfirm !== null || bulkOpen}
          title={selectedLiveOrder?.userDisplayName ?? 'Order detail'}
          description={
            selectedLiveOrder
              ? `${selectedLiveOrder.courseRunCode} · ${paymentStatusLabel(selectedLiveOrder.status)}`
              : undefined
          }
          footer={
            selectedLiveOrder && canRetryEnrollment(selectedLiveOrder) ? (
              <Button
                size="sm"
                disabled={retryMutation.isPending}
                onClick={() =>
                  setPendingConfirm({
                    title: 'Retry enrollment for this order?',
                    description: `Re-enroll ${selectedLiveOrder.userDisplayName} into ${selectedLiveOrder.courseRunCode}.`,
                    confirmLabel: 'Retry enrollment',
                    variant: 'default',
                    action: async () => {
                      await retryMutation.mutateAsync(selectedLiveOrder.orderId);
                    },
                  })
                }
              >
                <RefreshCw className="mr-2 size-4" />
                Retry enrollment
              </Button>
            ) : null
          }
        >
          {selectedLiveOrder ? (
            <div className="space-y-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <InspectorField
                  label="Status"
                  value={
                    <Badge variant="secondary">
                      {paymentStatusLabel(selectedLiveOrder.status)}
                    </Badge>
                  }
                />
                <InspectorField
                  label="Provider"
                  value={paymentProviderLabel(selectedLiveOrder.provider)}
                />
                <InspectorField
                  label="Learner"
                  value={
                    <div>
                      <p>{selectedLiveOrder.userDisplayName}</p>
                      <p className="text-muted-foreground text-xs">
                        {selectedLiveOrder.userEmail}
                      </p>
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
                  value={`${selectedLiveOrder.amount.toLocaleString('vi-VN')} ${selectedLiveOrder.currency}`}
                />
                <InspectorField
                  label="Paid at"
                  value={formatDateTime(selectedLiveOrder.paidAt)}
                />
                <InspectorField
                  label="Created"
                  value={formatDateTime(selectedLiveOrder.createdAt)}
                />
                <InspectorField
                  label="Expires"
                  value={formatDateTime(selectedLiveOrder.expiresAt)}
                />
                <InspectorField
                  label="Enrollment"
                  value={
                    selectedLiveOrder.enrollmentActive
                      ? 'Active'
                      : selectedLiveOrder.status === 'ENROLL_FAILED'
                        ? 'Failed'
                        : selectedLiveOrder.status === 'PAID'
                          ? 'Awaiting'
                          : '—'
                  }
                />
                {selectedLiveOrder.enrollmentFailureMessage ? (
                  <InspectorField
                    label="Failure reason"
                    value={selectedLiveOrder.enrollmentFailureMessage}
                    className="col-span-2"
                  />
                ) : null}
              </dl>
              <TechnicalDetails>
                <dl className="grid grid-cols-1 gap-3">
                  <InspectorField
                    label="Order reference"
                    value={
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 font-mono text-xs"
                        onClick={() => {
                          void navigator.clipboard?.writeText(selectedLiveOrder.orderId);
                          toast.success('Order reference copied.');
                        }}
                      >
                        {selectedLiveOrder.orderId}
                        <Copy className="size-3" />
                      </button>
                    }
                  />
                  <InspectorField
                    label="Retry attempts"
                    value={selectedLiveOrder.enrollmentRetryCount}
                  />
                  <InspectorField
                    label="Failure code"
                    value={
                      selectedLiveOrder.enrollmentFailureCode
                        ? humanizeEnumValue(selectedLiveOrder.enrollmentFailureCode)
                        : '—'
                    }
                  />
                </dl>
              </TechnicalDetails>
            </div>
          ) : null}
        </AdminDockPanel>
      </>

      <ConfirmDialog
        open={pendingConfirm !== null}
        onOpenChange={(open) => {
          if (!open && !confirmPending) setPendingConfirm(null);
        }}
        title={pendingConfirm?.title ?? ''}
        description={pendingConfirm?.description ?? ''}
        confirmLabel={pendingConfirm?.confirmLabel}
        variant={pendingConfirm?.variant ?? 'destructive'}
        pending={confirmPending}
        onConfirm={() => void runConfirm()}
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
    </AdminPageShell>
  );
}
