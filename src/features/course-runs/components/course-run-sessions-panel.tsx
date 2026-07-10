import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmDialog, type PendingConfirm } from '@/components/admin/confirm-dialog';
import { TableRowActionMenu } from '@/components/admin/table-row-actions';
import { DateTimePicker } from '@/components/admin/datetime-picker';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { queryKeys } from '@/hooks/query-keys';
import { confirmDiscard } from '@/lib/confirm-discard';
import { useBeforeUnload } from '@/hooks/use-beforeunload';
import { formatDateTime } from '@/lib/format';
import { sessionsApi } from '@/services/lms/lms-api';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import type { SessionResponse } from '@/services/types/domain';
import { toLocalDateTimeFromIso } from '@/lib/datetime-local';

type SessionForm = {
  title: string;
  description: string;
  sessionNumber: string;
  scheduledAt: string;
  durationMinutes: string;
  status: string;
};

const emptySessionForm: SessionForm = {
  title: '',
  description: '',
  sessionNumber: '1',
  scheduledAt: '',
  durationMinutes: '60',
  status: 'SCHEDULED',
};

function toSessionForm(session: SessionResponse): SessionForm {
  return {
    title: session.title,
    description: session.description ?? '',
    sessionNumber: String(session.sessionNumber),
    scheduledAt: session.scheduledAt ? toLocalDateTimeFromIso(session.scheduledAt) : '',
    durationMinutes: session.durationMinutes != null ? String(session.durationMinutes) : '',
    status: session.status,
  };
}

type CourseRunSessionsPanelProps = {
  runId: string;
  sessions: SessionResponse[];
  isLoading: boolean;
};

/**
 * Sessions tab for the course run detail page: lists online sessions and owns the
 * create/edit/delete session CRUD (sheets, forms, and mutations).
 */
export function CourseRunSessionsPanel({
  runId,
  sessions,
  isLoading,
}: CourseRunSessionsPanelProps) {
  const queryClient = useQueryClient();

  const [createSessionOpen, setCreateSessionOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState<SessionForm>(emptySessionForm);
  const [editSession, setEditSession] = useState<{
    id: string;
    orderIndex: number;
    form: SessionForm;
  } | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  const createSessionDirty = (Object.keys(emptySessionForm) as Array<keyof SessionForm>).some(
    (field) => sessionForm[field] !== emptySessionForm[field],
  );

  const editSessionDirty =
    editSession != null &&
    (() => {
      const original = sessions.find((session) => session.id === editSession.id);
      if (!original) {
        return true;
      }
      const baseline = toSessionForm(original);
      return (Object.keys(baseline) as Array<keyof SessionForm>).some(
        (field) => editSession.form[field] !== baseline[field],
      );
    })();

  useBeforeUnload(
    (createSessionOpen && createSessionDirty) || (Boolean(editSession) && editSessionDirty),
  );

  const invalidateSessions = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.courseRuns.detail(runId) }),
    ]);
  };

  const createSessionMutation = useMutation({
    mutationFn: () =>
      sessionsApi.create({
        courseRunId: runId,
        title: sessionForm.title,
        description: sessionForm.description || undefined,
        sessionNumber: Number(sessionForm.sessionNumber),
        orderIndex: sessions.length,
        scheduledAt: sessionForm.scheduledAt
          ? new Date(sessionForm.scheduledAt).toISOString()
          : undefined,
        durationMinutes: sessionForm.durationMinutes
          ? Number(sessionForm.durationMinutes)
          : undefined,
        status: sessionForm.status,
      }),
    onSuccess: async () => {
      toast.success('Session added.');
      setCreateSessionOpen(false);
      setSessionForm(emptySessionForm);
      await invalidateSessions();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const updateSessionMutation = useMutation({
    mutationFn: () =>
      sessionsApi.update(editSession!.id, {
        courseRunId: runId,
        title: editSession!.form.title,
        description: editSession!.form.description || undefined,
        sessionNumber: Number(editSession!.form.sessionNumber),
        orderIndex: editSession!.orderIndex,
        scheduledAt: editSession!.form.scheduledAt
          ? new Date(editSession!.form.scheduledAt).toISOString()
          : undefined,
        durationMinutes: editSession!.form.durationMinutes
          ? Number(editSession!.form.durationMinutes)
          : undefined,
        status: editSession!.form.status,
      }),
    onSuccess: async () => {
      toast.success('Session updated.');
      setEditSession(null);
      await invalidateSessions();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) => sessionsApi.remove(sessionId),
    onSuccess: async () => {
      toast.success('Session deleted.');
      setPendingConfirm(null);
      await invalidateSessions();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const openEditSession = (session: SessionResponse) => {
    setEditSession({
      id: session.id,
      orderIndex: session.orderIndex,
      form: toSessionForm(session),
    });
  };

  const sessionColumns = useMemo<ColumnDef<SessionResponse>[]>(
    () => [
      {
        accessorKey: 'sessionNumber',
        header: 'No.',
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.sessionNumber}</span>
        ),
      },
      { accessorKey: 'title', header: 'Title' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <Badge variant="secondary">{row.original.status}</Badge>,
      },
      {
        id: 'scheduled',
        header: 'Scheduled',
        cell: ({ row }) =>
          row.original.scheduledAt
            ? formatDateTime(row.original.scheduledAt)
            : 'Not scheduled',
      },
      {
        id: 'duration',
        header: 'Duration',
        cell: ({ row }) =>
          row.original.durationMinutes != null
            ? `${row.original.durationMinutes} min`
            : '—',
      },
      {
        id: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <span className="text-muted-foreground line-clamp-2 block max-w-[240px] text-sm">
            {row.original.description?.trim() || '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        size: 48,
        cell: ({ row }) => (
          <TableRowActionMenu
            primaryLabel="Edit"
            onPrimary={() => openEditSession(row.original)}
            items={[
              {
                label: 'Delete',
                icon: Trash2,
                destructive: true,
                onClick: () =>
                  setPendingConfirm({
                    title: 'Delete session?',
                    description: (
                      <>Delete session &quot;{row.original.title}&quot;. This cannot be undone.</>
                    ),
                    action: () => deleteSessionMutation.mutate(row.original.id),
                  }),
              },
            ]}
          />
        ),
      },
    ],
    [deleteSessionMutation],
  );

  return (
    <>
      <Card className="border-0 shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-3 px-0 pb-3">
          <CardTitle className="text-base">Online sessions</CardTitle>
          <Button size="sm" onClick={() => setCreateSessionOpen(true)}>
            <Plus className="mr-2 size-4" />
            Add session
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <DataTable
            columns={sessionColumns}
            data={sessions}
            isLoading={isLoading}
            emptyMessage="No sessions yet."
            showPagination={false}
          />
        </CardContent>
      </Card>

      <Sheet
        open={createSessionOpen}
        onOpenChange={(open) => {
          if (!open && !confirmDiscard(createSessionDirty)) {
            return;
          }
          setCreateSessionOpen(open);
          if (!open) {
            setSessionForm(emptySessionForm);
          }
        }}
      >
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[560px] sm:max-w-[560px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Add session</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <Label>
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                value={sessionForm.title}
                aria-invalid={sessionForm.title.trim() === ''}
                onChange={(event) =>
                  setSessionForm((current) => ({ ...current, title: event.target.value }))
                }
              />
              {sessionForm.title.trim() === '' ? (
                <p className="text-destructive text-sm">Title is required.</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={sessionForm.description}
                onChange={(event) =>
                  setSessionForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Session number</Label>
                <Input
                  type="number"
                  value={sessionForm.sessionNumber}
                  onChange={(event) =>
                    setSessionForm((current) => ({
                      ...current,
                      sessionNumber: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={sessionForm.durationMinutes}
                  onChange={(event) =>
                    setSessionForm((current) => ({
                      ...current,
                      durationMinutes: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Schedule</Label>
              <DateTimePicker
                value={sessionForm.scheduledAt}
                onChange={(scheduledAt) =>
                  setSessionForm((current) => ({ ...current, scheduledAt }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={sessionForm.status}
                onValueChange={(value) =>
                  setSessionForm((current) => ({ ...current, status: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SCHEDULED">SCHEDULED</SelectItem>
                  <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
                  <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                  <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              onClick={() => createSessionMutation.mutate()}
              disabled={createSessionMutation.isPending || sessionForm.title.trim() === ''}
            >
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={Boolean(editSession)}
        onOpenChange={(open) => {
          if (!open) {
            if (!confirmDiscard(editSessionDirty)) {
              return;
            }
            setEditSession(null);
          }
        }}
      >
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[560px] sm:max-w-[560px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Edit session</SheetTitle>
          </SheetHeader>
          {editSession ? (
            <>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <div className="space-y-2">
                  <Label>
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={editSession.form.title}
                    aria-invalid={editSession.form.title.trim() === ''}
                    onChange={(event) =>
                      setEditSession((current) =>
                        current && {
                          ...current,
                          form: { ...current.form, title: event.target.value },
                        },
                      )
                    }
                  />
                  {editSession.form.title.trim() === '' ? (
                    <p className="text-destructive text-sm">Title is required.</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editSession.form.description}
                    onChange={(event) =>
                      setEditSession((current) =>
                        current && {
                          ...current,
                          form: { ...current.form, description: event.target.value },
                        },
                      )
                    }
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Session number</Label>
                    <Input
                      type="number"
                      value={editSession.form.sessionNumber}
                      onChange={(event) =>
                        setEditSession((current) =>
                          current && {
                            ...current,
                            form: { ...current.form, sessionNumber: event.target.value },
                          },
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration (minutes)</Label>
                    <Input
                      type="number"
                      value={editSession.form.durationMinutes}
                      onChange={(event) =>
                        setEditSession((current) =>
                          current && {
                            ...current,
                            form: { ...current.form, durationMinutes: event.target.value },
                          },
                        )
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Schedule</Label>
                  <DateTimePicker
                    value={editSession.form.scheduledAt}
                    onChange={(scheduledAt) =>
                      setEditSession((current) =>
                        current && {
                          ...current,
                          form: { ...current.form, scheduledAt },
                        },
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editSession.form.status}
                    onValueChange={(value) =>
                      setEditSession((current) =>
                        current && {
                          ...current,
                          form: { ...current.form, status: value },
                        },
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SCHEDULED">SCHEDULED</SelectItem>
                      <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
                      <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                      <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end">
                <Button
                  onClick={() => updateSessionMutation.mutate()}
                  disabled={
                    updateSessionMutation.isPending || editSession.form.title.trim() === ''
                  }
                >
                  Save
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={Boolean(pendingConfirm)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingConfirm(null);
          }
        }}
        title={pendingConfirm?.title ?? ''}
        description={pendingConfirm?.description}
        confirmLabel={pendingConfirm?.confirmLabel}
        onConfirm={() => pendingConfirm?.action()}
        pending={deleteSessionMutation.isPending}
      />
    </>
  );
}
