import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Eye,
  FileSpreadsheet,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Settings2,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmDialog, type PendingConfirm } from '@/components/admin/confirm-dialog';
import { DateTimePicker } from '@/components/admin/datetime-picker';
import { PageHeader } from '@/components/admin/page-header';
import { UserPicker } from '@/components/admin/user-picker';
import { DataTable } from '@/components/data-table/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { queryKeys } from '@/hooks/query-keys';
import { ADMIN_PAGE_META } from '@/lib/admin-page-meta';
import {
  formatCourseRunPricingSummary,
  getPayPalPriceUsd,
  hasCourseRunPricing,
  mergeCourseRunPricingMetadata,
} from '@/lib/course-run-pricing';
import { toLocalDateTimeFromIso } from '@/lib/datetime-local';
import { formatDateTime } from '@/lib/format';
import { useAdminPageMeta } from '@/lib/page-meta';
import { ROUTES } from '@/routes/paths';
import { courseRunsApi } from '@/services/course-runs/course-runs-api';
import { coursesApi } from '@/services/courses/courses-api';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import {
  enrollmentsApi,
  sessionsApi,
} from '@/services/lms/lms-api';
import { messagingApi } from '@/services/messaging/messaging-api';
import type {
  ChatMessageResponse,
  CourseRunResponse,
  EnrollmentImportResponse,
  EnrollmentResponse,
  SessionResponse,
  UserResponse,
} from '@/services/types/domain';

type RunSettingsForm = {
  code: string;
  status: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  capacity: string;
  enrollmentStartDate: string;
  enrollmentEndDate: string;
  paypalPriceUsd: string;
};

type SessionForm = {
  title: string;
  description: string;
  sessionNumber: string;
  scheduledAt: string;
  durationMinutes: string;
  status: string;
};

const DETAIL_PAGE_SIZE = 100;

const emptySessionForm: SessionForm = {
  title: '',
  description: '',
  sessionNumber: '1',
  scheduledAt: '',
  durationMinutes: '60',
  status: 'SCHEDULED',
};

function toRunSettingsForm(run: CourseRunResponse): RunSettingsForm {
  return {
    code: run.code,
    status: run.status,
    startsAt: run.startsAt ? toLocalDateTimeFromIso(run.startsAt) : '',
    endsAt: run.endsAt ? toLocalDateTimeFromIso(run.endsAt) : '',
    timezone: run.timezone ?? 'Asia/Ho_Chi_Minh',
    capacity: run.capacity != null ? String(run.capacity) : '',
    paypalPriceUsd: getPayPalPriceUsd(run.metadata),
    enrollmentStartDate: run.enrollmentStartDate
      ? toLocalDateTimeFromIso(run.enrollmentStartDate)
      : '',
    enrollmentEndDate: run.enrollmentEndDate
      ? toLocalDateTimeFromIso(run.enrollmentEndDate)
      : '',
  };
}

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

export function CourseRunDetailPage() {
  useAdminPageMeta(ADMIN_PAGE_META.courseRunDetail);

  const { runId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [createSessionOpen, setCreateSessionOpen] = useState(false);
  const [editSession, setEditSession] = useState<{
    id: string;
    orderIndex: number;
    form: SessionForm;
  } | null>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [runSettingsOpen, setRunSettingsOpen] = useState(false);
  const [sessionForm, setSessionForm] = useState<SessionForm>(emptySessionForm);
  const [enrollUser, setEnrollUser] = useState<UserResponse | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [editEnrollment, setEditEnrollment] = useState<EnrollmentResponse | null>(null);
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [editRole, setEditRole] = useState('STUDENT');
  const [messagePage, setMessagePage] = useState(1);
  const [enrollmentPage, setEnrollmentPage] = useState(1);
  const [viewEnrollmentId, setViewEnrollmentId] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<EnrollmentImportResponse | null>(null);
  const [runSettings, setRunSettings] = useState<RunSettingsForm | null>(null);
  const [activeTab, setActiveTab] = useState('sessions');
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  const runQuery = useQuery({
    queryKey: queryKeys.courseRuns.detail(runId ?? ''),
    queryFn: () => courseRunsApi.getById(runId!),
    enabled: Boolean(runId),
  });

  const courseQuery = useQuery({
    queryKey: queryKeys.courses.detail(runQuery.data?.courseId ?? ''),
    queryFn: () => coursesApi.getById(runQuery.data!.courseId),
    enabled: Boolean(runQuery.data?.courseId),
  });

  const sessionsQuery = useQuery({
    queryKey: queryKeys.sessions.list(runId ?? ''),
    queryFn: () => sessionsApi.getPage(0, DETAIL_PAGE_SIZE, runId!),
    enabled: Boolean(runId),
  });

  const enrollmentsQuery = useQuery({
    queryKey: queryKeys.enrollments.filter(runId ?? '', enrollmentPage),
    queryFn: () =>
      enrollmentsApi.filter({
        courseRunId: runId!,
        page: enrollmentPage,
        pageSize: 20,
      }),
    enabled: Boolean(runId),
  });

  const enrollmentDetailQuery = useQuery({
    queryKey: queryKeys.enrollments.detail(viewEnrollmentId ?? ''),
    queryFn: () => enrollmentsApi.getById(viewEnrollmentId!),
    enabled: Boolean(viewEnrollmentId),
  });

  const conversationQuery = useQuery({
    queryKey: queryKeys.messaging.conversation(runId ?? ''),
    queryFn: () => messagingApi.getCourseRunConversation(runId!),
    enabled: Boolean(runId),
    retry: false,
  });

  const messagesQuery = useQuery({
    queryKey: queryKeys.messaging.messages(conversationQuery.data?.id ?? '', messagePage),
    queryFn: () => messagingApi.getMessages(conversationQuery.data!.id, messagePage, 50),
    enabled: Boolean(conversationQuery.data?.id),
  });

  const run = runQuery.data;
  const course = courseQuery.data;
  const sessions = sessionsQuery.data?.data ?? run?.courseSessions ?? [];
  const enrollments = enrollmentsQuery.data?.data ?? [];
  const syllabusSections = course?.syllabusSections ?? [];
  const totalSyllabusItems = syllabusSections.reduce(
    (count, section) => count + (section.items?.length ?? 0),
    0,
  );

  const invalidateRunQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.courseRuns.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.courseRuns.detail(runId ?? '') }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.courses.detail(run?.courseId ?? ''),
      }),
    ]);
  };

  const invalidateSessions = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all }),
      queryClient.invalidateQueries({ queryKey: queryKeys.courseRuns.detail(runId ?? '') }),
    ]);
  };

  const invalidateEnrollments = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all });
  };

  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) => messagingApi.deleteMessage(messageId),
    onSuccess: async () => {
      toast.success('Message deleted.');
      setPendingConfirm(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.messaging.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const createSessionMutation = useMutation({
    mutationFn: () =>
      sessionsApi.create({
        courseRunId: runId!,
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
        courseRunId: runId!,
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

  const enrollMutation = useMutation({
    mutationFn: () =>
      enrollmentsApi.manualEnroll({ userId: enrollUser!.id, courseRunId: runId! }),
    onSuccess: async () => {
      toast.success('Student enrolled.');
      setEnrollOpen(false);
      setEnrollUser(null);
      await invalidateEnrollments();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const importMutation = useMutation({
    mutationFn: () => enrollmentsApi.importByExcel(runId!, importFile!, false),
    onSuccess: async (result) => {
      toast.success(`Import done: ${result.successCount} succeeded, ${result.failedCount} failed.`);
      setImportFile(null);
      setImportPreview(null);
      setImportOpen(false);
      await invalidateEnrollments();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const updateEnrollmentMutation = useMutation({
    mutationFn: () =>
      enrollmentsApi.update(editEnrollment!.id, {
        status: editStatus as 'ACTIVE' | 'SUSPENDED' | 'COMPLETED' | 'CANCELLED',
        role: editRole as 'STUDENT' | 'INSTRUCTOR',
      }),
    onSuccess: async () => {
      toast.success('Enrollment updated.');
      setEditEnrollment(null);
      await invalidateEnrollments();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteEnrollmentMutation = useMutation({
    mutationFn: (enrollmentId: string) => enrollmentsApi.remove(enrollmentId),
    onSuccess: async () => {
      toast.success('Enrollment deleted.');
      setPendingConfirm(null);
      await invalidateEnrollments();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const previewImportMutation = useMutation({
    mutationFn: () => enrollmentsApi.importByExcel(runId!, importFile!, true),
    onSuccess: (result) => {
      setImportPreview(result);
      toast.success('Import previewed.');
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const updateRunMutation = useMutation({
    mutationFn: () => {
      const settings = runSettings!;
      return courseRunsApi.update(runId!, {
        courseId: run!.courseId,
        code: settings.code,
        status: settings.status,
        startsAt: new Date(settings.startsAt).toISOString(),
        endsAt: new Date(settings.endsAt).toISOString(),
        timezone: settings.timezone,
        metadata: mergeCourseRunPricingMetadata(
          run?.metadata,
          settings.paypalPriceUsd,
        ),
        capacity: settings.capacity ? Number(settings.capacity) : null,
        enrollmentStartDate: settings.enrollmentStartDate
          ? new Date(settings.enrollmentStartDate).toISOString()
          : null,
        enrollmentEndDate: settings.enrollmentEndDate
          ? new Date(settings.enrollmentEndDate).toISOString()
          : null,
      });
    },
    onSuccess: async () => {
      toast.success('Course run updated.');
      setRunSettingsOpen(false);
      await invalidateRunQueries();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteRunMutation = useMutation({
    mutationFn: () => courseRunsApi.remove(runId!),
    onSuccess: () => {
      toast.success('Course run deleted.');
      navigate(run?.courseId ? ROUTES.courseDetail(run.courseId) : ROUTES.courseRuns);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const openRunSettings = () => {
    if (!run) {
      return;
    }

    setRunSettings(toRunSettingsForm(run));
    setRunSettingsOpen(true);
  };

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditSession(row.original)}>
                Edit session
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() =>
                  setPendingConfirm({
                    title: 'Delete session?',
                    description: (
                      <>
                        Delete session &quot;{row.original.title}&quot;. This cannot be undone.
                      </>
                    ),
                    action: () => deleteSessionMutation.mutate(row.original.id),
                  })
                }
              >
                Delete session
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [deleteSessionMutation],
  );

  const enrollmentColumns = useMemo<ColumnDef<EnrollmentResponse>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        cell: ({ row }) =>
          row.original.userDisplayName ?? row.original.userEmail ?? 'User',
      },
      {
        id: 'email',
        header: 'Email',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">
            {row.original.userEmail ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'role',
        header: 'Role',
        cell: ({ row }) => row.original.role ?? 'STUDENT',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <Badge variant="secondary">{row.original.status}</Badge>,
      },
      {
        id: 'enrolledAt',
        header: 'Enrolled at',
        cell: ({ row }) => formatDateTime(row.original.enrolledAt),
      },
      {
        id: 'actions',
        header: '',
        size: 48,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setViewEnrollmentId(row.original.id)}>
                View details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setEditEnrollment(row.original);
                  setEditStatus(row.original.status);
                  setEditRole(row.original.role ?? 'STUDENT');
                }}
              >
                Edit enrollment
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() =>
                  setPendingConfirm({
                    title: 'Delete enrollment?',
                    description: (
                      <>
                        Remove{' '}
                        {row.original.userDisplayName ??
                          row.original.userEmail ??
                          'this student'}{' '}
                        from this course run. This cannot be undone.
                      </>
                    ),
                    action: () => deleteEnrollmentMutation.mutate(row.original.id),
                  })
                }
              >
                Delete enrollment
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [deleteEnrollmentMutation],
  );

  const messageColumns = useMemo<ColumnDef<ChatMessageResponse>[]>(
    () => [
      {
        id: 'sender',
        header: 'Sender',
        cell: ({ row }) => row.original.senderUsername ?? row.original.senderId,
      },
      {
        id: 'message',
        header: 'Message',
        cell: ({ row }) => (
          <span className="line-clamp-2 block max-w-md text-sm">
            {row.original.text ?? '(attachment)'}
          </span>
        ),
      },
      {
        id: 'createdAt',
        header: 'Sent at',
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm whitespace-nowrap">
            {formatDateTime(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        size: 48,
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            onClick={() =>
              setPendingConfirm({
                title: 'Delete message?',
                description: 'Delete this chat message. This cannot be undone.',
                action: () => deleteMessageMutation.mutate(row.original.id),
              })
            }
          >
            <Trash2 className="size-4" />
          </Button>
        ),
      },
    ],
    [deleteMessageMutation],
  );

  if (!runId) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to={run?.courseId ? ROUTES.courseDetail(run.courseId) : ROUTES.courseRuns}>
          <ArrowLeft className="mr-2 size-4" />
          {run?.courseId ? 'Back to course' : 'Back to course runs'}
        </Link>
      </Button>

      <PageHeader
        title={run?.code ?? 'Course run'}
        description={
          run
            ? `${course?.title ?? 'Course'} · ${formatDateTime(run.startsAt)} → ${formatDateTime(run.endsAt)}`
            : 'Manage live sessions, enrollment, and class chat.'
        }
        actions={
          run ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={openRunSettings}>
                <Settings2 className="mr-2 size-4" />
                Course run settings
              </Button>
              <Button
                variant="destructive"
                disabled={deleteRunMutation.isPending}
                onClick={() =>
                  setPendingConfirm({
                    title: 'Delete course run?',
                    description: (
                      <>
                        Delete run &quot;{run.code}&quot; and related sessions. This cannot be
                        undone.
                      </>
                    ),
                    action: () => deleteRunMutation.mutate(),
                  })
                }
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </Button>
            </div>
          ) : undefined
        }
      />

      {run ? (
        <>
          <Card>
            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{run.status}</Badge>
                <Badge variant="outline">
                  {hasCourseRunPricing(run.metadata)
                    ? formatCourseRunPricingSummary(run.metadata)
                    : 'Free'}
                </Badge>
                {course ? (
                  <Button variant="link" size="sm" className="h-auto px-0" asChild>
                    <Link to={ROUTES.courseDetail(course.id)}>
                      <BookOpen className="mr-1 size-3.5" />
                      {course.code}
                    </Link>
                  </Button>
                ) : null}
                {course && totalSyllabusItems > 0 ? (
                  <Button variant="link" size="sm" className="h-auto px-0" asChild>
                    <Link to={ROUTES.courseDetail(course.id, 'syllabus')}>
                      Syllabus · {totalSyllabusItems} lessons
                    </Link>
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-md border bg-muted/20 px-3 py-2">
                  <p className="text-muted-foreground text-xs">Start</p>
                  <p className="text-sm font-medium">{formatDateTime(run.startsAt)}</p>
                </div>
                <div className="rounded-md border bg-muted/20 px-3 py-2">
                  <p className="text-muted-foreground text-xs">End</p>
                  <p className="text-sm font-medium">{formatDateTime(run.endsAt)}</p>
                </div>
                <div className="rounded-md border bg-muted/20 px-3 py-2">
                  <p className="text-muted-foreground text-xs">Enrollment window</p>
                  <p className="text-sm font-medium">
                    {formatDateTime(run.enrollmentStartDate)} →{' '}
                    {formatDateTime(run.enrollmentEndDate)}
                  </p>
                </div>
                <div className="rounded-md border bg-muted/20 px-3 py-2">
                  <p className="text-muted-foreground text-xs">Capacity · Timezone</p>
                  <p className="text-sm font-medium">
                    {run.capacity ?? 'Unlimited'} · {run.timezone ?? 'Asia/Ho_Chi_Minh'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              type="button"
              className="rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/40"
              onClick={() => setActiveTab('sessions')}
            >
              <div className="flex items-center gap-2">
                <CalendarDays className="text-muted-foreground size-4" />
                <p className="text-muted-foreground text-xs">Sessions</p>
              </div>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{sessions.length}</p>
            </button>
            <button
              type="button"
              className="rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/40"
              onClick={() => setActiveTab('enrollments')}
            >
              <div className="flex items-center gap-2">
                <Users className="text-muted-foreground size-4" />
                <p className="text-muted-foreground text-xs">Enrollment</p>
              </div>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {enrollmentsQuery.data?.totalElement ?? 0}
              </p>
            </button>
            <button
              type="button"
              className="rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/40"
              onClick={() => setActiveTab('chat')}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="text-muted-foreground size-4" />
                <p className="text-muted-foreground text-xs">Class chat</p>
              </div>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {conversationQuery.data?.participants.length ?? 0}
              </p>
            </button>
            <button
              type="button"
              className="rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/40 sm:col-span-1"
              onClick={openRunSettings}
            >
              <div className="flex items-center gap-2">
                <Settings2 className="text-muted-foreground size-4" />
                <p className="text-muted-foreground text-xs">Checkout</p>
              </div>
              <p className="mt-1 text-sm font-semibold">
                {hasCourseRunPricing(run.metadata) ? 'Paid' : 'Free'}
              </p>
            </button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="h-auto w-full flex-wrap justify-start">
              <TabsTrigger value="sessions">Sessions ({sessions.length})</TabsTrigger>
              <TabsTrigger value="enrollments">
                Enrollment ({enrollmentsQuery.data?.totalElement ?? 0})
              </TabsTrigger>
              <TabsTrigger value="chat">Class chat</TabsTrigger>
            </TabsList>

            <TabsContent value="sessions" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
                  <CardTitle className="text-base">Live sessions</CardTitle>
                  <Button size="sm" onClick={() => setCreateSessionOpen(true)}>
                    <Plus className="mr-2 size-4" />
                    Add session
                  </Button>
                </CardHeader>
                <CardContent className="pt-0">
                  <DataTable
                    columns={sessionColumns}
                    data={sessions}
                    isLoading={sessionsQuery.isLoading}
                    emptyMessage="No sessions yet."
                    showPagination={false}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="enrollments" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
                  <CardTitle className="text-base">Enrollment</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setEnrollOpen(true)}>
                      <Plus className="mr-2 size-4" />
                      Add learner
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                      <FileSpreadsheet className="mr-2 size-4" />
                      Import Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <DataTable
                    columns={enrollmentColumns}
                    data={enrollments}
                    isLoading={enrollmentsQuery.isLoading}
                    emptyMessage="No enrollments yet."
                    showRowIndex
                    pageOffset={(enrollmentPage - 1) * 20}
                    showPagination={false}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={enrollmentPage <= 1}
                      onClick={() => setEnrollmentPage((page) => page - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-muted-foreground self-center text-sm">
                      Page {enrollmentPage} / {enrollmentsQuery.data?.totalPages ?? 1}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={enrollmentPage >= (enrollmentsQuery.data?.totalPages ?? 1)}
                      onClick={() => setEnrollmentPage((page) => page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="chat" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Class chat</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {!conversationQuery.data ? (
                    <p className="text-muted-foreground py-6 text-center text-sm">
                      This class has no group conversation yet.
                    </p>
                  ) : (
                    <>
                      <p className="text-muted-foreground text-sm">
                        {conversationQuery.data.participants.length} members ·{' '}
                        {conversationQuery.data.status}
                      </p>
                      <DataTable
                        columns={messageColumns}
                        data={messagesQuery.data?.data ?? []}
                        isLoading={messagesQuery.isLoading}
                        emptyMessage="No messages yet."
                        showRowIndex
                        pageOffset={(messagePage - 1) * 50}
                        showPagination={false}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={messagePage <= 1}
                          onClick={() => setMessagePage((page) => page - 1)}
                        >
                          Previous
                        </Button>
                        <span className="text-muted-foreground self-center text-sm">
                          Page {messagePage} / {messagesQuery.data?.totalPages ?? 1}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={messagePage >= (messagesQuery.data?.totalPages ?? 1)}
                          onClick={() => setMessagePage((page) => page + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Card>
          <CardContent className="text-muted-foreground p-6 text-sm">
            Loading course run details...
          </CardContent>
        </Card>
      )}

      <Sheet open={runSettingsOpen} onOpenChange={setRunSettingsOpen}>
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[800px] sm:max-w-[800px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Course run settings</SheetTitle>
          </SheetHeader>
          {runSettings ? (
            <>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <div className="space-y-2">
                  <Label>Class code</Label>
                  <Input
                    value={runSettings.code}
                    onChange={(event) =>
                      setRunSettings((current) => current && { ...current, code: event.target.value })
                    }
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={runSettings.status}
                      onValueChange={(value) =>
                        setRunSettings((current) => current && { ...current, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">DRAFT</SelectItem>
                        <SelectItem value="OPEN">OPEN</SelectItem>
                        <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
                        <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                        <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Capacity</Label>
                    <Input
                      type="number"
                      value={runSettings.capacity}
                      onChange={(event) =>
                        setRunSettings((current) =>
                          current && { ...current, capacity: event.target.value },
                        )
                      }
                    />
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="text-sm font-medium">Checkout pricing</p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Set one global USD price on this run so checkout can create the correct payment order.
                  </p>
                  <div className="mt-4 space-y-2">
                    <Label>Global price (USD)</Label>
                    <Input
                      inputMode="decimal"
                      placeholder="19.99"
                      value={runSettings.paypalPriceUsd}
                      onChange={(event) =>
                        setRunSettings((current) =>
                          current && { ...current, paypalPriceUsd: event.target.value },
                        )
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Start</Label>
                    <DateTimePicker
                      value={runSettings.startsAt}
                      onChange={(startsAt) =>
                        setRunSettings((current) => current && { ...current, startsAt })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End</Label>
                    <DateTimePicker
                      value={runSettings.endsAt}
                      onChange={(endsAt) =>
                        setRunSettings((current) => current && { ...current, endsAt })
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Open enrollment</Label>
                    <DateTimePicker
                      value={runSettings.enrollmentStartDate}
                      onChange={(enrollmentStartDate) =>
                        setRunSettings((current) =>
                          current && { ...current, enrollmentStartDate },
                        )
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Close enrollment</Label>
                    <DateTimePicker
                      value={runSettings.enrollmentEndDate}
                      onChange={(enrollmentEndDate) =>
                        setRunSettings((current) =>
                          current && { ...current, enrollmentEndDate },
                        )
                      }
                    />
                  </div>
                </div>
              </div>
              <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end">
                <Button onClick={() => updateRunMutation.mutate()} disabled={updateRunMutation.isPending}>
                  Save
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet open={createSessionOpen} onOpenChange={setCreateSessionOpen}>
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[800px] sm:max-w-[800px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Add session</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={sessionForm.title}
                onChange={(event) =>
                  setSessionForm((current) => ({ ...current, title: event.target.value }))
                }
              />
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
            <Button onClick={() => createSessionMutation.mutate()} disabled={createSessionMutation.isPending}>
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={Boolean(editSession)}
        onOpenChange={() => {
          setEditSession(null);
        }}
      >
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[800px] sm:max-w-[800px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Edit session</SheetTitle>
          </SheetHeader>
          {editSession ? (
            <>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={editSession.form.title}
                    onChange={(event) =>
                      setEditSession((current) =>
                        current && {
                          ...current,
                          form: { ...current.form, title: event.target.value },
                        },
                      )
                    }
                  />
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
                <Button onClick={() => updateSessionMutation.mutate()} disabled={updateSessionMutation.isPending}>
                  Save
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet
        open={enrollOpen}
        onOpenChange={(open) => {
          setEnrollOpen(open);
          if (!open) {
            setEnrollUser(null);
          }
        }}
      >
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[800px] sm:max-w-[800px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Add learner</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <UserPicker open={enrollOpen} selectedUser={enrollUser} onSelect={setEnrollUser} />
          </div>
          <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end">
            <Button onClick={() => enrollMutation.mutate()} disabled={!enrollUser || enrollMutation.isPending}>
              Enroll
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open);
          if (!open) {
            setImportPreview(null);
            setImportFile(null);
          }
        }}
      >
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[800px] sm:max-w-[800px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Import enrollments via Excel</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
              Download template, fill in student data, preview results, then import.
            </div>
            <Button
              variant="outline"
              onClick={() => {
                void enrollmentsApi.downloadImportTemplate().then((blob) => {
                  const url = URL.createObjectURL(blob);
                  const anchor = document.createElement('a');
                  anchor.href = url;
                  anchor.download = 'enrollment-template.xlsx';
                  anchor.click();
                  URL.revokeObjectURL(url);
                });
              }}
            >
              <FileSpreadsheet className="mr-2 size-4" />
              Download template
            </Button>
            <div className="space-y-2">
              <Label>Choose file</Label>
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
              />
            </div>
            {importPreview ? (
              <Card>
                <CardContent className="space-y-2 p-4 text-sm">
                  <p>
                    Preview: {importPreview.successCount} OK, {importPreview.failedCount} failed,{' '}
                    {importPreview.skippedCount} skipped / {importPreview.totalRows} rows
                  </p>
                  {importPreview.failures.length > 0 ? (
                    <div className="space-y-2">
                      {importPreview.failures.slice(0, 10).map((failure) => (
                        <div key={`${failure.rowNumber}-${failure.email ?? 'unknown'}`} className="rounded-md border p-3">
                          <p className="font-medium">Row {failure.rowNumber}</p>
                          <p className="text-muted-foreground">{failure.reason}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
          </div>
          <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              disabled={!importFile || previewImportMutation.isPending}
              onClick={() => importFile && previewImportMutation.mutate()}
            >
              <Eye className="mr-2 size-4" />
              Preview
            </Button>
            <Button
              disabled={!importFile || importMutation.isPending}
              onClick={() => importFile && importMutation.mutate()}
            >
              <Upload className="mr-2 size-4" />
              Import Excel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={Boolean(viewEnrollmentId)} onOpenChange={() => setViewEnrollmentId(null)}>
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[800px] sm:max-w-[800px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Enrollment details</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4 text-sm">
            {enrollmentDetailQuery.data ? (
              <>
                <div>
                  <p className="text-muted-foreground">User</p>
                  <p className="font-medium">{enrollmentDetailQuery.data.userEmail}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">{enrollmentDetailQuery.data.status}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Role</p>
                  <p className="font-medium">{enrollmentDetailQuery.data.role ?? 'STUDENT'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Method</p>
                  <p className="font-medium">
                    {enrollmentDetailQuery.data.enrolmentMethod ?? 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Progress</p>
                  <p className="font-medium">
                    {enrollmentDetailQuery.data.progressPercent ?? '0'}%
                  </p>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Loading...</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={Boolean(editEnrollment)} onOpenChange={() => setEditEnrollment(null)}>
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[800px] sm:max-w-[800px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Edit enrollment</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                  <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                  <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">STUDENT</SelectItem>
                  <SelectItem value="INSTRUCTOR">INSTRUCTOR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end">
            <Button onClick={() => updateEnrollmentMutation.mutate()} disabled={updateEnrollmentMutation.isPending}>
              Save
            </Button>
          </SheetFooter>
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
        pending={
          deleteSessionMutation.isPending ||
          deleteEnrollmentMutation.isPending ||
          deleteMessageMutation.isPending ||
          deleteRunMutation.isPending
        }
      />
    </div>
  );
}
