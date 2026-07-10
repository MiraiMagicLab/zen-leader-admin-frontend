import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { KeyRound, RefreshCw, Video } from 'lucide-react';
import { toast } from 'sonner';

import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { AdminQueryError } from '@/components/admin/admin-query-state';
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
import { cn } from '@/lib/utils';
import { queryKeys } from '@/hooks/query-keys';
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
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'end' | 'delete' | null>(null);
  const [bulkPending, setBulkPending] = useState(false);

  const sessionsQuery = useQuery({
    queryKey: queryKeys.liveSessions.list(page, statusFilter),
    queryFn: () =>
      liveSessionsApi.list(
        page,
        PAGE_SIZE,
        statusFilter === 'all' ? undefined : statusFilter,
      ),
    // Monitoring view: keep session status fresh without a manual refresh.
    refetchInterval: 15_000,
  });

  const endMutation = useMutation({
    mutationFn: (sessionId: string) => liveSessionsApi.end(sessionId),
    onSuccess: () => {
      toast.success('Live session ended.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.liveSessions.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => liveSessionsApi.remove(sessionId),
    onSuccess: () => {
      toast.success('Live session deleted.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.liveSessions.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const joinMutation = useMutation({
    mutationFn: (roomCode: string) => meetingsApi.getJoinToken(roomCode),
    onSuccess: async (data) => {
      await navigator.clipboard.writeText(data.token);
      toast.success('Join token copied.');
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const rows = sessionsQuery.data?.data ?? [];
  const selectedRows = rows.filter((session) => selectedIds.includes(session.id));
  // Only active sessions can be ended.
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

  const runBulkAction = async () => {
    if (!bulkAction) {
      return;
    }
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
      toast.error(getApiErrorMessage(error));
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
        accessorKey: 'type',
        header: 'Type',
        meta: { className: 'hidden md:table-cell' },
        cell: ({ row }) => row.original.type,
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
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={joinMutation.isPending}
              onClick={() => joinMutation.mutate(row.original.roomCode)}
            >
              <KeyRound className="mr-1 size-4" />
              Copy join token
            </Button>
            {row.original.status !== 'ENDED' ? (
              <Button
                variant="outline"
                size="sm"
                disabled={endMutation.isPending}
                onClick={() => endMutation.mutate(row.original.id)}
              >
                End
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(row.original.id)}
            >
              Delete
            </Button>
          </div>
        ),
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
      title="Live sessions"
      description="Monitor meeting rooms and live session status in real time."
      density="compact"
      actions={
        <Button variant="outline" size="sm" onClick={() => void sessionsQuery.refetch()}>
          <RefreshCw className="mr-2 size-4" />
          Refresh
        </Button>
      }
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={statusFilter === option.value ? 'default' : 'outline'}
              onClick={() => {
                setPage(0);
                setStatusFilter(option.value);
              }}
              className={cn(
                option.value === 'ACTIVE' &&
                  statusFilter === option.value &&
                  'bg-emerald-600 hover:bg-emerald-600/90',
              )}
            >
              {option.value === 'ACTIVE' ? (
                <Video className="mr-1.5 size-3.5" />
              ) : null}
              {option.label}
            </Button>
          ))}
        </div>
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
          <div className="bg-muted/40 flex flex-wrap items-center gap-2 rounded-lg border p-3">
            <span className="text-sm font-medium">{selectedRows.length} selected</span>
            <div className="flex flex-1 flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={bulkPending || selectedActiveRows.length === 0}
                onClick={() => setBulkAction('end')}
              >
                End selected ({selectedActiveRows.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive"
                disabled={bulkPending}
                onClick={() => setBulkAction('delete')}
              >
                Delete selected ({selectedRows.length})
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
          isLoading={sessionsQuery.isLoading}
          emptyMessage="No live sessions yet."
          density="compact"
          showPagination={false}
        />

        <ServerPagination
          page={page}
          totalPages={sessionsQuery.data?.totalPages ?? 1}
          onPageChange={setPage}
        />
      </div>

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
              {bulkAction === 'delete'
                ? 'Delete selected sessions?'
                : 'End selected sessions?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === 'delete'
                ? `This will permanently delete ${selectedRows.length} ${
                    selectedRows.length === 1 ? 'session' : 'sessions'
                  }. This action cannot be undone.`
                : `This will end ${selectedActiveRows.length} live ${
                    selectedActiveRows.length === 1 ? 'session' : 'sessions'
                  }.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkPending}
              onClick={(event) => {
                event.preventDefault();
                void runBulkAction();
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
