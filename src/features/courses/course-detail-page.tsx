import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Image as ImageIcon,
  Layers,
  MoreHorizontal,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { DateTimePicker } from '@/components/admin/datetime-picker';
import { PageHeader } from '@/components/admin/page-header';
import { RichTextEditor } from '@/components/rich-text-editor';
import { RichTextPreview } from '@/components/rich-text-preview';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { stripHtml } from '@/lib/html';
import { SyllabusEditor } from '@/features/courses/components/syllabus-editor';
import { CreateCourseRunSheet } from '@/features/course-runs/components/create-course-run-sheet';
import { queryKeys } from '@/hooks/query-keys';
import { toLocalDateTimeFromIso } from '@/lib/datetime-local';
import { formatDateTime } from '@/lib/format';
import { ROUTES } from '@/routes/paths';
import { assetsApi } from '@/services/assets/assets-api';
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

type CourseForm = {
  code: string;
  title: string;
  description: string;
  orderIndex: string;
  thumbnailUrl: string;
  thumbnailFile: File | null;
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

const emptyCourseForm: CourseForm = {
  code: '',
  title: '',
  description: '',
  orderIndex: '0',
  thumbnailUrl: '',
  thumbnailFile: null,
};

export function CourseDetailPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const deepLinkItemId = searchParams.get('itemId');
  const activeTab =
    searchParams.get('tab') ?? (deepLinkItemId ? 'syllabus' : 'overview');
  const setActiveTab = (tab: string) => {
    setSearchParams(tab === 'overview' ? {} : { tab }, { replace: true });
  };
  const clearDeepLinkItem = () => {
    if (!searchParams.has('itemId')) {
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete('itemId');
    setSearchParams(next, { replace: true });
  };
  const [createRunOpen, setCreateRunOpen] = useState(false);
  const [editCourseOpen, setEditCourseOpen] = useState(false);
  const [editIapOpen, setEditIapOpen] = useState(false);
  const [editingRun, setEditingRun] = useState<CourseRunResponse | null>(null);
  const [runForm, setRunForm] = useState<RunForm>(emptyRunForm);
  const [courseForm, setCourseForm] = useState<CourseForm>(emptyCourseForm);
  const [appleProductId, setAppleProductId] = useState('');
  const [androidProductId, setAndroidProductId] = useState('');

  const openCreateRun = () => {
    setActiveTab('runs');
    setCreateRunOpen(true);
  };

  const courseQuery = useQuery({
    queryKey: queryKeys.courses.detail(courseId ?? ''),
    queryFn: () => coursesApi.getById(courseId!),
    enabled: Boolean(courseId),
  });

  const runsQuery = useQuery({
    queryKey: queryKeys.courseRuns.list(courseId),
    queryFn: () => courseRunsApi.getPage(0, 100, courseId),
    enabled: Boolean(courseId),
  });

  const course = courseQuery.data;
  const courseRuns = runsQuery.data?.data ?? course?.courseRuns ?? [];
  const syllabusSections = course?.syllabusSections ?? [];
  const totalSyllabusItems = syllabusSections.reduce(
    (count, section) => count + (section.items?.length ?? 0),
    0,
  );
  const totalSessions = courseRuns.reduce(
    (count, run) => count + (run.courseSessions?.length ?? 0),
    0,
  );
  const programDisplayName = course?.programCode?.trim() || 'Chương trình liên kết';

  useEffect(() => {
    if (!course) {
      return;
    }

    setAppleProductId(course.appleProductId ?? '');
    setAndroidProductId(course.androidProductId ?? '');
    setCourseForm({
      code: course.code,
      title: course.title,
      description: course.description ?? '',
      orderIndex: String(course.orderIndex ?? 0),
      thumbnailUrl: course.thumbnailUrl ?? '',
      thumbnailFile: null,
    });
  }, [course]);

  const invalidateCourseQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.courses.detail(courseId ?? ''),
      }),
      queryClient.invalidateQueries({
        queryKey: queryKeys.courseRuns.list(courseId),
      }),
    ]);
  };

  const iapMutation = useMutation({
    mutationFn: () =>
      coursesApi.updateIapMapping(courseId!, {
        appleProductId: appleProductId || null,
        androidProductId: androidProductId || null,
      }),
    onSuccess: async () => {
      toast.success('Đã cập nhật IAP mapping.');
      setEditIapOpen(false);
      await invalidateCourseQueries();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const updateRunMutation = useMutation({
    mutationFn: () =>
      courseRunsApi.update(editingRun!.id, {
        courseId: courseId!,
        code: runForm.code,
        status: runForm.status,
        startsAt: new Date(runForm.startsAt).toISOString(),
        endsAt: new Date(runForm.endsAt).toISOString(),
        timezone: runForm.timezone,
        capacity: runForm.capacity ? Number(runForm.capacity) : null,
        enrollmentStartDate: runForm.enrollmentStartDate
          ? new Date(runForm.enrollmentStartDate).toISOString()
          : null,
        enrollmentEndDate: runForm.enrollmentEndDate
          ? new Date(runForm.enrollmentEndDate).toISOString()
          : null,
      }),
    onSuccess: async () => {
      toast.success('Đã cập nhật đợt học.');
      setEditingRun(null);
      setRunForm(emptyRunForm);
      await invalidateCourseQueries();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteRunMutation = useMutation({
    mutationFn: (runId: string) => courseRunsApi.remove(runId),
    onSuccess: async () => {
      toast.success('Đã xóa đợt học.');
      await invalidateCourseQueries();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const updateCourseMutation = useMutation({
    mutationFn: async () => {
      if (!course) {
        throw new Error('Không tìm thấy khóa học.');
      }

      let thumbnailUrl = courseForm.thumbnailUrl || null;
      if (courseForm.thumbnailFile) {
        const uploaded = await assetsApi.uploadViaPresigned(courseForm.thumbnailFile);
        thumbnailUrl = uploaded.downloadUrl;
      }

      return coursesApi.update(courseId!, {
        programId: course.programId,
        code: courseForm.code,
        title: courseForm.title,
        description: courseForm.description || null,
        thumbnailUrl,
        orderIndex: Number(courseForm.orderIndex) || 0,
        tags: course.tags ?? [],
        appleProductId: appleProductId || null,
        androidProductId: androidProductId || null,
      });
    },
    onSuccess: async () => {
      toast.success('Đã cập nhật khóa học.');
      setEditCourseOpen(false);
      await invalidateCourseQueries();
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
    setRunForm({
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
        id: 'schedule',
        header: 'Lịch học',
        cell: ({ row }) => (
          <div className="space-y-1 text-sm">
            <p>{formatDateTime(row.original.startsAt)}</p>
            <p className="text-muted-foreground">{formatDateTime(row.original.endsAt)}</p>
          </div>
        ),
      },
      {
        id: 'enrollmentWindow',
        header: 'Đăng ký',
        cell: ({ row }) => (
          <div className="space-y-1 text-sm">
            <p>{formatDateTime(row.original.enrollmentStartDate)}</p>
            <p className="text-muted-foreground">
              {formatDateTime(row.original.enrollmentEndDate)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'capacity',
        header: 'Sức chứa',
        cell: ({ row }) => row.original.capacity ?? '—',
      },
      {
        id: 'sessions',
        header: 'Buổi học',
        cell: ({ row }) => row.original.courseSessions?.length ?? 0,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to={ROUTES.courseRunDetail(row.original.id)}>Quản lý lớp</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openEditRun(row.original)}>
                  Sửa đợt học
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    if (window.confirm('Xóa đợt học này?')) {
                      deleteRunMutation.mutate(row.original.id);
                    }
                  }}
                >
                  Xóa đợt học
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [deleteRunMutation],
  );

  if (!courseId) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to={course?.programId ? ROUTES.programCourses(course.programId) : ROUTES.courses}>
          <ArrowLeft className="mr-2 size-4" />
          {course?.programId ? 'Quay lại danh sách khóa học' : 'Quay lại khóa học'}
        </Link>
      </Button>

      <PageHeader
        title={course?.title ?? 'Khóa học'}
        description={stripHtml(course?.description) || 'Quản lý nội dung, đợt học và cấu hình bán khóa học.'}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setEditCourseOpen(true)} disabled={!course}>
              <Pencil className="mr-2 size-4" />
              Sửa khóa học
            </Button>
            <Button
              variant="destructive"
              disabled={deleteCourseMutation.isPending || !course}
              onClick={() => {
                if (window.confirm('Xóa khóa học này?')) {
                  deleteCourseMutation.mutate();
                }
              }}
            >
              <Trash2 className="mr-2 size-4" />
              Xóa
            </Button>
          </div>
        }
      />

      {course ? (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-lg grid-cols-3">
              <TabsTrigger value="overview">Tổng quan</TabsTrigger>
              <TabsTrigger value="syllabus">
                Giáo trình ({totalSyllabusItems})
              </TabsTrigger>
              <TabsTrigger value="runs">Đợt học ({courseRuns.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
                  <div className="flex gap-3">
                    <div className="bg-background flex size-10 shrink-0 items-center justify-center rounded-full border">
                      <BookOpen className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">1. Giáo trình</p>
                      <p className="text-muted-foreground text-xs">
                        Thêm chương & bài học — dùng chung mọi lớp
                      </p>
                      <Button
                        variant="link"
                        className="h-auto px-0 text-xs"
                        onClick={() => setActiveTab('syllabus')}
                      >
                        {totalSyllabusItems > 0 ? 'Sửa giáo trình' : 'Tạo giáo trình'}
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="bg-background flex size-10 shrink-0 items-center justify-center rounded-full border">
                      <CalendarDays className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">2. Đợt học</p>
                      <p className="text-muted-foreground text-xs">Mở lớp, lịch live, ghi danh</p>
                      <Button
                        variant="link"
                        className="h-auto px-0 text-xs"
                        onClick={openCreateRun}
                      >
                        {courseRuns.length > 0 ? 'Thêm đợt học' : 'Tạo đợt học'}
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="bg-background flex size-10 shrink-0 items-center justify-center rounded-full border">
                      <Layers className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">3. Xuất bản</p>
                      <p className="text-muted-foreground text-xs">
                        {totalSyllabusItems} bài · {courseRuns.length} lớp · {totalSessions} buổi
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <Card>
                  <CardContent className="grid gap-6 p-6 md:grid-cols-[220px_1fr]">
                    <div className="bg-muted/30 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border">
                      {course.thumbnailUrl ? (
                        <img
                          src={course.thumbnailUrl}
                          alt={course.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-muted-foreground flex flex-col items-center gap-2 text-sm">
                          <ImageIcon className="size-8" />
                          <span>Chưa có thumbnail</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{course.code}</Badge>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <p className="text-muted-foreground text-sm">Thuộc chương trình</p>
                          {course.programId ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <p className="font-medium">{programDisplayName}</p>
                              <Button variant="outline" size="sm" asChild>
                                <Link to={ROUTES.programCourses(course.programId)}>
                                  Mở danh sách khóa học
                                </Link>
                              </Button>
                            </div>
                          ) : (
                            <p className="font-medium">Chưa gắn với chương trình nào</p>
                          )}
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Thứ tự</p>
                          <p className="font-medium">{course.orderIndex ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Ngày cập nhật</p>
                          <p className="font-medium">{formatDateTime(course.updatedAt)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Chương</p>
                          <p className="font-medium">{syllabusSections.length}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Bài học</p>
                          <p className="font-medium">{totalSyllabusItems}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ShoppingBag className="size-4" />
                      Cấu hình bán khóa học
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <p className="text-sm font-medium">Apple Product ID</p>
                      <p className="text-muted-foreground mt-1 break-all text-sm">
                        {appleProductId || 'Chưa cấu hình'}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <p className="text-sm font-medium">Android Product ID</p>
                      <p className="text-muted-foreground mt-1 break-all text-sm">
                        {androidProductId || 'Chưa cấu hình'}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      disabled={iapMutation.isPending}
                      onClick={() => setEditIapOpen(true)}
                    >
                      Thiết lập IAP mapping
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Mô tả khóa học</CardTitle>
                </CardHeader>
                <CardContent>
                  <RichTextPreview value={course.description} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="syllabus" className="mt-6">
              <SyllabusEditor
                courseId={courseId}
                courseTitle={course.title}
                initialItemId={deepLinkItemId}
                onInitialItemHandled={clearDeepLinkItem}
              />
            </TabsContent>

            <TabsContent value="runs" className="mt-6 space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">Đợt học (lớp chạy)</CardTitle>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Mỗi đợt học có lịch live, ghi danh và chat riêng. Giáo trình dùng chung ở tab
                      Giáo trình.
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setCreateRunOpen(true)}>
                    <Plus className="mr-2 size-4" />
                    Thêm đợt học
                  </Button>
                </CardHeader>
                <CardContent className="pt-0">
                  <DataTable
                    columns={columns}
                    data={courseRuns}
                    isLoading={runsQuery.isLoading || courseQuery.isLoading}
                    emptyMessage="Chưa có đợt học. Tạo đợt học để mở lớp và ghi danh học viên."
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Đang tải chi tiết khóa học...
          </CardContent>
        </Card>
      )}

      <CreateCourseRunSheet
        open={createRunOpen}
        onOpenChange={setCreateRunOpen}
        courseId={courseId}
        onCreated={(created) => {
          void invalidateCourseQueries();
          void navigate(ROUTES.courseRunDetail(created.id));
        }}
      />

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
                onChange={(e) => setCourseForm((prev) => ({ ...prev, code: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Tiêu đề</Label>
              <Input
                value={courseForm.title}
                onChange={(e) => setCourseForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Thumbnail URL</Label>
              <Input
                value={courseForm.thumbnailUrl}
                placeholder="https://..."
                onChange={(e) =>
                  setCourseForm((prev) => ({ ...prev, thumbnailUrl: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Upload thumbnail mới</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setCourseForm((prev) => ({
                    ...prev,
                    thumbnailFile: e.target.files?.[0] ?? null,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Nếu chọn file mới, ảnh sẽ được upload bằng presigned URL và ghi đè thumbnail hiện tại.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Mô tả</Label>
              <RichTextEditor
                value={courseForm.description}
                minHeight="14rem"
                placeholder="Nhập mô tả khóa học với định dạng phong phú..."
                onChange={(description) =>
                  setCourseForm((prev) => ({ ...prev, description }))
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
                  setCourseForm((prev) => ({ ...prev, orderIndex: e.target.value }))
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

      <Sheet open={editIapOpen} onOpenChange={setEditIapOpen}>
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[800px] sm:max-w-[800px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Thiết lập cấu hình bán khóa học</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
              Thiết lập mã sản phẩm cho iOS và Android để map khóa học này với gói thanh toán trong store.
            </div>
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
          </div>
          <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end">
            <Button
              onClick={() => iapMutation.mutate()}
              disabled={iapMutation.isPending}
            >
              Lưu IAP mapping
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={Boolean(editingRun)}
        onOpenChange={() => {
          setEditingRun(null);
          setRunForm(emptyRunForm);
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
                value={runForm.code}
                onChange={(e) => setRunForm((prev) => ({ ...prev, code: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select
                value={runForm.status}
                onValueChange={(value) => setRunForm((prev) => ({ ...prev, status: value }))}
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
                  value={runForm.startsAt}
                  onChange={(startsAt) => setRunForm((prev) => ({ ...prev, startsAt }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Kết thúc</Label>
                <DateTimePicker
                  value={runForm.endsAt}
                  onChange={(endsAt) => setRunForm((prev) => ({ ...prev, endsAt }))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Mở đăng ký</Label>
                <DateTimePicker
                  value={runForm.enrollmentStartDate}
                  onChange={(value) =>
                    setRunForm((prev) => ({ ...prev, enrollmentStartDate: value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Đóng đăng ký</Label>
                <DateTimePicker
                  value={runForm.enrollmentEndDate}
                  onChange={(value) =>
                    setRunForm((prev) => ({ ...prev, enrollmentEndDate: value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sức chứa</Label>
              <Input
                type="number"
                value={runForm.capacity}
                onChange={(e) => setRunForm((prev) => ({ ...prev, capacity: e.target.value }))}
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
