import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { DateTimePicker } from '@/components/admin/datetime-picker';
import { PageHeader } from '@/components/admin/page-header';
import { UserPicker } from '@/components/admin/user-picker';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { queryKeys } from '@/hooks/query-keys';
import { toLocalDateTimeFromIso } from '@/lib/datetime-local';
import { formatDateTime } from '@/lib/format';
import { ROUTES } from '@/routes/paths';
import { courseRunsApi } from '@/services/course-runs/course-runs-api';
import {
  syllabusSectionsApi,
  enrollmentsApi,
  syllabusItemsApi,
  sessionsApi,
} from '@/services/lms/lms-api';
import { messagingApi } from '@/services/messaging/messaging-api';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import type { EnrollmentImportResponse, EnrollmentResponse, UserResponse } from '@/services/types/domain';

type RunSettingsForm = {
  code: string;
  status: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  capacity: string;
};

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

export function CourseRunDetailPage() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sectionDialog, setSectionDialog] = useState(false);
  const [itemDialog, setItemDialog] = useState<string | null>(null);
  const [sessionDialog, setSessionDialog] = useState(false);
  const [editSession, setEditSession] = useState<{
    id: string;
    form: SessionForm;
  } | null>(null);
  const [enrollDialog, setEnrollDialog] = useState(false);
  const [sectionTitle, setSectionTitle] = useState('');
  const [itemTitle, setItemTitle] = useState('');
  const [itemType, setItemType] = useState('VIDEO');
  const [sessionForm, setSessionForm] = useState<SessionForm>(emptySessionForm);
  const [enrollUser, setEnrollUser] = useState<UserResponse | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [editEnrollment, setEditEnrollment] = useState<EnrollmentResponse | null>(null);
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [editRole, setEditRole] = useState('STUDENT');
  const [messagePage, setMessagePage] = useState(1);
  const [enrollmentPage, setEnrollmentPage] = useState(1);
  const [editSection, setEditSection] = useState<{
    id: string;
    title: string;
    orderIndex: number;
  } | null>(null);
  const [viewEnrollmentId, setViewEnrollmentId] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<EnrollmentImportResponse | null>(null);
  const [runSettings, setRunSettings] = useState<RunSettingsForm | null>(null);

  const runQuery = useQuery({
    queryKey: queryKeys.courseRuns.detail(runId ?? ''),
    queryFn: () => courseRunsApi.getById(runId!),
    enabled: Boolean(runId),
  });

  const sectionsQuery = useQuery({
    queryKey: queryKeys.syllabusSections.list(runQuery.data?.courseId ?? ''),
    queryFn: () => syllabusSectionsApi.getAll(runQuery.data!.courseId),
    enabled: Boolean(runQuery.data?.courseId),
  });

  const sessionsQuery = useQuery({
    queryKey: queryKeys.sessions.list(runId ?? ''),
    queryFn: () => sessionsApi.getAll(runId!),
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
    queryKey: queryKeys.messaging.messages(
      conversationQuery.data?.id ?? '',
      messagePage,
    ),
    queryFn: () =>
      messagingApi.getMessages(conversationQuery.data!.id, messagePage, 50),
    enabled: Boolean(conversationQuery.data?.id),
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) => messagingApi.deleteMessage(messageId),
    onSuccess: () => {
      toast.success('Đã xóa tin nhắn.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.messaging.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const createSectionMutation = useMutation({
    mutationFn: () =>
      syllabusSectionsApi.create({
        courseId: runQuery.data!.courseId,
        title: sectionTitle,
        orderIndex: sectionsQuery.data?.length ?? 0,
      }),
    onSuccess: () => {
      toast.success('Đã thêm chương.');
      setSectionDialog(false);
      setSectionTitle('');
      void queryClient.invalidateQueries({ queryKey: queryKeys.syllabusSections.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.courseRuns.detail(runId!),
      });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const createItemMutation = useMutation({
    mutationFn: (syllabusSectionId: string) =>
      syllabusItemsApi.create({
        syllabusSectionId,
        type: itemType,
        title: itemTitle,
        orderIndex: 0,
      }),
    onSuccess: () => {
      toast.success('Đã thêm mục giáo trình.');
      setItemDialog(null);
      setItemTitle('');
      void queryClient.invalidateQueries({ queryKey: queryKeys.syllabusSections.all });
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
        orderIndex: sessionsQuery.data?.length ?? 0,
        scheduledAt: sessionForm.scheduledAt
          ? new Date(sessionForm.scheduledAt).toISOString()
          : undefined,
        durationMinutes: sessionForm.durationMinutes
          ? Number(sessionForm.durationMinutes)
          : undefined,
        status: sessionForm.status,
      }),
    onSuccess: () => {
      toast.success('Đã thêm buổi học.');
      setSessionDialog(false);
      setSessionForm(emptySessionForm);
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
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
        orderIndex: 0,
        scheduledAt: editSession!.form.scheduledAt
          ? new Date(editSession!.form.scheduledAt).toISOString()
          : undefined,
        durationMinutes: editSession!.form.durationMinutes
          ? Number(editSession!.form.durationMinutes)
          : undefined,
        status: editSession!.form.status,
      }),
    onSuccess: () => {
      toast.success('Đã cập nhật buổi học.');
      setEditSession(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteSessionMutation = useMutation({
    mutationFn: (sessionId: string) => sessionsApi.remove(sessionId),
    onSuccess: () => {
      toast.success('Đã xóa buổi học.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const enrollMutation = useMutation({
    mutationFn: () =>
      enrollmentsApi.manualEnroll({ userId: enrollUser!.id, courseRunId: runId! }),
    onSuccess: () => {
      toast.success('Đã ghi danh học viên.');
      setEnrollDialog(false);
      setEnrollUser(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const importMutation = useMutation({
    mutationFn: () => enrollmentsApi.importByExcel(runId!, importFile!, false),
    onSuccess: (result) => {
      toast.success(
        `Import xong: ${result.successCount} thành công, ${result.failedCount} lỗi.`,
      );
      setImportFile(null);
      setImportPreview(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const updateEnrollmentMutation = useMutation({
    mutationFn: () =>
      enrollmentsApi.update(editEnrollment!.id, {
        status: editStatus as 'ACTIVE' | 'SUSPENDED',
        role: editRole as 'STUDENT' | 'LECTURE' | 'ADMIN' | 'NO_ROLE',
      }),
    onSuccess: () => {
      toast.success('Đã cập nhật ghi danh.');
      setEditEnrollment(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteEnrollmentMutation = useMutation({
    mutationFn: (enrollmentId: string) => enrollmentsApi.remove(enrollmentId),
    onSuccess: () => {
      toast.success('Đã xóa ghi danh.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const updateSectionMutation = useMutation({
    mutationFn: () =>
      syllabusSectionsApi.update(editSection!.id, {
        courseId: runQuery.data!.courseId,
        title: editSection!.title,
        orderIndex: editSection!.orderIndex,
      }),
    onSuccess: () => {
      toast.success('Đã cập nhật chương.');
      setEditSection(null);
      void queryClient.invalidateQueries({ queryKey: queryKeys.syllabusSections.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (sectionId: string) => syllabusSectionsApi.remove(sectionId),
    onSuccess: () => {
      toast.success('Đã xóa chương.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.syllabusSections.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => syllabusItemsApi.remove(itemId),
    onSuccess: () => {
      toast.success('Đã xóa mục giáo trình.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.syllabusSections.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const previewImportMutation = useMutation({
    mutationFn: () => enrollmentsApi.importByExcel(runId!, importFile!, true),
    onSuccess: (result) => {
      setImportPreview(result);
      toast.success('Đã xem trước import.');
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const updateRunMutation = useMutation({
    mutationFn: () => {
      const r = runSettings!;
      return courseRunsApi.update(runId!, {
        courseId: run!.courseId,
        code: r.code,
        status: r.status,
        startsAt: new Date(r.startsAt).toISOString(),
        endsAt: new Date(r.endsAt).toISOString(),
        timezone: r.timezone,
        capacity: r.capacity ? Number(r.capacity) : null,
      });
    },
    onSuccess: () => {
      toast.success('Đã cập nhật lớp chạy.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.courseRuns.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteRunMutation = useMutation({
    mutationFn: () => courseRunsApi.remove(runId!),
    onSuccess: () => {
      toast.success('Đã xóa lớp chạy.');
      navigate(ROUTES.courseRuns);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const run = runQuery.data;

  const openRunSettings = () => {
    if (!run) return;
    setRunSettings({
      code: run.code,
      status: run.status,
      startsAt: run.startsAt ? toLocalDateTimeFromIso(run.startsAt) : '',
      endsAt: run.endsAt ? toLocalDateTimeFromIso(run.endsAt) : '',
      timezone: run.timezone ?? 'Asia/Ho_Chi_Minh',
      capacity: run.capacity != null ? String(run.capacity) : '',
    });
  };

  const openEditSession = (session: { id: string; title: string; description: string | null; sessionNumber: number; scheduledAt: string | null; durationMinutes: number | null; status: string }) => {
    setEditSession({
      id: session.id,
      form: {
        title: session.title,
        description: session.description ?? '',
        sessionNumber: String(session.sessionNumber),
        scheduledAt: session.scheduledAt ? toLocalDateTimeFromIso(session.scheduledAt) : '',
        durationMinutes: session.durationMinutes != null ? String(session.durationMinutes) : '',
        status: session.status,
      },
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to={ROUTES.courseRuns}>
          <ArrowLeft className="mr-2 size-4" />
          Quay lại lớp chạy
        </Link>
      </Button>

      <PageHeader
        title={run?.code ?? 'Lớp chạy'}
        description={
          run
            ? `${formatDateTime(run.startsAt)} → ${formatDateTime(run.endsAt)}`
            : undefined
        }
        actions={
          run ? (
            <div className="flex gap-2">
              <Badge variant="secondary">{run.status}</Badge>
              <Button variant="outline" size="sm" onClick={openRunSettings}>
                Cài đặt lớp
              </Button>
            </div>
          ) : undefined
        }
      />

      <Tabs defaultValue="sessions">
        <TabsList>
          <TabsTrigger value="sessions">
            Buổi học ({sessionsQuery.data?.length ?? run?.sessions?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="syllabus">Giáo trình</TabsTrigger>
          <TabsTrigger value="enrollments">
            Ghi danh ({enrollmentsQuery.data?.totalElement ?? 0})
          </TabsTrigger>
          <TabsTrigger value="settings">Cài đặt</TabsTrigger>
          <TabsTrigger value="chat">Chat lớp</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setSessionDialog(true)}>
              <Plus className="mr-2 size-4" />
              Thêm buổi học
            </Button>
          </div>
          {(sessionsQuery.data ?? run?.sessions ?? []).map((session) => (
            <Card key={session.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">
                    #{session.sessionNumber} — {session.title}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {session.scheduledAt
                      ? formatDateTime(session.scheduledAt)
                      : 'Chưa lên lịch'}
                    {session.durationMinutes != null &&
                      ` · ${session.durationMinutes} phút`}
                    {' · '}{session.status}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditSession(session)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => deleteSessionMutation.mutate(session.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {(sessionsQuery.data ?? run?.sessions ?? []).length === 0 && (
            <p className="text-muted-foreground text-sm">Chưa có buổi học.</p>
          )}
        </TabsContent>

        <TabsContent value="syllabus" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setSectionDialog(true)}>
              <Plus className="mr-2 size-4" />
              Thêm chương
            </Button>
          </div>
          {(sectionsQuery.data ?? []).map((section) => (
            <Card key={section.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{section.title}</CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setEditSection({
                        id: section.id,
                        title: section.title,
                        orderIndex: section.orderIndex,
                      })
                    }
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => deleteSectionMutation.mutate(section.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setItemDialog(section.id)}
                  >
                    <Plus className="mr-2 size-4" />
                    Mục
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {(section.items ?? []).length === 0 ? (
                  <p className="text-muted-foreground text-sm">Chưa có mục giáo trình.</p>
                ) : (
                  section.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-muted-foreground text-xs">{item.type}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={ROUTES.syllabusItemDetail(item.id)}>Sửa</Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deleteItemMutation.mutate(item.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
          {(sectionsQuery.data ?? []).length === 0 && (
            <p className="text-muted-foreground text-sm">Chưa có chương trình dạy.</p>
          )}
        </TabsContent>

        <TabsContent value="enrollments" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setEnrollDialog(true)}>
              <Plus className="mr-2 size-4" />
              Ghi danh thủ công
            </Button>
            <Button variant="outline" asChild>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  void enrollmentsApi.downloadImportTemplate().then((blob) => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'enrollment-template.xlsx';
                    a.click();
                    URL.revokeObjectURL(url);
                  });
                }}
              >
                Tải mẫu Excel
              </a>
            </Button>
            <Input
              type="file"
              accept=".xlsx,.xls"
              className="max-w-xs"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            />
            <Button
              variant="outline"
              disabled={!importFile || previewImportMutation.isPending}
              onClick={() => importFile && previewImportMutation.mutate()}
            >
              <Eye className="mr-2 size-4" />
              Xem trước
            </Button>
            <Button
              variant="secondary"
              disabled={!importFile || importMutation.isPending}
              onClick={() => importFile && importMutation.mutate()}
            >
              <Upload className="mr-2 size-4" />
              Import Excel
            </Button>
          </div>

          {importPreview && (
            <Card>
              <CardContent className="py-4 text-sm">
                Xem trước: {importPreview.successCount} OK, {importPreview.failedCount}{' '}
                lỗi, {importPreview.skippedCount} bỏ qua / {importPreview.totalRows} dòng
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            {(enrollmentsQuery.data?.data ?? []).map((enrollment) => (
              <Card key={enrollment.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">
                      {enrollment.userDisplayName ?? enrollment.userEmail}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {enrollment.userEmail} · {enrollment.role ?? 'STUDENT'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{enrollment.status}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setViewEnrollmentId(enrollment.id)}
                    >
                      <Eye className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditEnrollment(enrollment);
                        setEditStatus(enrollment.status);
                        setEditRole(enrollment.role ?? 'STUDENT');
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => deleteEnrollmentMutation.mutate(enrollment.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={enrollmentPage <= 1}
              onClick={() => setEnrollmentPage((p) => p - 1)}
            >
              Trang trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={
                enrollmentPage >= (enrollmentsQuery.data?.totalPages ?? 1)
              }
              onClick={() => setEnrollmentPage((p) => p + 1)}
            >
              Trang sau
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          {runSettings ? (
            <Card>
              <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Mã lớp</Label>
                  <Input
                    value={runSettings.code}
                    onChange={(e) =>
                      setRunSettings((s) => s && { ...s, code: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Trạng thái</Label>
                  <Select
                    value={runSettings.status}
                    onValueChange={(value) =>
                      setRunSettings((s) => s && { ...s, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">DRAFT</SelectItem>
                      <SelectItem value="OPEN">OPEN</SelectItem>
                      <SelectItem value="CLOSED">CLOSED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sức chứa</Label>
                  <Input
                    type="number"
                    value={runSettings.capacity}
                    onChange={(e) =>
                      setRunSettings((s) => s && { ...s, capacity: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bắt đầu</Label>
                  <DateTimePicker
                    value={runSettings.startsAt}
                    onChange={(startsAt) =>
                      setRunSettings((s) => s && { ...s, startsAt })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kết thúc</Label>
                  <DateTimePicker
                    value={runSettings.endsAt}
                    onChange={(endsAt) =>
                      setRunSettings((s) => s && { ...s, endsAt })
                    }
                  />
                </div>
                <div className="flex gap-2 sm:col-span-2">
                  <Button onClick={() => updateRunMutation.mutate()}>Lưu</Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteRunMutation.mutate()}
                  >
                    Xóa lớp chạy
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Button onClick={openRunSettings}>Mở cài đặt lớp chạy</Button>
          )}
        </TabsContent>

        <TabsContent value="chat" className="space-y-4">
          {!conversationQuery.data ? (
            <p className="text-muted-foreground text-sm">
              Lớp này chưa có hội thoại nhóm hoặc chưa được tạo.
            </p>
          ) : (
            <>
              <p className="text-muted-foreground text-sm">
                {conversationQuery.data.participants.length} thành viên ·{' '}
                {conversationQuery.data.status}
              </p>
              <div className="space-y-2">
                {(messagesQuery.data?.data ?? []).map((msg) => (
                  <Card key={msg.id}>
                    <CardContent className="flex items-start justify-between py-4">
                      <div>
                        <p className="font-medium">{msg.senderUsername ?? msg.senderId}</p>
                        <p className="text-sm">{msg.text ?? '(attachment)'}</p>
                        <p className="text-muted-foreground text-xs">
                          {formatDateTime(msg.createdAt)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => deleteMessageMutation.mutate(msg.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={messagePage <= 1}
                  onClick={() => setMessagePage((p) => p - 1)}
                >
                  Trang trước
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    messagePage >= (messagesQuery.data?.totalPages ?? 1)
                  }
                  onClick={() => setMessagePage((p) => p + 1)}
                >
                  Trang sau
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={sessionDialog} onOpenChange={setSessionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm buổi học</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tiêu đề</Label>
              <Input
                value={sessionForm.title}
                onChange={(e) =>
                  setSessionForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <Input
                value={sessionForm.description}
                onChange={(e) =>
                  setSessionForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Số buổi</Label>
                <Input
                  type="number"
                  value={sessionForm.sessionNumber}
                  onChange={(e) =>
                    setSessionForm((f) => ({
                      ...f,
                      sessionNumber: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Thời lượng (phút)</Label>
                <Input
                  type="number"
                  value={sessionForm.durationMinutes}
                  onChange={(e) =>
                    setSessionForm((f) => ({
                      ...f,
                      durationMinutes: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Lịch học</Label>
              <DateTimePicker
                value={sessionForm.scheduledAt}
                onChange={(scheduledAt) =>
                  setSessionForm((f) => ({ ...f, scheduledAt }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select
                value={sessionForm.status}
                onValueChange={(value) =>
                  setSessionForm((f) => ({ ...f, status: value }))
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
          <DialogFooter>
            <Button onClick={() => createSessionMutation.mutate()}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editSession)} onOpenChange={() => setEditSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa buổi học</DialogTitle>
          </DialogHeader>
          {editSession && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tiêu đề</Label>
                <Input
                  value={editSession.form.title}
                  onChange={(e) =>
                    setEditSession((s) =>
                      s && { ...s, form: { ...s.form, title: e.target.value } },
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Input
                  value={editSession.form.description}
                  onChange={(e) =>
                    setEditSession((s) =>
                      s && {
                        ...s,
                        form: { ...s.form, description: e.target.value },
                      },
                    )
                  }
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Số buổi</Label>
                  <Input
                    type="number"
                    value={editSession.form.sessionNumber}
                    onChange={(e) =>
                      setEditSession((s) =>
                        s && {
                          ...s,
                          form: { ...s.form, sessionNumber: e.target.value },
                        },
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Thời lượng (phút)</Label>
                  <Input
                    type="number"
                    value={editSession.form.durationMinutes}
                    onChange={(e) =>
                      setEditSession((s) =>
                        s && {
                          ...s,
                          form: { ...s.form, durationMinutes: e.target.value },
                        },
                      )
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Lịch học</Label>
                <DateTimePicker
                  value={editSession.form.scheduledAt}
                  onChange={(scheduledAt) =>
                    setEditSession((s) =>
                      s && { ...s, form: { ...s.form, scheduledAt } },
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Trạng thái</Label>
                <Select
                  value={editSession.form.status}
                  onValueChange={(value) =>
                    setEditSession((s) =>
                      s && { ...s, form: { ...s.form, status: value } },
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
          )}
          <DialogFooter>
            <Button onClick={() => updateSessionMutation.mutate()}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sectionDialog} onOpenChange={setSectionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm chương</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Tiêu đề</Label>
            <Input value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} />
          </div>
          <DialogFooter>
            <Button onClick={() => createSectionMutation.mutate()}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(itemDialog)} onOpenChange={() => setItemDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm mục giáo trình</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tiêu đề</Label>
              <Input value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Loại</Label>
              <Select value={itemType} onValueChange={setItemType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIDEO">VIDEO</SelectItem>
                  <SelectItem value="ARTICLE">ARTICLE</SelectItem>
                  <SelectItem value="QUIZ">QUIZ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => itemDialog && createItemMutation.mutate(itemDialog)}
            >
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={enrollDialog}
        onOpenChange={(open) => {
          setEnrollDialog(open);
          if (!open) setEnrollUser(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ghi danh thủ công</DialogTitle>
          </DialogHeader>
          <UserPicker
            open={enrollDialog}
            selectedUser={enrollUser}
            onSelect={setEnrollUser}
          />
          <DialogFooter>
            <Button
              onClick={() => enrollMutation.mutate()}
              disabled={!enrollUser || enrollMutation.isPending}
            >
              Ghi danh
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editSection)} onOpenChange={() => setEditSection(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa chương</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Tiêu đề</Label>
            <Input
              value={editSection?.title ?? ''}
              onChange={(e) =>
                setEditSection((c) => c && { ...c, title: e.target.value })
              }
            />
          </div>
          <DialogFooter>
            <Button onClick={() => updateSectionMutation.mutate()}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(viewEnrollmentId)} onOpenChange={() => setViewEnrollmentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chi tiết ghi danh</DialogTitle>
          </DialogHeader>
          {enrollmentDetailQuery.data ? (
            <div className="space-y-2 text-sm">
              <p>ID: {enrollmentDetailQuery.data.id}</p>
              <p>User: {enrollmentDetailQuery.data.userEmail}</p>
              <p>Status: {enrollmentDetailQuery.data.status}</p>
              <p>Role: {enrollmentDetailQuery.data.role}</p>
              <p>Method: {enrollmentDetailQuery.data.enrolmentMethod}</p>
              <p>
                Progress: {enrollmentDetailQuery.data.progressPercent ?? '—'}%
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Đang tải...</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editEnrollment)} onOpenChange={() => setEditEnrollment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa ghi danh</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Vai trò</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">STUDENT</SelectItem>
                  <SelectItem value="LECTURE">LECTURE</SelectItem>
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                  <SelectItem value="NO_ROLE">NO_ROLE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => updateEnrollmentMutation.mutate()}>Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
