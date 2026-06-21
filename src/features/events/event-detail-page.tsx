import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { DateTimePicker } from '@/components/admin/datetime-picker';
import { PageHeader } from '@/components/admin/page-header';
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
import { Textarea } from '@/components/ui/textarea';
import { queryKeys } from '@/hooks/query-keys';
import { formatDateTime } from '@/lib/format';
import { ROUTES } from '@/routes/paths';
import { eventsApi } from '@/services/events/events-api';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import type { CommentResponse } from '@/services/types/domain';

function CommentItem({
  comment,
  onDelete,
  onEdit,
}: {
  comment: CommentResponse;
  onDelete: (id: string) => void;
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
            onClick={() => onDelete(comment.id)}
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
  const [editComment, setEditComment] = useState<CommentResponse | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');

  const eventQuery = useQuery({
    queryKey: queryKeys.events.detail(eventId ?? ''),
    queryFn: () => eventsApi.getById(eventId!),
    enabled: Boolean(eventId),
  });

  const commentsQuery = useQuery({
    queryKey: queryKeys.events.comments(eventId ?? '', commentPage),
    queryFn: () => eventsApi.getComments(eventId!, commentPage, 20),
    enabled: Boolean(eventId),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => eventsApi.deleteComment(commentId),
    onSuccess: () => {
      toast.success('Comment deleted.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const publishMutation = useMutation({
    mutationFn: () => eventsApi.publish(eventId!),
    onSuccess: () => {
      toast.success('Event published.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const unpublishMutation = useMutation({
    mutationFn: () => eventsApi.unpublish(eventId!),
    onSuccess: () => {
      toast.success('Event moved back to draft.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      eventsApi.update(eventId!, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        content: editContent.trim() || undefined,
        startTime: new Date(editStart).toISOString(),
        endTime: new Date(editEnd).toISOString(),
      }),
    onSuccess: () => {
      toast.success('Event updated.');
      setEditEventOpen(false);
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
      void navigate(ROUTES.events);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const event = eventQuery.data;
  const eventOwnerLabel = event?.isOfficial ? 'ZenLeader System' : event?.author.name;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to={ROUTES.events}>
          <ArrowLeft className="mr-2 size-4" />
          Back to events
        </Link>
      </Button>

      <PageHeader
        title={event?.title ?? 'Event'}
        description={event?.description ?? undefined}
        actions={
          event ? (
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{event.status}</Badge>
              {event.isOfficial ? <Badge>System event</Badge> : null}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const toLocal = (iso: string) => {
                    const date = new Date(iso);
                    const pad = (value: number) => String(value).padStart(2, '0');
                    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
                  };

                  setEditTitle(event.title);
                  setEditDescription(event.description ?? '');
                  setEditContent(event.content ?? '');
                  setEditStart(toLocal(event.startTime));
                  setEditEnd(toLocal(event.endTime));
                  setEditEventOpen(true);
                }}
              >
                <Pencil className="mr-2 size-4" />
                Edit
              </Button>
              <Button variant="outline" size="sm" onClick={() => publishMutation.mutate()}>
                Publish
              </Button>
              <Button variant="outline" size="sm" onClick={() => unpublishMutation.mutate()}>
                Move to draft
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (window.confirm('Delete this event?')) {
                    deleteEventMutation.mutate();
                  }
                }}
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </Button>
            </div>
          ) : undefined
        }
      />

      {event ? (
        <Card>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
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
              <p className="text-muted-foreground text-sm">Meeting target</p>
              <p>{event.roomCode ? `Internal meet room: ${event.roomCode}` : 'Internal meet room will be assigned.'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-muted-foreground text-sm">Engagement</p>
              <p>
                {event.engagementStats.likes} likes • {event.engagementStats.interested} interested
                {' '}• {event.engagementStats.comments ?? 0} comments
              </p>
            </div>
            {event.content ? (
              <div className="sm:col-span-2">
                <p className="text-muted-foreground text-sm">Content</p>
                <p className="whitespace-pre-wrap">{event.content}</p>
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
                onDelete={(id) => deleteCommentMutation.mutate(id)}
                onEdit={(selectedComment) => {
                  setEditComment(selectedComment);
                  setEditCommentContent(selectedComment.content);
                  setEditCommentOpen(true);
                }}
              />
            ))
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={commentPage <= 0}
              onClick={() => setCommentPage((currentPage) => currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={commentPage + 1 >= (commentsQuery.data?.totalPages ?? 1)}
              onClick={() => setCommentPage((currentPage) => currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      <Sheet open={editEventOpen} onOpenChange={setEditEventOpen}>
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[800px] sm:max-w-[800px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Edit event</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-event-title">Title</Label>
              <Input
                id="edit-event-title"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-event-description">Description</Label>
              <Textarea
                id="edit-event-description"
                value={editDescription}
                onChange={(event) => setEditDescription(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-event-content">Content</Label>
              <Textarea
                id="edit-event-content"
                rows={8}
                value={editContent}
                onChange={(event) => setEditContent(event.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Start time</Label>
                <DateTimePicker value={editStart} onChange={setEditStart} />
              </div>
              <div className="space-y-2">
                <Label>End time</Label>
                <DateTimePicker value={editEnd} onChange={setEditEnd} />
              </div>
            </div>
          </div>
          <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={!editTitle.trim() || !editStart || !editEnd || updateMutation.isPending}
            >
              Save changes
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={editCommentOpen && Boolean(editComment)}
        onOpenChange={(open) => {
          setEditCommentOpen(open);
          if (!open) {
            setEditComment(null);
          }
        }}
      >
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[800px] sm:max-w-[800px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Edit comment</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-comment-content">Content</Label>
              <Textarea
                id="edit-comment-content"
                rows={8}
                value={editCommentContent}
                onChange={(event) => setEditCommentContent(event.target.value)}
              />
            </div>
          </div>
          <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              onClick={() => updateCommentMutation.mutate()}
              disabled={!editCommentContent.trim() || updateCommentMutation.isPending}
            >
              Save comment
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
