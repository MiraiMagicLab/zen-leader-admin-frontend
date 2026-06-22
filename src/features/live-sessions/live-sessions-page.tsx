import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { RefreshCw, Video } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/admin/page-header';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { queryKeys } from '@/hooks/query-keys';
import { formatDateTime } from '@/lib/format';
import { liveSessionsApi } from '@/services/live-sessions/live-sessions-api';
import { meetingsApi } from '@/services/meetings/meetings-api';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import type { LiveSessionResponse } from '@/services/types/domain';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'ENDED', label: 'ENDED' },
];

export function LiveSessionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');

  const sessionsQuery = useQuery({
    queryKey: queryKeys.liveSessions.list(page, statusFilter),
    queryFn: () =>
      liveSessionsApi.list(
        page,
        20,
        statusFilter === 'all' ? undefined : statusFilter,
      ),
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
    onSuccess: (data) => {
      toast.success(`Token: ${data.token.slice(0, 24)}…`);
      void navigator.clipboard.writeText(data.token);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const columns = useMemo<ColumnDef<LiveSessionResponse>[]>(
    () => [
      { accessorKey: 'roomCode', header: 'Room' },
      { accessorKey: 'type', header: 'Type' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <Badge variant="secondary">{row.original.status}</Badge>,
      },
      {
        accessorKey: 'ownerId',
        header: 'Owner',
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.ownerId.slice(0, 8)}…</span>
        ),
      },
      {
        accessorKey: 'eventId',
        header: 'Event',
        cell: ({ row }) => row.original.eventId ?? '—',
      },
      {
        accessorKey: 'createdAt',
        header: 'Created at',
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
              onClick={() => joinMutation.mutate(row.original.roomCode)}
            >
              <Video className="mr-1 size-4" />
              Token
            </Button>
            {row.original.status !== 'ENDED' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => endMutation.mutate(row.original.id)}
              >
                End
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => deleteMutation.mutate(row.original.id)}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [deleteMutation, endMutation, joinMutation],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Live sessions"
        description="Manage meeting rooms and live sessions on the system."
        actions={
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
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
            <Button variant="outline" size="sm" onClick={() => void sessionsQuery.refetch()}>
              <RefreshCw className="mr-2 size-4" />
               Refresh
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm">Sessions on page</p>
            <p className="mt-2 text-2xl font-semibold">{sessionsQuery.data?.data?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm">Active</p>
            <p className="mt-2 text-2xl font-semibold">
              {sessionsQuery.data?.data?.filter((session) => session.status === 'ACTIVE').length ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm">Linked to events</p>
            <p className="mt-2 text-2xl font-semibold">
              {sessionsQuery.data?.data?.filter((session) => Boolean(session.eventId)).length ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm">Admin note</p>
            <p className="mt-2 text-sm">
              Use token copy only for operator support. Live teaching for LMS should still be managed from each course run and its sessions.
            </p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={sessionsQuery.data?.data ?? []}
        isLoading={sessionsQuery.isLoading}
        emptyMessage="No live sessions yet."
        showPagination={false}
      />

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" disabled={page <= 0} onClick={() => setPage((p) => p - 1)}>
          Previous page
        </Button>
        <span className="text-muted-foreground text-sm">
          Page {page + 1} / {sessionsQuery.data?.totalPages ?? 1}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page + 1 >= (sessionsQuery.data?.totalPages ?? 1)}
          onClick={() => setPage((p) => p + 1)}
        >
          Next page
        </Button>
      </div>
    </div>
  );
}
