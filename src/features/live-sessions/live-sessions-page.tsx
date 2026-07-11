import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Copy, RefreshCw, Trash2 } from 'lucide-react';

import { AdminBulkBar } from '@/components/admin/admin-bulk-bar';
import { AdminFilterBar } from '@/components/admin/admin-filter-bar';
import { ConfirmDialog, type PendingConfirm } from '@/components/admin/confirm-dialog';
import { FilterChipGroup } from '@/components/admin/filter-chip-group';
import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { AdminQueryError } from '@/components/admin/admin-query-state';
import { ServerPagination } from '@/components/admin/server-pagination';
import { TableRowActionMenu, tableActionsColumn } from '@/components/admin/table-row-actions';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { queryKeys } from '@/hooks/query-keys';
import { adminToast as toast } from '@/lib/admin-toast';
import { ADMIN_PAGE_META } from '@/lib/admin-page-meta';
import { formatDateTime } from '@/lib/format';
import { useAdminPageMeta } from '@/lib/page-meta';
import { liveSessionsApi } from '@/services/live-sessions/live-sessions-api';
import { meetingsApi } from '@/services/meetings/meetings-api';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import type { LiveSessionResponse } from '@/services/types/domain';

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Live',
  ENDED: 'Ended',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'ACTIVE', label: 'Live' },
  { value: 'ENDED', label: 'Ended' },
] as const;

export function LiveSessionsPage() {
  useAdminPageMeta(ADMIN_PAGE_META.liveSessions);

  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState(() => {
    const status = searchParams.get('status');
    if (status && STATUS_OPTIONS.some((option) => option.value === status)) {
      return status;
    }
    return 'all';
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'end' | 'delete' | null>(null);
  const [bulkPending, setBulkPending] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);

  const sessionsQuery = useQuery({
    queryKey: queryKeys.liveSessions.list(page, statusFilter),
    queryFn: () =>
      liveSessionsApi.list(
        page,
        PAGE_SIZE,
        statusFilter === 'all' ? undefined : statusFilter,
      ),
    refetchInterval: 15_000,
  });

  const endMutation = useMutation({
    mutationFn: (sessionId: string) => liveSessionsApi.end(sessionId),
    onSuccess: () => {
      toast.success('Live session ended.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.liveSessions.all });
    },
    onError: (error) => toast.error(error),
  });

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => liveSessionsApi.remove(sessionId),
    onSuccess: () => {
      toast.success('Live session deleted.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.liveSessions.all });
    },
    onError: (error) => toast.error(error),
  });

  const joinMutation = useMutation({
    mutationFn: (roomCode: string) => meetingsApi.getJoinToken(roomCode),
    onSuccess: async (data) => {
      await navigator.clipboard.writeText(data.token);
      toast.success('Join token copied to clipboard.');
    },
    onError: (error) => toast.error(error),
  });

  const rows = sessionsQuery.data?.data ?? [];
  const selectedRows = rows.filter((session) => selectedIds.includes(session.id));
  const selectedActiveRows = selectedRows.filter((session) => session.status !== 'ENDED');
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;

  const toggleRow = useCallback((sessionId: string, checked: boolean) => {
    setSelectedIds((current) =>
      checked ? [...new Set([...current, sessionId])] : current.filter((id) => id !== sessionId),
    );
  }, []);

  const sessionIds = rows.map((session) => session.id).join(',');
  const toggleAll = useCallback(
    (checked: boolean) => {
      setSelectedIds(checked ? (sessionIds ? sessionIds.split(',') : []) : []);
    },
    [sessionIds],
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

  const runBulkAction = async () => {
    if (!bulkAction) return;
    const targets = bulkAction === 'end' ? selectedActiveRows : selectedRows;
    const ids = targets.map((session) => session.id);
    setBulkPending(true);
    try {
      for (const sessionId of ids) {
        if (bulkAction === 'end') {
          await liveSessionsApi.end(sessionId);
        } else {
          await liveSessionsApi.remove(sessionId);
        }
      }
      toast.success(
        `${ids.length} ${ids.length === 1 ? 'session' : 'sessions'} ${
          bulkAction === 'end' ? 'ended' : 'deleted'
        }.`,
      );
      setSelectedIds([]);
      void queryClient.invalidateQueries({ queryKey: queryKeys.liveSessions.all });
    } catch (error) {
      toast.error(error);
    } finally {
      setBulkPending(false);
      setBulkAction(null);
    }
  };

  const columns = useMemo<ColumnDef<LiveSessionResponse>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <Checkbox
            aria-label="Select all sessions on this page"
            checked={allSelected}
            disabled={rows.length === 0}
            onCheckedChange={(checked) => toggleAll(checked === true)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label="Select session"
            checked={selectedIds.includes(row.original.id)}
            onCheckedChange={(checked) => toggleRow(row.original.id, checked === true)}
          />
        ),
        enableSorting: false,
      },
      {
        accessorKey: 'roomCode',
        header: 'Room',
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.roomCode}</span>,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge
            variant={row.original.status === 'ACTIVE' ? 'default' : 'secondary'}
            className={cn(
              row.original.status === 'ACTIVE' &&
                'bg-emerald-600 text-white hover:bg-emerald-600',
            )}
          >
            {row.original.status === 'ACTIVE' ? (
              <span className="mr-1 inline-block size-1.5 animate-pulse rounded-full bg-white" />
            ) : null}
            {STATUS_LABEL[row.original.status] ?? row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: 'eventId',
        header: 'Event',
        meta: { className: 'hidden md:table-cell' },
        cell: ({ row }) => row.original.eventId ?? '—',
      },
      {
        accessorKey: 'createdAt',
        header: 'Created',
        meta: { className: 'hidden md:table-cell' },
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        ...tableActionsColumn<LiveSessionResponse>(),
        cell: ({ row }) => {
          const session = row.original;
          const items = [
            {
              label: 'Copy join token',
              icon: Copy,
              onClick: () => joinMutation.mutate(session.roomCode),
            },
            ...(session.status !== 'ENDED'
              ? [
                  {
                    label: 'End session',
                    onClick: () =>
                      setPendingConfirm({
                        title: 'End this live session?',
                        description: `Room ${session.roomCode} will be marked as ended.`,
                        confirmLabel: 'End session',
                        variant: 'default' as const,
                        action: async () => {
                          await endMutation.mutateAsync(session.id);
                        },
                      }),
                  },
                ]
              : []),
            {
              label: 'Delete',
              icon: Trash2,
              destructive: true,
              onClick: () =>
                setPendingConfirm({
                  title: 'Delete this session?',
                  description: `Room ${session.roomCode} will be permanently removed.`,
                  confirmLabel: 'Delete',
                  action: async () => {
                    await deleteMutation.mutateAsync(session.id);
                  },
                }),
            },
          ];

          return <TableRowActionMenu items={items} menuLabel={`Actions for ${session.roomCode}`} />;
        },
      },
    ],
    [
      deleteMutation,
      endMutation,
      joinMutation,
      selectedIds,
      allSelected,
      rows.length,
      toggleAll,
      toggleRow,
    ],
  );

  return (
    <AdminPageShell
      variant="list"
      density="compact"
      title="Live sessions"
      description="Monitor meeting rooms and session status. Auto-refreshes every 15 seconds."
      actions={
        <Button variant="outline" size="sm" onClick={() => void sessionsQuery.refetch()}>
          <RefreshCw className="mr-2 size-4" />
          Refresh
        </Button>
      }
      toolbar={
        <AdminFilterBar>
          <FilterChipGroup
            ariaLabel="Session status"
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
      <div className="flex flex-col gap-4">
        {sessionsQuery.isError ? (
          <AdminQueryError
            message={getApiErrorMessage(sessionsQuery.error)}
            onRetry={() => void sessionsQuery.refetch()}
          />
        ) : null}

        {selectedRows.length > 0 ? (
          <AdminBulkBar count={selectedRows.length}>
            <Button
              variant="ghost"
              size="sm"
              disabled={bulkPending || selectedActiveRows.length === 0}
              onClick={() => setBulkAction('end')}
            >
              End
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={bulkPending}
              onClick={() => setBulkAction('delete')}
            >
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
              Clear
            </Button>
          </AdminBulkBar>
        ) : null}

        <DataTable
          columns={columns}
          data={rows}
          isLoading={sessionsQuery.isLoading}
          emptyMessage="No live sessions yet."
          density="compact"
          pageOffset={page * PAGE_SIZE}
          showPagination={false}
        />

        <ServerPagination
          page={page}
          totalPages={sessionsQuery.data?.totalPages ?? 1}
          onPageChange={setPage}
        />
      </div>

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

      <ConfirmDialog
        open={bulkAction !== null}
        onOpenChange={(open) => {
          if (!open && !bulkPending) setBulkAction(null);
        }}
        title={
          bulkAction === 'delete' ? 'Delete selected sessions?' : 'End selected sessions?'
        }
        description={
          bulkAction === 'delete'
            ? `This will permanently delete ${selectedRows.length} ${
                selectedRows.length === 1 ? 'session' : 'sessions'
              }.`
            : `This will end ${selectedActiveRows.length} live ${
                selectedActiveRows.length === 1 ? 'session' : 'sessions'
              }.`
        }
        confirmLabel={bulkAction === 'delete' ? 'Delete' : 'End sessions'}
        variant={bulkAction === 'delete' ? 'destructive' : 'default'}
        pending={bulkPending}
        onConfirm={() => void runBulkAction()}
      />
    </AdminPageShell>
  );
}
