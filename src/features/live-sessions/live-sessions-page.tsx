import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { RefreshCw, Video } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/admin/page-header';
import { ServerPagination } from '@/components/admin/server-pagination';
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
import { ADMIN_PAGE_META } from '@/lib/admin-page-meta';
import { formatDateTime } from '@/lib/format';
import { useAdminPageMeta } from '@/lib/page-meta';
import { liveSessionsApi } from '@/services/live-sessions/live-sessions-api';
import { meetingsApi } from '@/services/meetings/meetings-api';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import type { LiveSessionResponse } from '@/services/types/domain';

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
    onSuccess: async (data) => {
      await navigator.clipboard.writeText(data.token);
      toast.success('Join link copied.');
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
        cell: ({ row }) => (
          <Badge variant="secondary">
            {STATUS_LABEL[row.original.status] ?? row.original.status}
          </Badge>
        ),
      },
      {
        accessorKey: 'eventId',
        header: 'Event',
        cell: ({ row }) => row.original.eventId ?? '—',
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
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => joinMutation.mutate(row.original.roomCode)}
            >
              <Video className="mr-1 size-4" />
              Copy link
            </Button>
            {row.original.status !== 'ENDED' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => endMutation.mutate(row.original.id)}
              >
                End
              </Button>
            ) : null}
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
        description="View meeting rooms and live session status."
        actions={
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
            <Button variant="outline" size="sm" onClick={() => void sessionsQuery.refetch()}>
              <RefreshCw className="mr-2 size-4" />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm">Sessions on page</p>
            <p className="mt-2 text-2xl font-semibold">{sessionsQuery.data?.data?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm">Live now</p>
            <p className="mt-2 text-2xl font-semibold">
              {sessionsQuery.data?.data?.filter((session) => session.status === 'ACTIVE').length ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm">Linked to event</p>
            <p className="mt-2 text-2xl font-semibold">
              {sessionsQuery.data?.data?.filter((session) => Boolean(session.eventId)).length ?? 0}
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

      <ServerPagination
        page={page}
        totalPages={sessionsQuery.data?.totalPages ?? 1}
        onPageChange={setPage}
      />
    </div>
  );
}
