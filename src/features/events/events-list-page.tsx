import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { adminToast as toast } from '@/lib/admin-toast';

import { confirmDiscard } from '@/lib/confirm-discard';
import { useBeforeUnload } from '@/hooks/use-beforeunload';
import { AdminFilterBar } from '@/components/admin/admin-filter-bar';
import { FilterSelect } from '@/components/admin/filter-select';
import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { AdminQueryError } from '@/components/admin/admin-query-state';
import { DateTimePicker } from '@/components/admin/datetime-picker';
import { ImageFilePicker } from '@/components/admin/image-file-picker';
import { ServerPagination } from '@/components/admin/server-pagination';
import { DataTable } from '@/components/data-table/data-table';
import { AdminDockLayout, AdminDockPanel } from '@/components/admin/admin-dock-panel';
import { InspectorField } from '@/components/admin/admin-inspector';
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
import { AdminFormDialogFooter } from '@/components/admin/admin-action-bar';
import { AdminEditorDialog } from '@/components/admin/admin-editor-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const EVENT_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'COMPLETED', label: 'Completed' },
] as const;

const EVENT_TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'official', label: 'System' },
  { value: 'community', label: 'User' },
] as const;

export function EventsListPage() {
  useAdminPageMeta(ADMIN_PAGE_META.events);

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [keyword, setKeyword] = useState('');
  const [authorKeyword, setAuthorKeyword] = useState('');
  const [status, setStatus] = useState('all');
  const [typeFilter, setTypeFilter] = useState<EventTypeFilter>('all');
  const [pendingAction, setPendingAction] = useState<PendingEventAction | null>(null);
  const [touched, setTouched] = useState<{
    title: boolean;
    startTime: boolean;
    endTime: boolean;
  }>({ title: false, startTime: false, endTime: false });
  const [selectedEvent, setSelectedEvent] = useState<EventResponse | null>(null);

  const dockOpen = Boolean(selectedEvent) && !sheetOpen && !Boolean(pendingAction);

  const isDirty =
    form.title !== emptyForm.title ||
    form.description !== emptyForm.description ||
    form.content !== emptyForm.content ||
    form.startTime !== emptyForm.startTime ||
    form.endTime !== emptyForm.endTime ||
    form.publishImmediately !== emptyForm.publishImmediately ||
    form.isOfficial !== emptyForm.isOfficial ||
    form.thumbnailFile !== emptyForm.thumbnailFile;

  const requiredMissing = !form.title.trim() || !form.startTime || !form.endTime;

  useBeforeUnload(sheetOpen && isDirty);

  const closeSheet = (open: boolean) => {
    if (!open && !confirmDiscard(isDirty)) {
      return;
    }
    setSheetOpen(open);
  };

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
    onError: (error) => toast.error(error),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => eventsApi.publish(id),
    onSuccess: () => {
      toast.success('Event published.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
    onError: (error) => toast.error(error),
  });

  const unpublishMutation = useMutation({
    mutationFn: (id: string) => eventsApi.unpublish(id),
    onSuccess: () => {
      toast.success('Event moved to draft.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
    onError: (error) => toast.error(error),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventsApi.remove(id),
    onSuccess: () => {
      toast.success('Event deleted.');
      setSelectedEvent(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
    onError: (error) => toast.error(error),
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
    ],
    [],
  );

  const hasActiveFilters =
    Boolean(keyword) || Boolean(authorKeyword) || status !== 'all' || typeFilter !== 'all';

  const clearFilters = () => {
    setKeyword('');
    setAuthorKeyword('');
    setStatus('all');
    setTypeFilter('all');
    setPage(0);
  };

  return (
    <AdminPageShell
      variant="list"
      density="compact"
      title="Events"
      description="Manage public events, schedule, and publishing status."
      actions={
        <Button
          size="sm"
          onClick={() => {
            setForm(emptyForm);
            setTouched({ title: false, startTime: false, endTime: false });
            setSheetOpen(true);
          }}
        >
          <Plus className="mr-2 size-4" />
          Add event
        </Button>
      }
      toolbar={
        <AdminFilterBar
          searchValue={keyword}
          onSearchChange={(value) => {
            setKeyword(value);
            setPage(0);
          }}
          searchPlaceholder="Search by title or description"
          showClear={hasActiveFilters}
          onClear={clearFilters}
          clearLabel="Clear filters"
        >
          <Input
            className="w-56"
            placeholder="Filter by creator name or email"
            value={authorKeyword}
            onChange={(event) => {
              setAuthorKeyword(event.target.value);
              setPage(0);
            }}
          />
          <FilterSelect
            label="Status"
            placeholder="All statuses"
            value={status}
            options={EVENT_STATUS_OPTIONS}
            onChange={(value) => {
              setStatus(value);
              setPage(0);
            }}
          />
          <FilterSelect
            label="Type"
            placeholder="All types"
            value={typeFilter}
            options={EVENT_TYPE_OPTIONS}
            onChange={(value) => {
              setTypeFilter(value as EventTypeFilter);
              setPage(0);
            }}
          />
        </AdminFilterBar>
      }
    >
      {eventsQuery.isError ? (
        <AdminQueryError
          message={getApiErrorMessage(eventsQuery.error)}
          onRetry={() => void eventsQuery.refetch()}
        />
      ) : (
        <AdminDockLayout dockOpen={dockOpen}>
          <div className="space-y-4">
            <DataTable
              columns={columns}
              data={eventsQuery.data?.data ?? []}
              isLoading={eventsQuery.isLoading}
              showRowIndex
              pageOffset={(eventsQuery.data?.currentPage ?? page) * ADMIN_LIST_PAGE_SIZE}
              showPagination={false}
              emptyMessage="No events yet."
              onRowClick={(event) => setSelectedEvent(event)}
              activeRowId={selectedEvent?.id ?? null}
              getRowId={(row) => row.id}
            />

            <ServerPagination
              page={eventsQuery.data?.currentPage ?? page}
              totalPages={eventsQuery.data?.totalPages ?? 1}
              onPageChange={setPage}
            />
          </div>
        </AdminDockLayout>
      )}

      <AdminDockPanel
        open={dockOpen}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent?.title ?? ''}
        description={
          selectedEvent
            ? eventTypeLabel(selectedEvent.isOfficial) + ' · ' + eventStatusLabel(selectedEvent.status)
            : undefined
        }
        footer={
          selectedEvent && (
            <>
              {normalizeEventStatus(selectedEvent.status) !== 'PUBLISHED' ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    openActionDialog(selectedEvent.id, selectedEvent.title, 'publish')
                  }
                >
                  Publish
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    openActionDialog(selectedEvent.id, selectedEvent.title, 'unpublish')
                  }
                >
                  Unpublish
                </Button>
              )}
              <Button
                size="sm"
                variant="destructiveOutline"
                onClick={() =>
                  openActionDialog(selectedEvent.id, selectedEvent.title, 'delete')
                }
              >
                <Trash2 className="mr-1.5 size-3.5" />
                Delete
              </Button>
              <Button
                size="sm"
                onClick={() => navigate(ROUTES.eventDetail(selectedEvent.id))}
              >
                <ExternalLink className="mr-1.5 size-3.5" />
                Manage
              </Button>
            </>
          )
        }
      >
        {selectedEvent && (
          <dl className="space-y-4">
            <InspectorField label="Title" value={selectedEvent.title} />
            <InspectorField
              label="Status"
              value={
                <Badge variant="secondary">{eventStatusLabel(selectedEvent.status)}</Badge>
              }
            />
            <InspectorField
              label="Type"
              value={
                <Badge variant={selectedEvent.isOfficial ? 'default' : 'secondary'}>
                  {eventTypeLabel(selectedEvent.isOfficial)}
                </Badge>
              }
            />
            <InspectorField
              label="Creator"
              value={
                selectedEvent.isOfficial ? 'Zen Leader System' : selectedEvent.author.name
              }
            />
            <InspectorField label="Start" value={formatDateTime(selectedEvent.startTime)} />
            <InspectorField label="End" value={formatDateTime(selectedEvent.endTime)} />
            <InspectorField label="Summary" value={selectedEvent.description ?? undefined} />
          </dl>
        )}
      </AdminDockPanel>

      <AdminEditorDialog
        open={sheetOpen}
        onOpenChange={closeSheet}
        title="Add event"
        description="Create the event details, schedule, and thumbnail before publishing."
        size="lg"
        footer={
          <AdminFormDialogFooter
            onCancel={() => closeSheet(false)}
            submitLabel="Create event"
            onSubmit={() => createMutation.mutate()}
            pending={createMutation.isPending}
            disabled={requiredMissing}
          />
        }
      >
        <div>
            <div className="space-y-4">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Basic info
              </p>
              <div className="space-y-2">
                <Label htmlFor="event-title">
                  Event title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="event-title"
                  value={form.title}
                  aria-invalid={touched.title && !form.title.trim()}
                  onBlur={() => setTouched((t) => ({ ...t, title: true }))}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                />
                {touched.title && !form.title.trim() ? (
                  <p className="text-destructive text-sm">Event title is required.</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-description">Short summary</Label>
                <Textarea
                  id="event-description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-content">Full details</Label>
                <Textarea
                  id="event-content"
                  rows={6}
                  value={form.content}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, content: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="mt-6 space-y-4 border-t pt-6">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Schedule
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    Start time <span className="text-destructive">*</span>
                  </Label>
                  <DateTimePicker
                    value={form.startTime}
                    onChange={(startTime) => {
                      setForm((current) => ({ ...current, startTime }));
                      setTouched((t) => ({ ...t, startTime: true }));
                    }}
                  />
                  {touched.startTime && !form.startTime ? (
                    <p className="text-destructive text-sm">Start time is required.</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>
                    End time <span className="text-destructive">*</span>
                  </Label>
                  <DateTimePicker
                    value={form.endTime}
                    onChange={(endTime) => {
                      setForm((current) => ({ ...current, endTime }));
                      setTouched((t) => ({ ...t, endTime: true }));
                    }}
                  />
                  {touched.endTime && !form.endTime ? (
                    <p className="text-destructive text-sm">End time is required.</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4 border-t pt-6">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Media
              </p>
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
            </div>

            <div className="mt-6 space-y-4 border-t pt-6">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Status
              </p>
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
        </div>
      </AdminEditorDialog>

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
    </AdminPageShell>
  );
}
