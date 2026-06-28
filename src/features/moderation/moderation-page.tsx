import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
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
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import { safetyApi } from '@/services/safety/safety-api';
import type { UgcReportResponse } from '@/services/types/domain';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
};

const CONTENT_TYPE_LABEL: Record<string, string> = {
  comment: 'Comment',
  post: 'Post',
  event: 'Event',
  user: 'User',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'DISMISSED', label: 'Dismissed' },
] as const;

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
            <Checkbox
              aria-label="Select report"
              checked={selectedIds.includes(row.original.id)}
              onCheckedChange={(checked) => toggleRow(row.original.id, checked === true)}
            />
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
              onClick={() => {
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
        id: 'actions',
        header: '',
        cell: ({ row }) =>
          row.original.status === 'PENDING' ? (
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  updateStatusMutation.mutate({
                    reportId: row.original.id,
                    status: 'RESOLVED',
                  })
                }
              >
                Resolve
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateStatusMutation.mutate({
                    reportId: row.original.id,
                    status: 'DISMISSED',
                  })
                }
              >
                Dismiss
              </Button>
            </div>
          ) : null,
      },
    ],
    [updateStatusMutation, selectedIds, allPendingSelected, pendingRows, toggleAll, toggleRow],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Moderation"
        description="Review user reports and update their resolution."
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
              onClick={() => void reportsQuery.refetch()}
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
            placeholder="Search by reason or reporter"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {selectedPending.length > 0 ? (
        <div className="bg-muted/40 flex flex-wrap items-center gap-2 rounded-lg border p-3">
          <span className="text-sm font-medium">{selectedPending.length} selected</span>
          <div className="flex flex-1 flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={bulkPending}
              onClick={() => setBulkAction('RESOLVED')}
            >
              Resolve selected ({selectedPending.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={bulkPending}
              onClick={() => setBulkAction('DISMISSED')}
            >
              Dismiss selected ({selectedPending.length})
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
        isLoading={reportsQuery.isLoading}
        emptyMessage="No reports found."
        showRowIndex
        pageOffset={page * ADMIN_LIST_PAGE_SIZE}
        showPagination={false}
      />

      <ServerPagination
        page={page}
        totalPages={reportsQuery.data?.totalPages ?? 1}
        onPageChange={setPage}
      />

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
    </div>
  );
}
