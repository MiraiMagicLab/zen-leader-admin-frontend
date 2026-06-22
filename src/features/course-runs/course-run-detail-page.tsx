import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

import { DateTimePicker } from '@/components/admin/datetime-picker';
import { PageHeader } from '@/components/admin/page-header';
import { UserPicker } from '@/components/admin/user-picker';
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
import { toLocalDateTimeFromIso } from '@/lib/datetime-local';
import { formatDateTime } from '@/lib/format';
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
      toast.success('Da xoa tin nhan.');
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
      toast.success('Da them buoi hoc.');
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
      toast.success('Da cap nhat buoi hoc.');
      setEditSession(null);
      await invalidateSessions();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) => sessionsApi.remove(sessionId),
    onSuccess: async () => {
      toast.success('Da xoa buoi hoc.');
      await invalidateSessions();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const enrollMutation = useMutation({
    mutationFn: () =>
      enrollmentsApi.manualEnroll({ userId: enrollUser!.id, courseRunId: runId! }),
    onSuccess: async () => {
      toast.success('Da ghi danh hoc vien.');
      setEnrollOpen(false);
      setEnrollUser(null);
      await invalidateEnrollments();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const importMutation = useMutation({
    mutationFn: () => enrollmentsApi.importByExcel(runId!, importFile!, false),
    onSuccess: async (result) => {
      toast.success(`Import xong: ${result.successCount} thanh cong, ${result.failedCount} loi.`);
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
      toast.success('Da cap nhat ghi danh.');
      setEditEnrollment(null);
      await invalidateEnrollments();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteEnrollmentMutation = useMutation({
    mutationFn: (enrollmentId: string) => enrollmentsApi.remove(enrollmentId),
    onSuccess: async () => {
      toast.success('Da xoa ghi danh.');
      await invalidateEnrollments();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const previewImportMutation = useMutation({
    mutationFn: () => enrollmentsApi.importByExcel(runId!, importFile!, true),
    onSuccess: (result) => {
      setImportPreview(result);
      toast.success('Da xem truoc import.');
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
      toast.success('Da cap nhat dot hoc.');
      setRunSettingsOpen(false);
      await invalidateRunQueries();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteRunMutation = useMutation({
    mutationFn: () => courseRunsApi.remove(runId!),
    onSuccess: () => {
      toast.success('Da xoa dot hoc.');
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

  if (!runId) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to={run?.courseId ? ROUTES.courseDetail(run.courseId) : ROUTES.courseRuns}>
          <ArrowLeft className="mr-2 size-4" />
          {run?.courseId ? 'Quay lại khóa học' : 'Quay lại đợt học'}
        </Link>
      </Button>

      <PageHeader
        title={run?.code ?? 'Đợt học'}
        description={
          run
            ? `${course?.title ?? 'Khóa học'} · ${formatDateTime(run.startsAt)} → ${formatDateTime(run.endsAt)}`
            : 'Quản lý buổi học live, ghi danh và chat lớp.'
        }
        actions={
          run ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={openRunSettings}>
                <Settings2 className="mr-2 size-4" />
                Cài đặt đợt học
              </Button>
              <Button
                variant="destructive"
                disabled={deleteRunMutation.isPending}
                onClick={() => {
                  if (window.confirm('Xoa dot hoc nay?')) {
                    deleteRunMutation.mutate();
                  }
                }}
              >
                <Trash2 className="mr-2 size-4" />
                Xoa
              </Button>
            </div>
          ) : undefined
        }
      />

      {run ? (
        <>
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardContent className="grid gap-6 p-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{run.status}</Badge>
                    {course ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link to={ROUTES.courseDetail(course.id)}>
                          Mở khóa học {course.code}
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Khóa học liên kết</p>
                    <p className="font-medium">{course?.title ?? 'Đang tải...'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Múi giờ</p>
                    <p className="font-medium">{run.timezone ?? 'Asia/Ho_Chi_Minh'}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground text-sm">Bắt đầu</p>
                    <p className="font-medium">{formatDateTime(run.startsAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Kết thúc</p>
                    <p className="font-medium">{formatDateTime(run.endsAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Mở đăng ký</p>
                    <p className="font-medium">{formatDateTime(run.enrollmentStartDate)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Đóng đăng ký</p>
                    <p className="font-medium">{formatDateTime(run.enrollmentEndDate)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Sức chứa</p>
                    <p className="font-medium">{run.capacity ?? 'Không giới hạn'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Cập nhật</p>
                    <p className="font-medium">{formatDateTime(run.updatedAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <Card>
                <CardContent className="flex items-start gap-4 p-6">
                  <CalendarDays className="text-muted-foreground mt-1 size-5" />
                  <div>
                    <p className="text-muted-foreground text-sm">Buoi hoc</p>
                    <p className="text-2xl font-semibold">{sessions.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="transition-colors hover:bg-muted/30">
                <CardContent className="flex items-start gap-4 p-6">
                  <BookOpen className="text-muted-foreground mt-1 size-5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-muted-foreground text-sm">Bài học giáo trình</p>
                    <p className="text-2xl font-semibold">{totalSyllabusItems}</p>
                    {course ? (
                      <Link
                        to={ROUTES.courseDetail(course.id, 'syllabus')}
                        className="text-primary mt-1 inline-block text-sm hover:underline"
                      >
                        Mở giáo trình →
                      </Link>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-start gap-4 p-6">
                  <Users className="text-muted-foreground mt-1 size-5" />
                  <div>
                    <p className="text-muted-foreground text-sm">Ghi danh</p>
                    <p className="text-2xl font-semibold">
                      {enrollmentsQuery.data?.totalElement ?? 0}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-start gap-4 p-6">
                  <MessageSquare className="text-muted-foreground mt-1 size-5" />
                  <div>
                    <p className="text-muted-foreground text-sm">Chat lop</p>
                    <p className="text-2xl font-semibold">
                      {conversationQuery.data?.participants.length ?? 0}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {course ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">Giáo trình khóa học</p>
                  <p className="text-muted-foreground text-sm">
                    {syllabusSections.length} chương · {totalSyllabusItems} bài — quản lý ở cấp khóa
                    học, dùng chung mọi đợt.
                  </p>
                </div>
                <Button variant="secondary" size="sm" asChild>
                  <Link to={ROUTES.courseDetail(course.id, 'syllabus')}>Mở giáo trình</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Tabs defaultValue="sessions" className="space-y-4">
            <TabsList className="h-auto flex-wrap justify-start">
              <TabsTrigger value="sessions">Buổi học ({sessions.length})</TabsTrigger>
              <TabsTrigger value="enrollments">
                Ghi danh ({enrollmentsQuery.data?.totalElement ?? 0})
              </TabsTrigger>
              <TabsTrigger value="chat">Chat lớp</TabsTrigger>
            </TabsList>

            <TabsContent value="sessions" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Buổi học live</CardTitle>
                  <Button size="sm" onClick={() => setCreateSessionOpen(true)}>
                    <Plus className="mr-2 size-4" />
                    Thêm buổi học
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {sessions.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Chưa có buổi học nào.</p>
                  ) : (
                    sessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">
                              #{session.sessionNumber} {session.title}
                            </p>
                            <Badge variant="secondary">{session.status}</Badge>
                          </div>
                          <p className="text-muted-foreground text-sm">
                            {session.scheduledAt
                              ? formatDateTime(session.scheduledAt)
                              : 'Chưa lên lịch'}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            {session.durationMinutes != null
                              ? `${session.durationMinutes} phút`
                              : 'Chưa có thời lượng'}
                          </p>
                          {session.description ? (
                            <p className="text-sm">{session.description}</p>
                          ) : null}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditSession(session)}>
                              Sửa buổi học
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (window.confirm('Xóa buổi học này?')) {
                                  deleteSessionMutation.mutate(session.id);
                                }
                              }}
                            >
                              Xóa buổi học
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="enrollments" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Ghi danh</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => setEnrollOpen(true)}>
                      <Plus className="mr-2 size-4" />
                      Ghi danh thu cong
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                      <FileSpreadsheet className="mr-2 size-4" />
                      Import Excel
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {enrollments.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Chua co ghi danh nao.</p>
                  ) : (
                    enrollments.map((enrollment) => (
                      <div
                        key={enrollment.id}
                        className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">
                              {enrollment.userDisplayName ?? enrollment.userEmail ?? 'Nguoi dung'}
                            </p>
                            <Badge>{enrollment.status}</Badge>
                          </div>
                          <p className="text-muted-foreground text-sm">
                            {enrollment.userEmail ?? 'Khong co email'} · {enrollment.role ?? 'STUDENT'}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            Ghi danh luc {formatDateTime(enrollment.enrolledAt)}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewEnrollmentId(enrollment.id)}>
                              Xem chi tiet
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditEnrollment(enrollment);
                                setEditStatus(enrollment.status);
                                setEditRole(enrollment.role ?? 'STUDENT');
                              }}
                            >
                              Sua ghi danh
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (window.confirm('Xoa ghi danh nay?')) {
                                  deleteEnrollmentMutation.mutate(enrollment.id);
                                }
                              }}
                            >
                              Xoa ghi danh
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={enrollmentPage <= 1}
                      onClick={() => setEnrollmentPage((page) => page - 1)}
                    >
                      Trang truoc
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={enrollmentPage >= (enrollmentsQuery.data?.totalPages ?? 1)}
                      onClick={() => setEnrollmentPage((page) => page + 1)}
                    >
                      Trang sau
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="chat" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Chat lop</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-0">
                  {!conversationQuery.data ? (
                    <p className="text-muted-foreground text-sm">
                      Lop nay chua co hoi thoai nhom hoac chua duoc tao.
                    </p>
                  ) : (
                    <>
                      <p className="text-muted-foreground text-sm">
                        {conversationQuery.data.participants.length} thanh vien ·{' '}
                        {conversationQuery.data.status}
                      </p>
                      <div className="space-y-3">
                        {(messagesQuery.data?.data ?? []).map((message) => (
                          <div
                            key={message.id}
                            className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between"
                          >
                            <div className="space-y-1">
                              <p className="font-medium">
                                {message.senderUsername ?? message.senderId}
                              </p>
                              <p className="text-sm">{message.text ?? '(attachment)'}</p>
                              <p className="text-muted-foreground text-xs">
                                {formatDateTime(message.createdAt)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => {
                                if (window.confirm('Xoa tin nhan nay?')) {
                                  deleteMessageMutation.mutate(message.id);
                                }
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={messagePage <= 1}
                          onClick={() => setMessagePage((page) => page - 1)}
                        >
                          Trang truoc
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={messagePage >= (messagesQuery.data?.totalPages ?? 1)}
                          onClick={() => setMessagePage((page) => page + 1)}
                        >
                          Trang sau
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
          <CardContent className="p-6 text-sm text-muted-foreground">
            Dang tai chi tiet dot hoc...
          </CardContent>
        </Card>
      )}

      <Sheet open={runSettingsOpen} onOpenChange={setRunSettingsOpen}>
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[800px] sm:max-w-[800px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Cai dat dot hoc</SheetTitle>
          </SheetHeader>
          {runSettings ? (
            <>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <div className="space-y-2">
                  <Label>Ma lop</Label>
                  <Input
                    value={runSettings.code}
                    onChange={(event) =>
                      setRunSettings((current) => current && { ...current, code: event.target.value })
                    }
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Trang thai</Label>
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
                    <Label>Suc chua</Label>
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
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Bat dau</Label>
                    <DateTimePicker
                      value={runSettings.startsAt}
                      onChange={(startsAt) =>
                        setRunSettings((current) => current && { ...current, startsAt })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ket thuc</Label>
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
                    <Label>Mo dang ky</Label>
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
                    <Label>Dong dang ky</Label>
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
                  Luu
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Sheet open={createSessionOpen} onOpenChange={setCreateSessionOpen}>
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[800px] sm:max-w-[800px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Them buoi hoc</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <Label>Tieu de</Label>
              <Input
                value={sessionForm.title}
                onChange={(event) =>
                  setSessionForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Mo ta</Label>
              <Textarea
                value={sessionForm.description}
                onChange={(event) =>
                  setSessionForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>So buoi</Label>
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
                <Label>Thoi luong (phut)</Label>
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
              <Label>Lich hoc</Label>
              <DateTimePicker
                value={sessionForm.scheduledAt}
                onChange={(scheduledAt) =>
                  setSessionForm((current) => ({ ...current, scheduledAt }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Trang thai</Label>
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
              Luu
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
            <SheetTitle>Sua buoi hoc</SheetTitle>
          </SheetHeader>
          {editSession ? (
            <>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
                <div className="space-y-2">
                  <Label>Tieu de</Label>
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
                  <Label>Mo ta</Label>
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
                    <Label>So buoi</Label>
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
                    <Label>Thoi luong (phut)</Label>
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
                  <Label>Lich hoc</Label>
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
                  <Label>Trang thai</Label>
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
                  Luu
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
            <SheetTitle>Ghi danh thu cong</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            <UserPicker open={enrollOpen} selectedUser={enrollUser} onSelect={setEnrollUser} />
          </div>
          <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end">
            <Button onClick={() => enrollMutation.mutate()} disabled={!enrollUser || enrollMutation.isPending}>
              Ghi danh
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
            <SheetTitle>Import ghi danh bang Excel</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
              Tai file mau, dien du lieu hoc vien, xem truoc ket qua roi moi thuc hien import.
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
              Tai mau Excel
            </Button>
            <div className="space-y-2">
              <Label>Chon file</Label>
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
                    Xem truoc: {importPreview.successCount} OK, {importPreview.failedCount} loi,{' '}
                    {importPreview.skippedCount} bo qua / {importPreview.totalRows} dong
                  </p>
                  {importPreview.failures.length > 0 ? (
                    <div className="space-y-2">
                      {importPreview.failures.slice(0, 10).map((failure) => (
                        <div key={`${failure.rowNumber}-${failure.email ?? 'unknown'}`} className="rounded-md border p-3">
                          <p className="font-medium">Dong {failure.rowNumber}</p>
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
              Xem truoc
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
            <SheetTitle>Chi tiet ghi danh</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4 text-sm">
            {enrollmentDetailQuery.data ? (
              <>
                <div>
                  <p className="text-muted-foreground">Nguoi dung</p>
                  <p className="font-medium">{enrollmentDetailQuery.data.userEmail}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Trang thai</p>
                  <p className="font-medium">{enrollmentDetailQuery.data.status}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vai tro</p>
                  <p className="font-medium">{enrollmentDetailQuery.data.role ?? 'STUDENT'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phuong thuc</p>
                  <p className="font-medium">
                    {enrollmentDetailQuery.data.enrolmentMethod ?? 'Khong xac dinh'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tien do</p>
                  <p className="font-medium">
                    {enrollmentDetailQuery.data.progressPercent ?? '0'}%
                  </p>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Dang tai...</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={Boolean(editEnrollment)} onOpenChange={() => setEditEnrollment(null)}>
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[800px] sm:max-w-[800px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Sua ghi danh</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <Label>Trang thai</Label>
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
              <Label>Vai tro</Label>
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
              Luu
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
