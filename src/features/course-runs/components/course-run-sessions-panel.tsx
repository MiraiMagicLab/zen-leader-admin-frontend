import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Plus, Trash2 } from 'lucide-react';
import { adminToast as toast } from '@/lib/admin-toast';

import { ConfirmDialog, type PendingConfirm } from '@/components/admin/confirm-dialog';
import { DateTimePicker } from '@/components/admin/datetime-picker';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminFormDialogFooter } from '@/components/admin/admin-action-bar';
import { AdminEditorDialog } from '@/components/admin/admin-editor-dialog';
import { Textarea } from '@/components/ui/textarea';
import { queryKeys } from '@/hooks/query-keys';
import { confirmDiscard } from '@/lib/confirm-discard';
import { useBeforeUnload } from '@/hooks/use-beforeunload';
import { formatDateTime } from '@/lib/format';
import { humanizeEnumValue } from '@/lib/humanize';
import { sessionsApi } from '@/services/lms/lms-api';
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
    onError: (error) => toast.error(error),
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
    onError: (error) => toast.error(error),
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) => sessionsApi.remove(sessionId),
    onSuccess: async () => {
      toast.success('Session deleted.');
      setPendingConfirm(null);
      await invalidateSessions();
    },
    onError: (error) => toast.error(error),
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
        cell: ({ row }) => <Badge variant="secondary">{humanizeEnumValue(row.original.status)}</Badge>,
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
    ],
    [],
  );

  return (
    <>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold">Online sessions</h3>
          <Button size="sm" onClick={() => setCreateSessionOpen(true)}>
            <Plus className="mr-2 size-4" />
            Add session
          </Button>
        </div>
        <DataTable
          columns={sessionColumns}
          data={sessions}
          isLoading={isLoading}
          emptyMessage="No sessions yet."
          pageOffset={0}
          showPagination={false}
          onRowClick={openEditSession}
        />
      </section>

      <AdminEditorDialog
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
        title="Add session"
        size="lg"
        footer={
          <AdminFormDialogFooter
            onCancel={() => {
              if (confirmDiscard(createSessionDirty)) {
                setCreateSessionOpen(false);
                setSessionForm(emptySessionForm);
              }
            }}
            submitLabel="Save"
            onSubmit={() => createSessionMutation.mutate()}
            pending={createSessionMutation.isPending}
            disabled={sessionForm.title.trim() === ''}
          />
        }
      >
        <div className="space-y-4">
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
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </AdminEditorDialog>

      <AdminEditorDialog
        open={Boolean(editSession)}
        onOpenChange={(open) => {
          if (!open) {
            if (!confirmDiscard(editSessionDirty)) {
              return;
            }
            setEditSession(null);
          }
        }}
        title="Edit session"
        size="lg"
        footer={
          editSession ? (
            <AdminFormDialogFooter
              onCancel={() => {
                if (confirmDiscard(editSessionDirty)) {
                  setEditSession(null);
                }
              }}
              submitLabel="Save"
              onSubmit={() => updateSessionMutation.mutate()}
              pending={updateSessionMutation.isPending}
              disabled={editSession.form.title.trim() === ''}
              dangerAction={
                <Button
                  type="button"
                  variant="destructiveOutline"
                  onClick={() =>
                    setPendingConfirm({
                      title: 'Delete session?',
                      description: (
                        <>
                          Delete session &quot;{editSession.form.title}&quot;. This cannot be
                          undone.
                        </>
                      ),
                      action: () => {
                        deleteSessionMutation.mutate(editSession.id);
                        setEditSession(null);
                      },
                    })
                  }
                >
                  <Trash2 className="mr-1.5 size-3.5" />
                  Delete
                </Button>
              }
            />
          ) : undefined
        }
      >
        {editSession ? (
          <div className="space-y-4">
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
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : null}
      </AdminEditorDialog>

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
