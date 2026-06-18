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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
        <div>
          <p className="font-medium">{comment.userDisplayName}</p>
          <p className="text-muted-foreground mt-1 text-sm">{comment.content}</p>
          <p className="text-muted-foreground mt-2 text-xs">
            {formatDateTime(comment.createdAt)} · {comment.likesCount} thích
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(comment)}
          >
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
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
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
      toast.success('Đã xóa bình luận.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const publishMutation = useMutation({
    mutationFn: () => eventsApi.publish(eventId!),
    onSuccess: () => {
      toast.success('Đã xuất bản.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const unpublishMutation = useMutation({
    mutationFn: () => eventsApi.unpublish(eventId!),
    onSuccess: () => {
      toast.success('Đã gỡ xuất bản.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      eventsApi.update(eventId!, {
        title: editTitle,
        description: editDescription,
        startTime: new Date(editStart).toISOString(),
        endTime: new Date(editEnd).toISOString(),
      }),
    onSuccess: () => {
      toast.success('Đã cập nhật sự kiện.');
      setEditOpen(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const updateCommentMutation = useMutation({
    mutationFn: () =>
      eventsApi.updateComment(editComment!.id, editCommentContent),
    onSuccess: () => {
      toast.success('Đã sửa bình luận.');
      setEditComment(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteEventMutation = useMutation({
    mutationFn: () => eventsApi.remove(eventId!),
    onSuccess: () => {
      toast.success('Đã xóa sự kiện.');
      void navigate(ROUTES.events);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const event = eventQuery.data;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to={ROUTES.events}>
          <ArrowLeft className="mr-2 size-4" />
          Quay lại sự kiện
        </Link>
      </Button>

      <PageHeader
        title={event?.title ?? 'Sự kiện'}
        description={event?.description ?? undefined}
        actions={
          event ? (
            <div className="flex gap-2">
              <Badge variant="secondary">{event.status}</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const toLocal = (iso: string) => {
                    const d = new Date(iso);
                    const pad = (n: number) => String(n).padStart(2, '0');
                    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                  };
                  setEditTitle(event.title);
                  setEditDescription(event.description ?? '');
                  setEditStart(toLocal(event.startTime));
                  setEditEnd(toLocal(event.endTime));
                  setEditOpen(true);
                }}
              >
                <Pencil className="mr-2 size-4" />
                Sửa
              </Button>
              <Button variant="outline" size="sm" onClick={() => publishMutation.mutate()}>
                Xuất bản
              </Button>
              <Button variant="outline" size="sm" onClick={() => unpublishMutation.mutate()}>
                Gỡ xuất bản
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (window.confirm('Xóa sự kiện này?')) {
                    deleteEventMutation.mutate();
                  }
                }}
              >
                <Trash2 className="mr-2 size-4" />
                Xóa
              </Button>
            </div>
          ) : undefined
        }
      />

      {event && (
        <Card>
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-sm">Bắt đầu</p>
              <p>{formatDateTime(event.startTime)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Kết thúc</p>
              <p>{formatDateTime(event.endTime)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Tác giả</p>
              <p>{event.author.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Tương tác</p>
              <p>
                {event.engagementStats.likes} thích ·{' '}
                {event.engagementStats.interested} quan tâm ·{' '}
                {event.engagementStats.comments ?? 0} bình luận
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Bình luận ({commentsQuery.data?.totalElement ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(commentsQuery.data?.data ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">Chưa có bình luận.</p>
          ) : (
            commentsQuery.data?.data.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onDelete={(id) => deleteCommentMutation.mutate(id)}
                onEdit={(c) => {
                  setEditComment(c);
                  setEditCommentContent(c.content);
                }}
              />
            ))
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={commentPage <= 0}
              onClick={() => setCommentPage((p) => p - 1)}
            >
              Trang trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={
                commentPage + 1 >= (commentsQuery.data?.totalPages ?? 1)
              }
              onClick={() => setCommentPage((p) => p + 1)}
            >
              Trang sau
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa sự kiện</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tiêu đề</Label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Bắt đầu</Label>
                <DateTimePicker
                  value={editStart}
                  onChange={setEditStart}
                />
              </div>
              <div className="space-y-2">
                <Label>Kết thúc</Label>
                <DateTimePicker
                  value={editEnd}
                  onChange={setEditEnd}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => updateMutation.mutate()}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editComment)} onOpenChange={() => setEditComment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa bình luận</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editCommentContent}
            onChange={(e) => setEditCommentContent(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button onClick={() => updateCommentMutation.mutate()}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
