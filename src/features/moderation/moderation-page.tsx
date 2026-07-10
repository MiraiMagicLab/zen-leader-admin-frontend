import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
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
import { safetyApi } from '@/services/safety/safety-api';
import type { UgcReportResponse } from '@/services/types/domain';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
};

const CONTENT_TYPE_LABEL: Record<string, string> = {
  MESSAGE: 'Message',
  COMMENT: 'Comment',
  EVENT: 'Event',
  USER: 'User',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'DISMISSED', label: 'Dismissed' },
] as const;

/**
 * Resolves the best-effort navigable link for a reported content target.
 * Events deep-link to their detail page; users and comments only have an ID
 * to show since there is no dedicated deep link route for them yet.
 */
function targetContentLink(report: UgcReportResponse): string | null {
  switch (report.targetContentType.toUpperCase()) {
    case 'EVENT':
      return ROUTES.eventDetail(report.targetContentId);
    case 'USER':
      return ROUTES.users;
    default:
      return null;
  }
}

export function ModerationPage() {
  useAdminPageMeta(ADMIN_PAGE_META.moderation);

  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [search, setSearch] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'RESOLVED' | 'DISMISSED' | null>(null);
  const [bulkPending, setBulkPending] = useState(false);
  const [selectedReport, setSelectedReport] = useState<UgcReportResponse | null>(null);

  const clearSelectedReport = useCallback(() => setSelectedReport(null), []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(0);
      setSearchKeyword(search.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const reportsQuery = useQuery({
    queryKey: queryKeys.safety.reports(page, statusFilter, searchKeyword),
    queryFn: () =>
      safetyApi.listReports(
        page,
        ADMIN_LIST_PAGE_SIZE,
        statusFilter === 'all' ? undefined : statusFilter,
        searchKeyword || undefined,
      ),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ reportId, status }: { reportId: string; status: string }) =>
      safetyApi.updateReportStatus(reportId, status),
    onSuccess: () => {
      toast.success('Report updated.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.safety.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const rows = reportsQuery.data?.data ?? [];
  // Only pending reports can be resolved or dismissed in bulk.
  const pendingRows = rows.filter((report) => report.status === 'PENDING');
  const selectedPending = pendingRows.filter((report) => selectedIds.includes(report.id));
  const allPendingSelected =
    pendingRows.length > 0 && selectedPending.length === pendingRows.length;
  const hasActiveFilters = statusFilter !== 'PENDING' || Boolean(search.trim());

  const selectedLiveReport =
    (selectedReport && rows.find((report) => report.id === selectedReport.id)) ||
    selectedReport;

  const toggleRow = useCallback((reportId: string, checked: boolean) => {
    setSelectedIds((current) =>
      checked ? [...new Set([...current, reportId])] : current.filter((id) => id !== reportId),
    );
  }, []);

  const pendingIds = pendingRows.map((report) => report.id).join(',');
  const toggleAll = useCallback(
    (checked: boolean) => {
      setSelectedIds(checked ? (pendingIds ? pendingIds.split(',') : []) : []);
    },
    [pendingIds],
  );

  const runBulkUpdate = async () => {
    if (!bulkAction) {
      return;
    }
    const targets = selectedPending.map((report) => report.id);
    setBulkPending(true);
    try {
      for (const reportId of targets) {
        await safetyApi.updateReportStatus(reportId, bulkAction);
      }
      toast.success(
        `${targets.length} ${targets.length === 1 ? 'report' : 'reports'} ${
          bulkAction === 'RESOLVED' ? 'resolved' : 'dismissed'
        }.`,
      );
      setSelectedIds([]);
      void queryClient.invalidateQueries({ queryKey: queryKeys.safety.all });
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setBulkPending(false);
      setBulkAction(null);
    }
  };

  const columns = useMemo<ColumnDef<UgcReportResponse>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <Checkbox
            aria-label="Select all pending reports on this page"
            checked={allPendingSelected}
            disabled={pendingRows.length === 0}
            onCheckedChange={(checked) => toggleAll(checked === true)}
          />
        ),
        cell: ({ row }) =>
          row.original.status === 'PENDING' ? (
            <div onClick={(event) => event.stopPropagation()}>
              <Checkbox
                aria-label="Select report"
                checked={selectedIds.includes(row.original.id)}
                onCheckedChange={(checked) => toggleRow(row.original.id, checked === true)}
              />
            </div>
          ) : null,
        enableSorting: false,
      },
      {
        accessorKey: 'reason',
        header: 'Reason',
        cell: ({ row }) => (
          <div className="max-w-xs space-y-1">
            <p className="font-medium">{row.original.reason}</p>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
              title="Copy reported content ID"
              onClick={(event) => {
                event.stopPropagation();
                void navigator.clipboard?.writeText(row.original.targetContentId);
                toast.success('Content ID copied.');
              }}
            >
              {CONTENT_TYPE_LABEL[row.original.targetContentType] ??
                row.original.targetContentType}{' '}
              · {row.original.targetContentId.slice(0, 8)}…
              <Copy className="size-3" />
            </button>
          </div>
        ),
      },
      {
        id: 'reporter',
        header: 'Reporter',
        meta: { className: 'hidden md:table-cell' },
        cell: ({ row }) => (
          <div>
            <p>{row.original.reporterDisplayName}</p>
            <p className="text-muted-foreground text-xs">{row.original.reporterEmail}</p>
          </div>
        ),
      },
      {
        id: 'target',
        header: 'Target',
        cell: ({ row }) => row.original.targetUserDisplayName,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant="secondary">{STATUS_LABEL[row.original.status] ?? row.original.status}</Badge>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Time',
        meta: { className: 'hidden md:table-cell' },
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        ...tableActionsColumn<UgcReportResponse>(),
        cell: ({ row }) =>
          row.original.status === 'PENDING' ? (
            <TableRowActionMenu
              primaryLabel="Resolve"
              onPrimary={() =>
                updateStatusMutation.mutate({
                  reportId: row.original.id,
                  status: 'RESOLVED',
                })
              }
              items={[
                {
                  label: 'Dismiss',
                  onClick: () =>
                    updateStatusMutation.mutate({
                      reportId: row.original.id,
                      status: 'DISMISSED',
                    }),
                },
              ]}
            />
          ) : null,
      },
    ],
    [updateStatusMutation, selectedIds, allPendingSelected, pendingRows, toggleAll, toggleRow],
  );

  return (
    <AdminPageShell
      variant="list"
      density="compact"
      title="Moderation"
      description="Review user reports and update resolution. Select a row to inspect."
      actions={
        <Button variant="outline" size="sm" onClick={() => void reportsQuery.refetch()}>
          <RefreshCw className="mr-2 size-4" />
          Refresh
        </Button>
      }
      toolbar={
        <AdminFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by reason or reporter"
          showClear={hasActiveFilters}
          clearLabel="Clear filters"
          onClear={() => {
            setSearch('');
            setStatusFilter('PENDING');
          }}
        >
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
        </AdminFilterBar>
      }
    >
      <>
        <AdminDockLayout dockOpen={Boolean(selectedLiveReport)}>
          <div className="space-y-3">
            {reportsQuery.isError ? (
              <AdminQueryError
                message={getApiErrorMessage(reportsQuery.error)}
                onRetry={() => void reportsQuery.refetch()}
              />
            ) : null}

            <AdminBulkBar count={selectedPending.length}>
              <Button
                variant="ghost"
                size="sm"
                disabled={bulkPending}
                onClick={() => setBulkAction('RESOLVED')}
              >
                Resolve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={bulkPending}
                onClick={() => setBulkAction('DISMISSED')}
              >
                Dismiss
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                Clear
              </Button>
            </AdminBulkBar>

            <DataTable
              columns={columns}
              data={rows}
              isLoading={reportsQuery.isLoading}
              emptyMessage="No reports found."
              showRowIndex
              pageOffset={page * ADMIN_LIST_PAGE_SIZE}
              showPagination={false}
              activeRowId={selectedLiveReport?.id ?? null}
              getRowId={(row) => row.id}
              onRowClick={setSelectedReport}
            />

            <ServerPagination
              page={page}
              totalPages={reportsQuery.data?.totalPages ?? 1}
              onPageChange={(nextPage) => {
                setPage(nextPage);
                clearSelectedReport();
              }}
            />
          </div>
        </AdminDockLayout>

        <AdminDockPanel
          open={Boolean(selectedLiveReport)}
          onClose={clearSelectedReport}
          title="Report detail"
          description={
            selectedLiveReport ? `Report ${selectedLiveReport.id.slice(0, 8)}…` : undefined
          }
          footer={
            selectedLiveReport?.status === 'PENDING' ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={updateStatusMutation.isPending}
                  onClick={() =>
                    updateStatusMutation.mutate({
                      reportId: selectedLiveReport.id,
                      status: 'DISMISSED',
                    })
                  }
                >
                  Dismiss
                </Button>
                <Button
                  size="sm"
                  disabled={updateStatusMutation.isPending}
                  onClick={() =>
                    updateStatusMutation.mutate({
                      reportId: selectedLiveReport.id,
                      status: 'RESOLVED',
                    })
                  }
                >
                  Resolve
                </Button>
              </>
            ) : null
          }
        >
          {selectedLiveReport ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <InspectorField label="Report ID" value={selectedLiveReport.id} mono className="col-span-2" />
              <InspectorField
                label="Status"
                value={
                  <Badge variant="secondary">
                    {STATUS_LABEL[selectedLiveReport.status] ?? selectedLiveReport.status}
                  </Badge>
                }
              />
              <InspectorField label="Reason" value={selectedLiveReport.reason} className="col-span-2" />
              <InspectorField
                label="Reporter"
                value={
                  <div>
                    <p>{selectedLiveReport.reporterDisplayName}</p>
                    <p className="text-muted-foreground text-xs">{selectedLiveReport.reporterEmail}</p>
                  </div>
                }
                className="col-span-2"
              />
              <InspectorField
                label="Reported user"
                value={selectedLiveReport.targetUserDisplayName}
                className="col-span-2"
              />
              <InspectorField
                label="Content type"
                value={
                  CONTENT_TYPE_LABEL[selectedLiveReport.targetContentType] ??
                  selectedLiveReport.targetContentType
                }
              />
              <InspectorField
                label="Content ID"
                value={
                  targetContentLink(selectedLiveReport) ? (
                    <Link
                      className="text-primary font-mono text-xs hover:underline"
                      to={targetContentLink(selectedLiveReport)!}
                    >
                      {selectedLiveReport.targetContentId}
                    </Link>
                  ) : (
                    selectedLiveReport.targetContentId
                  )
                }
                mono={!targetContentLink(selectedLiveReport)}
              />
              <InspectorField label="Reported at" value={formatDateTime(selectedLiveReport.createdAt)} />
              <InspectorField label="Updated at" value={formatDateTime(selectedLiveReport.updatedAt)} />
            </dl>
          ) : null}
        </AdminDockPanel>
      </>

      <AlertDialog
        open={bulkAction !== null}
        onOpenChange={(open) => {
          if (!open && !bulkPending) {
            setBulkAction(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === 'RESOLVED'
                ? 'Resolve selected reports?'
                : 'Dismiss selected reports?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will mark {selectedPending.length}{' '}
              {selectedPending.length === 1 ? 'report' : 'reports'} as{' '}
              {bulkAction === 'RESOLVED' ? 'resolved' : 'dismissed'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkPending}
              onClick={(event) => {
                event.preventDefault();
                void runBulkUpdate();
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
