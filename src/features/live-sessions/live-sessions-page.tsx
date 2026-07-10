import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { AdminBulkBar } from '@/components/admin/admin-bulk-bar';
import { AdminFilterBar } from '@/components/admin/admin-filter-bar';
import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { AdminQueryError } from '@/components/admin/admin-query-state';
import { ServerPagination } from '@/components/admin/server-pagination';
import { TableRowActionMenu } from '@/components/admin/table-row-actions';
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
        cell: ({ row }) => {
          const items = [
            row.original.status !== 'ENDED'
              ? {
                  label: 'End session',
                  onClick: () => endMutation.mutate(row.original.id),
                }
              : null,
            {
              label: 'Delete',
              icon: Trash2,
              destructive: true,
              onClick: () => deleteMutation.mutate(row.original.id),
            },
          ].filter(Boolean) as Array<{
            label: string;
            icon?: typeof Trash2;
            destructive?: boolean;
            onClick: () => void;
          }>;

          return (
            <TableRowActionMenu
              primaryLabel="Copy token"
              onPrimary={() => joinMutation.mutate(row.original.roomCode)}
              items={items}
            />
          );
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
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setPage(0);
              setStatusFilter(value);
            }}
          >
            <SelectTrigger className="w-36">
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
