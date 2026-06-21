import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { DateTimePicker } from '@/components/admin/datetime-picker';
import { PageHeader } from '@/components/admin/page-header';
import { RichTextEditor } from '@/components/rich-text-editor';
import { RichTextPreview } from '@/components/rich-text-preview';
import { DataTable } from '@/components/data-table/data-table';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { stripHtml } from '@/lib/html';
import { queryKeys } from '@/hooks/query-keys';
import { toLocalDateTimeFromIso } from '@/lib/datetime-local';
import { formatDateTime } from '@/lib/format';
import { ROUTES } from '@/routes/paths';
import { courseRunsApi } from '@/services/course-runs/course-runs-api';
import { coursesApi } from '@/services/courses/courses-api';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import type { CourseRunResponse } from '@/services/types/domain';

type RunForm = {
  code: string;
  status: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  capacity: string;
  enrollmentStartDate: string;
  enrollmentEndDate: string;
};

const emptyRunForm: RunForm = {
  code: '',
  status: 'DRAFT',
  startsAt: '',
  endsAt: '',
  timezone: 'Asia/Ho_Chi_Minh',
  capacity: '',
  enrollmentStartDate: '',
  enrollmentEndDate: '',
};

export function CourseDetailPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [editingRun, setEditingRun] = useState<CourseRunResponse | null>(null);
  const [form, setForm] = useState<RunForm>(emptyRunForm);
  const [courseForm, setCourseForm] = useState({
    code: '',
    title: '',
    description: '',
    orderIndex: '0',
  });
  const [appleProductId, setAppleProductId] = useState('');
  const [androidProductId, setAndroidProductId] = useState('');

  const courseQuery = useQuery({
    queryKey: queryKeys.courses.detail(courseId ?? ''),
    queryFn: () => coursesApi.getById(courseId!),
    enabled: Boolean(courseId),
  });

  const iapMutation = useMutation({
    mutationFn: () =>
      coursesApi.updateIapMapping(courseId!, {
        appleProductId: appleProductId || null,
        androidProductId: androidProductId || null,
      }),
    onSuccess: () => {
      toast.success('Đã cập nhật IAP mapping.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const course = courseQuery.data;

  useEffect(() => {
    if (course) {
      setAppleProductId(course.appleProductId ?? '');
      setAndroidProductId(course.androidProductId ?? '');
      setCourseForm({
        code: course.code,
        title: course.title,
        description: course.description ?? '',
        orderIndex: String(course.orderIndex ?? 0),
      });
    }
  }, [course]);

  const runsQuery = useQuery({
    queryKey: queryKeys.courseRuns.list(courseId),
    queryFn: () => courseRunsApi.getPage(0, 100, courseId),
    enabled: Boolean(courseId),
  });

  const createRunMutation = useMutation({
    mutationFn: () =>
      courseRunsApi.create({
        courseId: courseId!,
        code: form.code,
        status: form.status,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        timezone: form.timezone,
        capacity: form.capacity ? Number(form.capacity) : null,
        enrollmentStartDate: form.enrollmentStartDate
          ? new Date(form.enrollmentStartDate).toISOString()
          : null,
        enrollmentEndDate: form.enrollmentEndDate
          ? new Date(form.enrollmentEndDate).toISOString()
          : null,
      }),
    onSuccess: () => {
      toast.success('Đã tạo đợt học.');
      setDialogOpen(false);
      setForm(emptyRunForm);
      void queryClient.invalidateQueries({ queryKey: queryKeys.courseRuns.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const updateRunMutation = useMutation({
    mutationFn: () =>
      courseRunsApi.update(editingRun!.id, {
        courseId: courseId!,
        code: form.code,
        status: form.status,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        timezone: form.timezone,
        capacity: form.capacity ? Number(form.capacity) : null,
        enrollmentStartDate: form.enrollmentStartDate
          ? new Date(form.enrollmentStartDate).toISOString()
          : null,
        enrollmentEndDate: form.enrollmentEndDate
          ? new Date(form.enrollmentEndDate).toISOString()
          : null,
      }),
    onSuccess: () => {
      toast.success('Đã cập nhật đợt học.');
      setEditingRun(null);
      setForm(emptyRunForm);
      void queryClient.invalidateQueries({ queryKey: queryKeys.courseRuns.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteRunMutation = useMutation({
    mutationFn: (runId: string) => courseRunsApi.remove(runId),
    onSuccess: () => {
      toast.success('Đã xóa đợt học.');
      void queryClient.invalidateQueries({ queryKey: queryKeys.courseRuns.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const updateCourseMutation = useMutation({
    mutationFn: () =>
      coursesApi.update(courseId!, {
        programId: course!.programId,
        code: courseForm.code,
        title: courseForm.title,
        description: courseForm.description || null,
        thumbnailUrl: course!.thumbnailUrl ?? null,
        orderIndex: Number(courseForm.orderIndex) || 0,
        tags: course!.tags ?? [],
        appleProductId: appleProductId || null,
        androidProductId: androidProductId || null,
      }),
    onSuccess: () => {
      toast.success('Đã cập nhật khóa học.');
      setEditCourseOpen(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.courses.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteCourseMutation = useMutation({
    mutationFn: () => coursesApi.remove(courseId!),
    onSuccess: () => {
      toast.success('Đã xóa khóa học.');
      void navigate(ROUTES.courses);
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const openEditRun = (run: CourseRunResponse) => {
    setEditingRun(run);
    setForm({
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
    });
  };

  const columns = useMemo<ColumnDef<CourseRunResponse>[]>(
    () => [
      { accessorKey: 'code', header: 'Mã lớp' },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => <Badge variant="secondary">{row.original.status}</Badge>,
      },
      {
        accessorKey: 'startsAt',
        header: 'Bắt đầu',
        cell: ({ row }) => formatDateTime(row.original.startsAt),
      },
      {
        accessorKey: 'endsAt',
        header: 'Kết thúc',
        cell: ({ row }) => formatDateTime(row.original.endsAt),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button variant="outline" size="sm" asChild>
              <Link to={ROUTES.courseRunDetail(row.original.id)}>Quản lý</Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEditRun(row.original)}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              onClick={() => {
                if (window.confirm('Xóa đợt học này?')) {
                  deleteRunMutation.mutate(row.original.id);
                }
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ),
      },
    ],
    [deleteRunMutation],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to={ROUTES.courses}>
          <ArrowLeft className="mr-2 size-4" />
          Quay lại khóa học
        </Link>
      </Button>

      <PageHeader
        title={courseQuery.data?.title ?? 'Khóa học'}
        description={stripHtml(courseQuery.data?.description) || undefined}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditCourseOpen(true)}>
              <Pencil className="mr-2 size-4" />
              Sửa khóa học
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (window.confirm('Xóa khóa học này?')) {
                  deleteCourseMutation.mutate();
                }
              }}
            >
              <Trash2 className="mr-2 size-4" />
              Xóa
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 size-4" />
              Thêm đợt học
            </Button>
          </div>
        }
      />

      {course && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">IAP Product Mapping</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Apple Product ID</Label>
              <Input
                value={appleProductId}
                onChange={(e) => setAppleProductId(e.target.value)}
                placeholder="com.zenleader.course.xxx"
              />
            </div>
            <div className="space-y-2">
              <Label>Android Product ID</Label>
              <Input
                value={androidProductId}
                onChange={(e) => setAndroidProductId(e.target.value)}
                placeholder="course_xxx"
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                variant="secondary"
                disabled={iapMutation.isPending}
                onClick={() => iapMutation.mutate()}
              >
                Lưu IAP mapping
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {course && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mô tả khóa học</CardTitle>
          </CardHeader>
          <CardContent>
            <RichTextPreview value={course.description} />
          </CardContent>
        </Card>
      )}

      <DataTable
        columns={columns}
        data={runsQuery.data?.data ?? courseQuery.data?.courseRuns ?? []}
        isLoading={runsQuery.isLoading || courseQuery.isLoading}
        emptyMessage="Chưa có đợt học nào."
      />

      <Sheet open={dialogOpen} onOpenChange={setDialogOpen}>
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[800px] sm:max-w-[800px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Tạo đợt học mới</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <Label>Mã lớp</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select
                value={form.status}
                onValueChange={(value) => setForm((f) => ({ ...f, status: value }))}
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Bắt đầu</Label>
                <DateTimePicker
                  value={form.startsAt}
                  onChange={(startsAt) => setForm((f) => ({ ...f, startsAt }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Kết thúc</Label>
                <DateTimePicker
                  value={form.endsAt}
                  onChange={(endsAt) => setForm((f) => ({ ...f, endsAt }))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Mở đăng ký</Label>
                <DateTimePicker
                  value={form.enrollmentStartDate}
                  onChange={(v) => setForm((f) => ({ ...f, enrollmentStartDate: v }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Đóng đăng ký</Label>
                <DateTimePicker
                  value={form.enrollmentEndDate}
                  onChange={(v) => setForm((f) => ({ ...f, enrollmentEndDate: v }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sức chứa</Label>
              <Input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
              />
            </div>
          </div>
          <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              onClick={() => createRunMutation.mutate()}
              disabled={createRunMutation.isPending}
            >
              Tạo
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={editCourseOpen} onOpenChange={setEditCourseOpen}>
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[800px] sm:max-w-[800px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Sửa khóa học</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <Label>Mã</Label>
              <Input
                value={courseForm.code}
                onChange={(e) =>
                  setCourseForm((f) => ({ ...f, code: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Tiêu đề</Label>
              <Input
                value={courseForm.title}
                onChange={(e) =>
                  setCourseForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <RichTextEditor
                value={courseForm.description}
                minHeight="14rem"
                placeholder="Nhập mô tả khóa học với định dạng phong phú…"
                onChange={(description) =>
                  setCourseForm((f) => ({ ...f, description }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Xem trước mô tả</Label>
              <div className="rounded-md border bg-muted/20 p-4">
                <RichTextPreview value={courseForm.description} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Thứ tự</Label>
              <Input
                type="number"
                value={courseForm.orderIndex}
                onChange={(e) =>
                  setCourseForm((f) => ({ ...f, orderIndex: e.target.value }))
                }
              />
            </div>
          </div>
          <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              onClick={() => updateCourseMutation.mutate()}
              disabled={updateCourseMutation.isPending}
            >
              Lưu
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={Boolean(editingRun)}
        onOpenChange={() => {
          setEditingRun(null);
          setForm(emptyRunForm);
        }}
      >
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[800px] sm:max-w-[800px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Sửa đợt học</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <Label>Mã lớp</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select
                value={form.status}
                onValueChange={(value) => setForm((f) => ({ ...f, status: value }))}
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Bắt đầu</Label>
                <DateTimePicker
                  value={form.startsAt}
                  onChange={(startsAt) => setForm((f) => ({ ...f, startsAt }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Kết thúc</Label>
                <DateTimePicker
                  value={form.endsAt}
                  onChange={(endsAt) => setForm((f) => ({ ...f, endsAt }))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Mở đăng ký</Label>
                <DateTimePicker
                  value={form.enrollmentStartDate}
                  onChange={(v) => setForm((f) => ({ ...f, enrollmentStartDate: v }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Đóng đăng ký</Label>
                <DateTimePicker
                  value={form.enrollmentEndDate}
                  onChange={(v) => setForm((f) => ({ ...f, enrollmentEndDate: v }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sức chứa</Label>
              <Input
                type="number"
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
              />
            </div>
          </div>
          <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              onClick={() => updateRunMutation.mutate()}
              disabled={updateRunMutation.isPending}
            >
              Lưu
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
