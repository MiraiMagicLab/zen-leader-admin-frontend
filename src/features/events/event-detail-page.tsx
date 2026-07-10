import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { confirmDiscard } from '@/lib/confirm-discard';
import { useBeforeUnload } from '@/hooks/use-beforeunload';
import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { AdminDetailSkeleton, AdminQueryError } from '@/components/admin/admin-query-state';
import { DateTimePicker } from '@/components/admin/datetime-picker';
import { ImageFilePicker } from '@/components/admin/image-file-picker';
import { ServerPagination } from '@/components/admin/server-pagination';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import type { CommentResponse } from '@/services/types/domain';

type EventActionKind = 'publish' | 'unpublish' | 'delete';

type PendingEventAction = {
  action: EventActionKind;
  eventTitle: string;
};

type PendingCommentDelete = {
  commentId: string;
  authorName: string;
};

function humanizeKey(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim();
  if (!spaced) {
    return key;
  }
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function CommentItem({
  comment,
  onDelete,
  onEdit,
}: {
  comment: CommentResponse;
  onDelete: (comment: CommentResponse) => void;
  onEdit: (comment: CommentResponse) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-4 rounded-md border p-3">
        <div className="min-w-0">
          <p className="font-medium">{comment.userDisplayName}</p>
          <p className="text-muted-foreground mt-1 whitespace-pre-wrap text-sm">{comment.content}</p>
          <p className="text-muted-foreground mt-2 text-xs">
            {formatDateTime(comment.createdAt)} • {comment.likesCount} likes
          </p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => onEdit(comment)}>
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive shrink-0"
            onClick={() => onDelete(comment)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      {(comment.replies ?? []).map((reply) => (
        <div key={reply.id} className="ml-6">
          <CommentItem comment={reply} onDelete={onDelete} onEdit={onEdit} />
        </div>
      ))}
    </div>
  );
}

export function EventDetailPage() {
  useAdminPageMeta(ADMIN_PAGE_META.eventDetail);

  const { eventId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [commentPage, setCommentPage] = useState(0);
  const [editEventOpen, setEditEventOpen] = useState(false);
  const [editCommentOpen, setEditCommentOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [editIsOfficial, setEditIsOfficial] = useState(false);
  const [editThumbnailFile, setEditThumbnailFile] = useState<File | null>(null);
  const [editThumbnailUrl, setEditThumbnailUrl] = useState('');
  const [editTouched, setEditTouched] = useState<{
    title: boolean;
    start: boolean;
    end: boolean;
  }>({ title: false, start: false, end: false });
  const [editInitial, setEditInitial] = useState({
    title: '',
    description: '',
    content: '',
    start: '',
    end: '',
    isOfficial: false,
    thumbnailUrl: '',
  });
  const [editComment, setEditComment] = useState<CommentResponse | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [pendingEventAction, setPendingEventAction] = useState<PendingEventAction | null>(null);
  const [pendingCommentDelete, setPendingCommentDelete] = useState<PendingCommentDelete | null>(
    null,
  );

  const eventQuery = useQuery({
    queryKey: queryKeys.events.detail(eventId ?? ''),
    queryFn: () => eventsApi.getById(eventId!),
    enabled: Boolean(eventId),
  });

  const commentsQuery = useQuery({
    queryKey: queryKeys.events.comments(eventId ?? '', commentPage),
    queryFn: () => eventsApi.getComments(eventId!, commentPage, ADMIN_LIST_PAGE_SIZE),
    enabled: Boolean(eventId),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => eventsApi.deleteComment(commentId),
    onSuccess: () => {
      toast.success('Comment deleted.');
      setPendingCommentDelete(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const publishMutation = useMutation({
    mutationFn: () => eventsApi.publish(eventId!),
    onSuccess: () => {
      toast.success('Event published.');
      setPendingEventAction(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const unpublishMutation = useMutation({
    mutationFn: () => eventsApi.unpublish(eventId!),
    onSuccess: () => {
      toast.success('Event moved back to draft.');
      setPendingEventAction(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      let thumbnailUrl = editThumbnailUrl.trim() || undefined;
      if (editThumbnailFile) {
        thumbnailUrl = (await assetsApi.uploadViaPresigned(editThumbnailFile)).downloadUrl;
      }

      return eventsApi.update(eventId!, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        content: editContent.trim() || undefined,
        startTime: new Date(editStart).toISOString(),
        endTime: new Date(editEnd).toISOString(),
        thumbnailUrl,
        isOfficial: editIsOfficial,
      });
    },
    onSuccess: () => {
      toast.success('Event updated.');
      setEditEventOpen(false);
      setEditThumbnailFile(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const updateCommentMutation = useMutation({
    mutationFn: () => eventsApi.updateComment(editComment!.id, editCommentContent),
    onSuccess: () => {
      toast.success('Comment updated.');
      setEditComment(null);
      setEditCommentOpen(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteEventMutation = useMutation({
    mutationFn: () => eventsApi.remove(eventId!),
    onSuccess: () => {
      toast.success('Event deleted.');
      setPendingEventAction(null);
      void navigate(ROUTES.events);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const event = eventQuery.data;
  const eventOwnerLabel = event?.isOfficial ? 'Zen Leader' : event?.author.name;
  const metadataEntries = Object.entries(event?.metadata ?? {});
  const isConfirmingEventAction =
    publishMutation.isPending || unpublishMutation.isPending || deleteEventMutation.isPending;

  const isEditEventDirty =
    editTitle !== editInitial.title ||
    editDescription !== editInitial.description ||
    editContent !== editInitial.content ||
    editStart !== editInitial.start ||
    editEnd !== editInitial.end ||
    editIsOfficial !== editInitial.isOfficial ||
    editThumbnailUrl !== editInitial.thumbnailUrl ||
    editThumbnailFile !== null;

  const editEventRequiredMissing = !editTitle.trim() || !editStart || !editEnd;

  const isEditCommentDirty =
    editComment !== null && editCommentContent !== (editComment.content ?? '');

  useBeforeUnload((editEventOpen && isEditEventDirty) || (editCommentOpen && isEditCommentDirty));

  const closeEditEventSheet = (open: boolean) => {
    if (!open && !confirmDiscard(isEditEventDirty)) {
      return;
    }
    setEditEventOpen(open);
  };

  const closeEditCommentDialog = (open: boolean) => {
    if (!open && !confirmDiscard(isEditCommentDirty)) {
      return;
    }
    setEditCommentOpen(open);
    if (!open) {
      setEditComment(null);
    }
  };

  const openEditSheet = () => {
    if (!event) {
      return;
    }

    const toLocal = (iso: string) => {
      const date = new Date(iso);
      const pad = (value: number) => String(value).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const start = toLocal(event.startTime);
    const end = toLocal(event.endTime);

    setEditTitle(event.title);
    setEditDescription(event.description ?? '');
    setEditContent(event.content ?? '');
    setEditStart(start);
    setEditEnd(end);
    setEditIsOfficial(event.isOfficial);
    setEditThumbnailFile(null);
    setEditThumbnailUrl(event.thumbnailUrl ?? '');
    setEditInitial({
      title: event.title,
      description: event.description ?? '',
      content: event.content ?? '',
      start,
      end,
      isOfficial: event.isOfficial,
      thumbnailUrl: event.thumbnailUrl ?? '',
    });
    setEditTouched({ title: false, start: false, end: false });
    setEditEventOpen(true);
  };

  const openEventActionDialog = (action: EventActionKind) => {
    if (!event) {
      return;
    }
    setPendingEventAction({ action, eventTitle: event.title });
  };

  const confirmEventAction = () => {
    if (!pendingEventAction) {
      return;
    }

    if (pendingEventAction.action === 'publish') {
      publishMutation.mutate();
      return;
    }

    if (pendingEventAction.action === 'unpublish') {
      unpublishMutation.mutate();
      return;
    }

    deleteEventMutation.mutate();
  };

  return (
    <AdminPageShell
      title={event?.title ?? 'Event'}
      description={event?.description ?? undefined}
      toolbar={
        <Button variant="ghost" size="sm" className="-ml-2 self-start" asChild>
          <Link to={ROUTES.events}>
            <ArrowLeft className="mr-2 size-4" />
            Back to events
          </Link>
        </Button>
      }
      actions={
        event ? (
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{eventStatusLabel(event.status)}</Badge>
            {event.isOfficial ? <Badge>{eventTypeLabel(true)}</Badge> : null}
            <Button variant="outline" size="sm" onClick={openEditSheet}>
              <Pencil className="mr-2 size-4" />
              Edit
            </Button>
            {normalizeEventStatus(event.status) !== 'PUBLISHED' ? (
              <Button variant="outline" size="sm" onClick={() => openEventActionDialog('publish')}>
                Publish
              </Button>
            ) : null}
            {normalizeEventStatus(event.status) !== 'DRAFT' ? (
              <Button variant="outline" size="sm" onClick={() => openEventActionDialog('unpublish')}>
                Move to draft
              </Button>
            ) : null}
            <Button variant="destructive" size="sm" onClick={() => openEventActionDialog('delete')}>
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
          </div>
        ) : undefined
      }
    >
      {eventQuery.isError ? (
        <AdminQueryError
          message={getApiErrorMessage(eventQuery.error)}
          onRetry={() => void eventQuery.refetch()}
        />
      ) : null}

      {!event && eventQuery.isLoading ? <AdminDetailSkeleton /> : null}

      {event ? (
        <Card>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
            {event.thumbnailUrl ? (
              <div className="sm:col-span-2">
                <p className="text-muted-foreground mb-2 text-sm">Thumbnail</p>
                <img
                  src={event.thumbnailUrl}
                  alt={event.title}
                  className="h-56 w-full rounded-lg border object-cover"
                />
              </div>
            ) : null}
            <div>
              <p className="text-muted-foreground text-sm">Start time</p>
              <p>{formatDateTime(event.startTime)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">End time</p>
              <p>{formatDateTime(event.endTime)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Owner</p>
              <p>{eventOwnerLabel}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Visibility</p>
              <p>
                {normalizeEventStatus(event.status) === 'PUBLISHED'
                  ? 'Visible on public feed'
                  : 'Hidden from public feed'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Meeting target</p>
              <p>{event.roomCode ? `Room code: ${event.roomCode}` : 'Room details will appear after scheduling is completed.'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Join target</p>
              <p className="break-all">{event.liveLink ?? 'The access link will appear automatically when the event is ready.'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Session type</p>
              <p>{event.sessionType ?? 'Live meeting'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Created</p>
              <p>{formatDateTime(event.createdAt)}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-muted-foreground text-sm">Engagement</p>
              <p>
                {event.engagementStats.likes} likes • {event.engagementStats.interested} interested •{' '}
                {event.engagementStats.comments ?? 0} comments
              </p>
            </div>
            {event.content ? (
              <div className="sm:col-span-2">
                <p className="text-muted-foreground text-sm">Content</p>
                <p className="whitespace-pre-wrap">{event.content}</p>
              </div>
            ) : null}
            {metadataEntries.length > 0 ? (
              <div className="sm:col-span-2">
                <p className="text-muted-foreground mb-2 text-sm">Additional details</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {metadataEntries.map(([key, value]) => (
                    <div key={key} className="rounded-md border p-3">
                      <p className="text-muted-foreground text-xs">{humanizeKey(key)}</p>
                      <p className="mt-1 break-words text-sm">
                        {typeof value === 'string' ? value : JSON.stringify(value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comments ({commentsQuery.data?.totalElement ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(commentsQuery.data?.data ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">No comments yet.</p>
          ) : (
            commentsQuery.data?.data.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onDelete={(selectedComment) =>
                  setPendingCommentDelete({
                    commentId: selectedComment.id,
                    authorName: selectedComment.userDisplayName,
                  })
                }
                onEdit={(selectedComment) => {
                  setEditComment(selectedComment);
                  setEditCommentContent(selectedComment.content);
                  setEditCommentOpen(true);
                }}
              />
            ))
          )}
          <ServerPagination
            page={commentPage}
            totalPages={commentsQuery.data?.totalPages ?? 1}
            onPageChange={setCommentPage}
          />
        </CardContent>
      </Card>

      <Sheet open={editEventOpen} onOpenChange={closeEditEventSheet}>
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[560px] sm:max-w-[560px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Edit event</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-4">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Basic info
              </p>
              <div className="space-y-2">
                <Label htmlFor="edit-event-title">
                  Event title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-event-title"
                  value={editTitle}
                  aria-invalid={editTouched.title && !editTitle.trim()}
                  onBlur={() => setEditTouched((t) => ({ ...t, title: true }))}
                  onChange={(currentEvent) => setEditTitle(currentEvent.target.value)}
                />
                {editTouched.title && !editTitle.trim() ? (
                  <p className="text-destructive text-sm">Event title is required.</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-event-description">Short summary</Label>
                <Textarea
                  id="edit-event-description"
                  value={editDescription}
                  onChange={(currentEvent) => setEditDescription(currentEvent.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-event-content">Full details</Label>
                <Textarea
                  id="edit-event-content"
                  rows={8}
                  value={editContent}
                  onChange={(currentEvent) => setEditContent(currentEvent.target.value)}
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
                    value={editStart}
                    onChange={(value) => {
                      setEditStart(value);
                      setEditTouched((t) => ({ ...t, start: true }));
                    }}
                  />
                  {editTouched.start && !editStart ? (
                    <p className="text-destructive text-sm">Start time is required.</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>
                    End time <span className="text-destructive">*</span>
                  </Label>
                  <DateTimePicker
                    value={editEnd}
                    onChange={(value) => {
                      setEditEnd(value);
                      setEditTouched((t) => ({ ...t, end: true }));
                    }}
                  />
                  {editTouched.end && !editEnd ? (
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
                <Label htmlFor="edit-event-thumbnail-url">Thumbnail link</Label>
                <Input
                  id="edit-event-thumbnail-url"
                  value={editThumbnailUrl}
                  placeholder="https://..."
                  onChange={(currentEvent) => setEditThumbnailUrl(currentEvent.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-event-thumbnail-file">Upload new image</Label>
                <ImageFilePicker
                  id="edit-event-thumbnail-file"
                  file={editThumbnailFile}
                  existingUrl={editThumbnailUrl}
                  previewAlt={editTitle || 'Event thumbnail'}
                  onFileChange={setEditThumbnailFile}
                />
              </div>
            </div>

            <div className="mt-6 space-y-4 border-t pt-6">
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Status
              </p>
              <div className="flex items-center gap-2">
                <Switch checked={editIsOfficial} onCheckedChange={setEditIsOfficial} />
                <Label>System event</Label>
              </div>
            </div>
          </div>
          <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={editEventRequiredMissing || updateMutation.isPending}
            >
              Save changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog
        open={editCommentOpen && Boolean(editComment)}
        onOpenChange={closeEditCommentDialog}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit comment</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="edit-comment-content">
              Comment text <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="edit-comment-content"
              rows={8}
              value={editCommentContent}
              aria-invalid={!editCommentContent.trim()}
              onChange={(currentEvent) => setEditCommentContent(currentEvent.target.value)}
            />
            {!editCommentContent.trim() ? (
              <p className="text-destructive text-sm">Comment text is required.</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              onClick={() => updateCommentMutation.mutate()}
              disabled={!editCommentContent.trim() || updateCommentMutation.isPending}
            >
              Save comment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(pendingEventAction)}
        onOpenChange={(open) => {
          if (!open && !isConfirmingEventAction) {
            setPendingEventAction(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingEventAction?.action === 'publish'
                ? 'Publish this event?'
                : pendingEventAction?.action === 'unpublish'
                  ? 'Move this event back to draft?'
                  : 'Delete this event?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingEventAction?.action === 'publish'
                ? `"${pendingEventAction.eventTitle}" will become visible in public event feeds immediately.`
                : pendingEventAction?.action === 'unpublish'
                  ? `"${pendingEventAction.eventTitle}" will stop appearing in public event feeds until it is published again.`
                  : `"${pendingEventAction?.eventTitle}" will be removed from admin management and public feeds.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isConfirmingEventAction}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={
                pendingEventAction?.action === 'delete'
                  ? 'bg-destructive text-white hover:bg-destructive/90'
                  : undefined
              }
              disabled={isConfirmingEventAction}
              onClick={confirmEventAction}
            >
              {pendingEventAction?.action === 'publish'
                ? 'Publish event'
                : pendingEventAction?.action === 'unpublish'
                  ? 'Move to draft'
                  : 'Delete event'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(pendingCommentDelete)}
        onOpenChange={(open) => {
          if (!open && !deleteCommentMutation.isPending) {
            setPendingCommentDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingCommentDelete
                ? `This will remove the comment from ${pendingCommentDelete.authorName} and any moderation context attached to it.`
                : 'This comment will be removed permanently.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCommentMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleteCommentMutation.isPending}
              onClick={() => {
                if (pendingCommentDelete) {
                  deleteCommentMutation.mutate(pendingCommentDelete.commentId);
                }
              }}
            >
              Delete comment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPageShell>
  );
}
