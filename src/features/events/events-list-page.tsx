import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Link } from 'react-router-dom';
import { MoreHorizontal, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { DateTimePicker } from '@/components/admin/datetime-picker';
import { ImageFilePicker } from '@/components/admin/image-file-picker';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ADMIN_LIST_PAGE_SIZE } from '@/lib/admin-pagination';
import { ADMIN_PAGE_META } from '@/lib/admin-page-meta';
import { queryKeys } from '@/hooks/query-keys';
import { formatDateTime } from '@/lib/format';
import { eventStatusLabel, eventTypeLabel, normalizeEventStatus } from '@/lib/event-labels';
import { useAdminPageMeta } from '@/lib/page-meta';
import { ROUTES } from '@/routes/paths';
import { assetsApi } from '@/services/assets/assets-api';
import { eventsApi } from '@/services/events/events-api';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import type { EventAdminFeedParams, EventResponse } from '@/services/types/domain';

type EventForm = {
  title: string;
  description: string;
  content: string;
  startTime: string;
  endTime: string;
  publishImmediately: boolean;
  isOfficial: boolean;
  thumbnailFile: File | null;
};

type EventTypeFilter = 'all' | 'official' | 'community';
type EventActionKind = 'publish' | 'unpublish' | 'delete';

type PendingEventAction = {
  eventId: string;
  eventTitle: string;
  action: EventActionKind;
};

const emptyForm: EventForm = {
  title: '',
  description: '',
  content: '',
  startTime: '',
  endTime: '',
  publishImmediately: true,
  isOfficial: false,
  thumbnailFile: null,
};

export function EventsListPage() {
  useAdminPageMeta(ADMIN_PAGE_META.events);

  const queryClient = useQueryClient();
  const [page, setPage] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [keyword, setKeyword] = useState('');
  const [authorKeyword, setAuthorKeyword] = useState('');
  const [status, setStatus] = useState('all');
  const [typeFilter, setTypeFilter] = useState<EventTypeFilter>('all');
  const [pendingAction, setPendingAction] = useState<PendingEventAction | null>(null);

  const listParams = useMemo<EventAdminFeedParams>(
    () => ({
      page,
      pageSize: ADMIN_LIST_PAGE_SIZE,
      keyword: keyword.trim() || undefined,
      status: status === 'all' ? undefined : status,
      isOfficial:
        typeFilter === 'all' ? undefined : typeFilter === 'official',
      authorKeyword: authorKeyword.trim() || undefined,
    }),
    [authorKeyword, keyword, page, status, typeFilter],
  );

  const eventsQuery = useQuery({
    queryKey: queryKeys.events.list(listParams),
    queryFn: () => eventsApi.getAdminFeed(listParams),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      let thumbnailUrl: string | undefined;
      if (form.thumbnailFile) {
        thumbnailUrl = (await assetsApi.uploadViaPresigned(form.thumbnailFile)).downloadUrl;
      }

      return eventsApi.create({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        content: form.content.trim() || undefined,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        publishImmediately: form.publishImmediately,
        isOfficial: form.isOfficial,
        thumbnailUrl,
      });
    },
    onSuccess: () => {
      toast.success('Event created.');
      setSheetOpen(false);
      setForm(emptyForm);
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => eventsApi.publish(id),
    onSuccess: () => {
      toast.success('Event published.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: string) => eventsApi.unpublish(id),
    onSuccess: () => {
      toast.success('Event moved to draft.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventsApi.remove(id),
    onSuccess: () => {
      toast.success('Event deleted.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const isConfirmingAction =
    publishMutation.isPending || unpublishMutation.isPending || deleteMutation.isPending;

  const openActionDialog = (
    eventId: string,
    eventTitle: string,
    action: EventActionKind,
  ) => {
    setPendingAction({ eventId, eventTitle, action });
  };

  const confirmPendingAction = () => {
    if (!pendingAction) {
      return;
    }

    if (pendingAction.action === 'publish') {
      publishMutation.mutate(pendingAction.eventId, {
        onSuccess: () => setPendingAction(null),
      });
      return;
    }

    if (pendingAction.action === 'unpublish') {
      unpublishMutation.mutate(pendingAction.eventId, {
        onSuccess: () => setPendingAction(null),
      });
      return;
    }

    deleteMutation.mutate(pendingAction.eventId, {
      onSuccess: () => setPendingAction(null),
    });
  };

  const columns = useMemo<ColumnDef<EventResponse>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Event',
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-medium">{row.original.title}</p>
            <p className="text-muted-foreground line-clamp-2 text-xs">
              {row.original.description || 'No summary provided'}
            </p>
          </div>
        ),
      },
      {
        id: 'type',
        header: 'Type',
        cell: ({ row }) => (
          <Badge variant={row.original.isOfficial ? 'default' : 'secondary'}>
            {eventTypeLabel(row.original.isOfficial)}
          </Badge>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant="secondary">{eventStatusLabel(row.original.status)}</Badge>
        ),
      },
      {
        id: 'author',
        header: 'Creator',
        cell: ({ row }) =>
          row.original.isOfficial ? 'Zen Leader System' : row.original.author.name,
      },
      {
        accessorKey: 'startTime',
        header: 'Start',
        cell: ({ row }) => formatDateTime(row.original.startTime),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to={ROUTES.eventDetail(row.original.id)}>Details</Link>
              </DropdownMenuItem>
              {normalizeEventStatus(row.original.status) !== 'PUBLISHED' ? (
                <DropdownMenuItem
                  onClick={() =>
                    openActionDialog(row.original.id, row.original.title, 'publish')
                  }
                >
                  Publish
                </DropdownMenuItem>
              ) : null}
              {normalizeEventStatus(row.original.status) !== 'DRAFT' ? (
                <DropdownMenuItem
                  onClick={() =>
                    openActionDialog(row.original.id, row.original.title, 'unpublish')
                  }
                >
                  Move to draft
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => openActionDialog(row.original.id, row.original.title, 'delete')}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [deleteMutation, publishMutation, unpublishMutation],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Events"
        description="Manage public events, schedules, and publishing status."
        actions={
          <Button
            onClick={() => {
              setForm(emptyForm);
              setSheetOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            Add event
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Search by title or description"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              setPage(0);
            }}
          />
        </div>
        <Input
          placeholder="Filter by creator name or email"
          value={authorKeyword}
          onChange={(event) => {
            setAuthorKeyword(event.target.value);
            setPage(0);
          }}
        />
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value);
            setPage(0);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={typeFilter}
          onValueChange={(value: EventTypeFilter) => {
            setTypeFilter(value);
            setPage(0);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="official">System event</SelectItem>
            <SelectItem value="community">User event</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm">Events on page</p>
            <p className="mt-2 text-2xl font-semibold">{eventsQuery.data?.data?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm">Published</p>
            <p className="mt-2 text-2xl font-semibold">
              {eventsQuery.data?.data?.filter(
                (event) => normalizeEventStatus(event.status) === 'PUBLISHED',
              ).length ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-sm">System events</p>
            <p className="mt-2 text-2xl font-semibold">
              {eventsQuery.data?.data?.filter((event) => event.isOfficial).length ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={eventsQuery.data?.data ?? []}
        isLoading={eventsQuery.isLoading}
        showRowIndex
        pageOffset={(eventsQuery.data?.currentPage ?? page) * ADMIN_LIST_PAGE_SIZE}
        showPagination={false}
        emptyMessage="No events yet."
      />

      <ServerPagination
        page={eventsQuery.data?.currentPage ?? page}
        totalPages={eventsQuery.data?.totalPages ?? 1}
        onPageChange={setPage}
      />

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[800px] sm:max-w-[800px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Add event</SheetTitle>
            <SheetDescription>
              Create the event details, schedule, and thumbnail before publishing.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="event-title">Title</Label>
              <Input
                id="event-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-content">Content</Label>
              <Textarea
                id="event-content"
                rows={6}
                value={form.content}
                onChange={(event) =>
                  setForm((current) => ({ ...current, content: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Start time</Label>
                <DateTimePicker
                  value={form.startTime}
                  onChange={(startTime) => setForm((current) => ({ ...current, startTime }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End time</Label>
                <DateTimePicker
                  value={form.endTime}
                  onChange={(endTime) => setForm((current) => ({ ...current, endTime }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-thumbnail">Thumbnail image</Label>
              <ImageFilePicker
                id="event-thumbnail"
                file={form.thumbnailFile}
                previewAlt={form.title || 'Event thumbnail'}
                onFileChange={(thumbnailFile) =>
                  setForm((current) => ({ ...current, thumbnailFile }))
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.publishImmediately}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, publishImmediately: checked }))
                }
              />
              <Label>Publish immediately</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isOfficial}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, isOfficial: checked }))
                }
              />
              <Label>System event</Label>
            </div>
          </div>
          <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={
                createMutation.isPending ||
                !form.title.trim() ||
                !form.startTime ||
                !form.endTime
              }
            >
              Create event
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open && !isConfirmingAction) {
            setPendingAction(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.action === 'publish'
                ? 'Publish this event?'
                : pendingAction?.action === 'unpublish'
                  ? 'Move event to draft?'
                  : 'Delete this event?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.action === 'publish'
                ? `"${pendingAction.eventTitle}" will appear on the public events feed.`
                : pendingAction?.action === 'unpublish'
                  ? `"${pendingAction.eventTitle}" will be hidden from the public feed until republished.`
                  : `"${pendingAction?.eventTitle}" will be deleted from admin and the public feed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isConfirmingAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={
                pendingAction?.action === 'delete'
                  ? 'bg-destructive text-white hover:bg-destructive/90'
                  : undefined
              }
              disabled={isConfirmingAction}
              onClick={confirmPendingAction}
            >
              {pendingAction?.action === 'publish'
                ? 'Publish'
                : pendingAction?.action === 'unpublish'
                  ? 'Move to draft'
                  : 'Delete event'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
