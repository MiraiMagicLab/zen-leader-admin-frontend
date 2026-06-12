import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/admin/page-header';
import { DataTable } from '@/components/data-table/data-table';
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
import { Textarea } from '@/components/ui/textarea';
import { queryKeys } from '@/hooks/query-keys';
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
};

const emptyRunForm: RunForm = {
  code: '',
  status: 'DRAFT',
  startsAt: '',
  endsAt: '',
  timezone: 'Asia/Ho_Chi_Minh',
  capacity: '',
};

function toLocalDatetime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
    level: '',
    category: '',
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
        level: course.level ?? '',
        category: course.category ?? '',
        orderIndex: String(course.orderIndex ?? 0),
      });
    }
  }, [course]);

  const runsQuery = useQuery({
    queryKey: queryKeys.courseRuns.list(courseId),
    queryFn: () => courseRunsApi.getAll(courseId),
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
      }),
    onSuccess: () => {
      toast.success('Đã tạo lớp chạy.');
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
      }),
    onSuccess: () => {
      toast.success('Đã cập nhật lớp chạy.');
      setEditingRun(null);
      setForm(emptyRunForm);
      void queryClient.invalidateQueries({ queryKey: queryKeys.courseRuns.all });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteRunMutation = useMutation({
    mutationFn: (runId: string) => courseRunsApi.remove(runId),
    onSuccess: () => {
      toast.success('Đã xóa lớp chạy.');
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
        level: courseForm.level || null,
        category: courseForm.category || null,
        orderIndex: Number(courseForm.orderIndex) || 0,
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
      startsAt: run.startsAt ? toLocalDatetime(run.startsAt) : '',
      endsAt: run.endsAt ? toLocalDatetime(run.endsAt) : '',
      timezone: run.timezone ?? 'Asia/Ho_Chi_Minh',
      capacity: run.capacity != null ? String(run.capacity) : '',
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
                if (window.confirm('Xóa lớp chạy này?')) {
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
        description={courseQuery.data?.description ?? undefined}
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
              Thêm lớp chạy
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

      <DataTable
        columns={columns}
        data={runsQuery.data ?? courseQuery.data?.courseRuns ?? []}
        isLoading={runsQuery.isLoading || courseQuery.isLoading}
        emptyMessage="Chưa có lớp chạy nào."
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo lớp chạy mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
                  <SelectItem value="CLOSED">CLOSED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Bắt đầu</Label>
                <Input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Kết thúc</Label>
                <Input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
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
          <DialogFooter>
            <Button
              onClick={() => createRunMutation.mutate()}
              disabled={createRunMutation.isPending}
            >
              Tạo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editCourseOpen} onOpenChange={setEditCourseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa khóa học</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
              <Textarea
                value={courseForm.description}
                onChange={(e) =>
                  setCourseForm((f) => ({ ...f, description: e.target.value }))
                }
                rows={3}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cấp độ</Label>
                <Input
                  value={courseForm.level}
                  onChange={(e) =>
                    setCourseForm((f) => ({ ...f, level: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Danh mục</Label>
                <Input
                  value={courseForm.category}
                  onChange={(e) =>
                    setCourseForm((f) => ({ ...f, category: e.target.value }))
                  }
                />
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
          <DialogFooter>
            <Button
              onClick={() => updateCourseMutation.mutate()}
              disabled={updateCourseMutation.isPending}
            >
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingRun)}
        onOpenChange={() => {
          setEditingRun(null);
          setForm(emptyRunForm);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa lớp chạy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
                  <SelectItem value="CLOSED">CLOSED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Bắt đầu</Label>
                <Input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Kết thúc</Label>
                <Input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
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
          <DialogFooter>
            <Button
              onClick={() => updateRunMutation.mutate()}
              disabled={updateRunMutation.isPending}
            >
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
