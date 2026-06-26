import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Eye,
  FileSpreadsheet,
  MoreHorizontal,
  Plus,
  Settings2,
  Trash2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';

import { ConfirmDialog, type PendingConfirm } from '@/components/admin/confirm-dialog';
import { DateTimePicker } from '@/components/admin/datetime-picker';
import { PageHeader } from '@/components/admin/page-header';
import { TableRowActions, tableActionsColumn } from '@/components/admin/table-row-actions';
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
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { queryKeys } from '@/hooks/query-keys';
import { ADMIN_LIST_PAGE_SIZE } from '@/lib/admin-pagination';
import { ADMIN_PAGE_META } from '@/lib/admin-page-meta';
import { validateExcelFile, validateExcelBuffer, snapshotUploadFile, FILE_READ_ERROR_MESSAGE } from '@/lib/validate-excel-file';
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
import type {
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

function EnrollmentMetaTable({ enrollment }: { enrollment: EnrollmentResponse }) {
  const rows: Array<{ label: string; value: ReactNode }> = [
    { label: 'Name', value: enrollment.userDisplayName ?? '—' },
    { label: 'Email', value: enrollment.userEmail ?? '—' },
    {
      label: 'Role',
      value: <Badge variant="secondary">{enrollment.role ?? 'STUDENT'}</Badge>,
    },
    {
      label: 'Status',
      value: <Badge variant="secondary">{enrollment.status}</Badge>,
    },
    { label: 'Method', value: enrollment.enrolmentMethod ?? '—' },
    {
      label: 'Enrolled at',
      value: enrollment.enrolledAt ? formatDateTime(enrollment.enrolledAt) : '—',
    },
    {
      label: 'Last accessed',
      value: enrollment.lastAccessedAt ? formatDateTime(enrollment.lastAccessedAt) : '—',
    },
    {
      label: 'Completed at',
      value: enrollment.completedAt ? formatDateTime(enrollment.completedAt) : '—',
    },
    {
      label: 'Progress',
      value: `${enrollment.progressPercent ?? 0}%`,
    },
  ];

  return (
    <dl className="divide-y rounded-lg border text-sm">
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid gap-1 px-4 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center sm:gap-4"
        >
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="font-medium">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function CourseRunDetailPage() {
  useAdminPageMeta(ADMIN_PAGE_META.courseRunDetail);

  const { runId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [enrollUsers, setEnrollUsers] = useState<UserResponse[]>([]);
  const [enrollStatus, setEnrollStatus] = useState('ACTIVE');
  const [enrollRole, setEnrollRole] = useState('STUDENT');
  const [importFile, setImportFile] = useState<File | null>(null);
  const importFileBufferRef = useRef<ArrayBuffer | null>(null);
  const [editEnrollment, setEditEnrollment] = useState<EnrollmentResponse | null>(null);
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [editRole, setEditRole] = useState('STUDENT');
  const [enrollmentPage, setEnrollmentPage] = useState(1);
  const [viewEnrollment, setViewEnrollment] = useState<EnrollmentResponse | null>(null);
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
        pageSize: ADMIN_LIST_PAGE_SIZE,
      }),
    enabled: Boolean(runId),
  });

  const run = runQuery.data;
  const course = courseQuery.data;
  const sessions = sessionsQuery.data?.data ?? run?.courseSessions ?? [];
  const enrollments = enrollmentsQuery.data?.data ?? [];

  const openEditEnrollment = (enrollment: EnrollmentResponse) => {
    setEditEnrollment(enrollment);
    setEditStatus(enrollment.status);
    setEditRole(enrollment.role ?? 'STUDENT');
  };

  const buildImportUploadFile = (): File | null => {
    if (!importFile || !importFileBufferRef.current) {
      return null;
    }
    if (importFileBufferRef.current.byteLength === 0) {
      return null;
    }
    const validationError = validateExcelBuffer(importFileBufferRef.current);
    if (validationError) {
      return null;
    }
    return new File([importFileBufferRef.current], importFile.name, {
      type:
        importFile.type ||
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  };

  const resolveImportUploadFile = (): File => {
    const uploadFile = buildImportUploadFile();
    if (!uploadFile) {
      throw new Error(
        'Could not read the selected file. Save and close it in Excel, then choose the file again.',
      );
    }
    return uploadFile;
  };

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
      enrollmentsApi.manualEnrollMany({
        userIds: enrollUsers.map((user) => user.id),
        courseRunId: runId!,
        status: enrollStatus as 'ACTIVE' | 'SUSPENDED' | 'COMPLETED' | 'CANCELLED',
        role: enrollRole as 'STUDENT' | 'INSTRUCTOR',
      }),
    onSuccess: async (result) => {
      if (result.successCount === 0) {
        toast.error(
          result.failures[0]?.reason ??
            'Could not enroll selected learners. They may already be enrolled.',
        );
        return;
      }

      toast.success(
        `Enrolled ${result.successCount} learner${result.successCount === 1 ? '' : 's'}${
          result.failedCount > 0 ? ` (${result.failedCount} failed)` : ''
        }.`,
      );
      setEnrollOpen(false);
      setEnrollUsers([]);
      setEnrollStatus('ACTIVE');
      setEnrollRole('STUDENT');
      await invalidateEnrollments();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      return enrollmentsApi.importByExcel(runId!, resolveImportUploadFile(), false);
    },
    onSuccess: async (result) => {
      if (result.successCount === 0) {
        toast.error(result.failures[0]?.reason ?? 'No learners were imported.');
        return;
      }

      toast.success(
        `Import done: ${result.successCount} succeeded${
          result.failedCount + result.skippedCount > 0
            ? `, ${result.failedCount + result.skippedCount} not imported`
            : ''
        }.`,
      );
      setImportFile(null);
      importFileBufferRef.current = null;
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
    mutationFn: async () => {
      return enrollmentsApi.importByExcel(runId!, resolveImportUploadFile(), true);
    },
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

  useEffect(() => {
    if (searchParams.get('settings') !== '1' || !run) {
      return;
    }

    setRunSettings(toRunSettingsForm(run));
    setRunSettingsOpen(true);
    setSearchParams({}, { replace: true });
  }, [run, searchParams, setSearchParams]);

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
        ...tableActionsColumn<EnrollmentResponse>(),
        cell: ({ row }) => (
          <TableRowActions>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewEnrollment(row.original)}
            >
              Detail
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openEditEnrollment(row.original)}
            >
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                setPendingConfirm({
                  title: 'Delete enrollment?',
                  description: (
                    <>
                      Remove{' '}
                      {row.original.userDisplayName ??
                        row.original.userEmail ??
                        'this learner'}{' '}
                      from this course run. This cannot be undone.
                    </>
                  ),
                  action: () => deleteEnrollmentMutation.mutate(row.original.id),
                })
              }
            >
              Delete
            </Button>
          </TableRowActions>
        ),
      },
    ],
    [deleteEnrollmentMutation],
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
          run && course
            ? `Course: ${course.title}`
            : 'Manage live sessions and enrollment.'
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
            <CardContent className="p-0">
              <div className="grid lg:grid-cols-2 lg:divide-x">
                <dl className="divide-y text-sm">
                  <div className="grid gap-1 px-4 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                    <dt className="text-muted-foreground">Class code</dt>
                    <dd className="font-mono font-semibold">{run.code}</dd>
                  </div>
                  <div className="grid gap-1 px-4 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                    <dt className="text-muted-foreground">Status</dt>
                    <dd>
                      <Badge variant="secondary">{run.status}</Badge>
                    </dd>
                  </div>
                  <div className="grid gap-1 px-4 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                    <dt className="text-muted-foreground">Course</dt>
                    <dd>
                      {course ? (
                        <Link
                          to={ROUTES.courseDetail(course.id)}
                          className="font-medium text-primary hover:underline"
                        >
                          {course.code} — {course.title}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </dd>
                  </div>
                  <div className="grid gap-1 px-4 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                    <dt className="text-muted-foreground">Pricing</dt>
                    <dd className="font-medium">
                      {hasCourseRunPricing(run.metadata)
                        ? formatCourseRunPricingSummary(run.metadata)
                        : 'Free'}
                    </dd>
                  </div>
                  <div className="grid gap-1 px-4 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                    <dt className="text-muted-foreground">Start date</dt>
                    <dd>{formatDateTime(run.startsAt)}</dd>
                  </div>
                  <div className="grid gap-1 px-4 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                    <dt className="text-muted-foreground">End date</dt>
                    <dd>{formatDateTime(run.endsAt)}</dd>
                  </div>
                </dl>

                <dl className="divide-y text-sm">
                  <div className="grid gap-1 px-4 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                    <dt className="text-muted-foreground">Enrollment opens</dt>
                    <dd>{formatDateTime(run.enrollmentStartDate)}</dd>
                  </div>
                  <div className="grid gap-1 px-4 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                    <dt className="text-muted-foreground">Enrollment closes</dt>
                    <dd>{formatDateTime(run.enrollmentEndDate)}</dd>
                  </div>
                  <div className="grid gap-1 px-4 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                    <dt className="text-muted-foreground">Capacity</dt>
                    <dd>{run.capacity ?? 'Unlimited'}</dd>
                  </div>
                  <div className="grid gap-1 px-4 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                    <dt className="text-muted-foreground">Timezone</dt>
                    <dd>{run.timezone ?? 'Asia/Ho_Chi_Minh'}</dd>
                  </div>
                  <div className="grid gap-1 px-4 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                    <dt className="text-muted-foreground">Sessions</dt>
                    <dd className="font-medium tabular-nums">{sessions.length}</dd>
                  </div>
                  <div className="grid gap-1 px-4 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                    <dt className="text-muted-foreground">Enrolled learners</dt>
                    <dd className="font-medium tabular-nums">
                      {enrollmentsQuery.data?.totalElement ?? 0}
                    </dd>
                  </div>
                </dl>
              </div>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid h-10 w-full max-w-lg grid-cols-2">
              <TabsTrigger value="sessions" className="h-full">
                Sessions ({sessions.length})
              </TabsTrigger>
              <TabsTrigger value="enrollments" className="h-full">
                Enrollment ({enrollmentsQuery.data?.totalElement ?? 0})
              </TabsTrigger>
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
                      Add learners
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
                    pageOffset={(enrollmentPage - 1) * ADMIN_LIST_PAGE_SIZE}
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
            setEnrollUsers([]);
            setEnrollStatus('ACTIVE');
            setEnrollRole('STUDENT');
          }
        }}
      >
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[800px] sm:max-w-[800px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Add learners</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={enrollStatus} onValueChange={setEnrollStatus}>
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
                <Select value={enrollRole} onValueChange={setEnrollRole}>
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
            <UserPicker
              open={enrollOpen}
              selectedUsers={enrollUsers}
              onSelectedUsersChange={setEnrollUsers}
              label="Select learners"
            />
          </div>
          <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              onClick={() => enrollMutation.mutate()}
              disabled={enrollUsers.length === 0 || enrollMutation.isPending}
            >
              Enroll {enrollUsers.length > 0 ? `(${enrollUsers.length})` : ''}
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
            importFileBufferRef.current = null;
          }
        }}
      >
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[800px] sm:max-w-[800px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Import enrollments via Excel</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground space-y-2">
              <p>1. Download the template (.xlsx).</p>
              <p>2. Paste learner emails starting from row 2. Keep the header row: email, order_no, amount.</p>
              <p>3. Save as <strong>.xlsx</strong> in Excel, then <strong>close the file</strong> before Preview/Import.</p>
              <p>4. Preview, then import. Rows with unknown emails are skipped.</p>
              <p>5. Import is enabled only after Preview shows at least one OK row.</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                void enrollmentsApi
                  .downloadImportTemplate()
                  .then((blob) => {
                    const url = URL.createObjectURL(blob);
                    const anchor = document.createElement('a');
                    anchor.href = url;
                    anchor.download = 'enrollment-template.xlsx';
                    anchor.click();
                    URL.revokeObjectURL(url);
                  })
                  .catch((error) => toast.error(getApiErrorMessage(error)));
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
                onChange={(event) => {
                  const picked = event.target.files?.[0] ?? null;
                  setImportPreview(null);
                  if (!picked) {
                    setImportFile(null);
                    importFileBufferRef.current = null;
                    return;
                  }

                  void (async () => {
                    try {
                      const snapshot = await snapshotUploadFile(picked);
                      const validationError = await validateExcelFile(snapshot);
                      if (validationError) {
                        toast.error(validationError);
                        setImportFile(null);
                        importFileBufferRef.current = null;
                        event.target.value = '';
                        return;
                      }
                      importFileBufferRef.current = await snapshot.arrayBuffer();
                      setImportFile(snapshot);
                    } catch {
                      toast.error(FILE_READ_ERROR_MESSAGE);
                      setImportFile(null);
                      importFileBufferRef.current = null;
                      event.target.value = '';
                    }
                  })();
                }}
              />
              {importFile ? (
                <p className="text-muted-foreground text-xs">Selected: {importFile.name}</p>
              ) : null}
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
              disabled={
                !importFile ||
                previewImportMutation.isPending ||
                importMutation.isPending
              }
              onClick={() => previewImportMutation.mutate()}
            >
              <Eye className="mr-2 size-4" />
              Preview
            </Button>
            <Button
              disabled={
                !importFile ||
                !importPreview ||
                importPreview.successCount === 0 ||
                previewImportMutation.isPending ||
                importMutation.isPending
              }
              onClick={() => importMutation.mutate()}
            >
              <Upload className="mr-2 size-4" />
              Import Excel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={Boolean(viewEnrollment)} onOpenChange={() => setViewEnrollment(null)}>
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[520px] sm:max-w-[520px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>
              {viewEnrollment?.userDisplayName ??
                viewEnrollment?.userEmail ??
                'Enrollment details'}
            </SheetTitle>
            {viewEnrollment?.userEmail ? (
              <SheetDescription>{viewEnrollment.userEmail}</SheetDescription>
            ) : null}
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {viewEnrollment ? <EnrollmentMetaTable enrollment={viewEnrollment} /> : null}
          </div>
          <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end sm:gap-2">
            <Button variant="outline" onClick={() => setViewEnrollment(null)}>
              Close
            </Button>
            {viewEnrollment ? (
              <Button
                onClick={() => {
                  openEditEnrollment(viewEnrollment);
                  setViewEnrollment(null);
                }}
              >
                Edit
              </Button>
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={Boolean(editEnrollment)} onOpenChange={() => setEditEnrollment(null)}>
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[520px] sm:max-w-[520px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Edit enrollment</SheetTitle>
            {editEnrollment ? (
              <SheetDescription>
                {editEnrollment.userDisplayName ?? editEnrollment.userEmail ?? 'Learner'}
                {editEnrollment.userEmail && editEnrollment.userDisplayName
                  ? ` · ${editEnrollment.userEmail}`
                  : ''}
              </SheetDescription>
            ) : null}
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
          <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end sm:gap-2">
            <Button variant="outline" onClick={() => setEditEnrollment(null)}>
              Cancel
            </Button>
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
          deleteRunMutation.isPending
        }
      />
    </div>
  );
}
