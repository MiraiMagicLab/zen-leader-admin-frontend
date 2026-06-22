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
  const programDisplayName = course?.programCode?.trim() || 'Linked program';

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
      toast.success('IAP mapping updated.');
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
      toast.success('Course run updated.');
      setEditingRun(null);
      setRunForm(emptyRunForm);
      await invalidateCourseQueries();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteRunMutation = useMutation({
    mutationFn: (runId: string) => courseRunsApi.remove(runId),
    onSuccess: async () => {
      toast.success('Course run deleted.');
      await invalidateCourseQueries();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const updateCourseMutation = useMutation({
    mutationFn: async () => {
      if (!course) {
        throw new Error('Course not found.');
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
      toast.success('Course updated.');
      setEditCourseOpen(false);
      await invalidateCourseQueries();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const deleteCourseMutation = useMutation({
    mutationFn: () => coursesApi.remove(courseId!),
    onSuccess: () => {
      toast.success('Course deleted.');
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
      { accessorKey: 'code', header: 'Class code' },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <Badge variant="secondary">{row.original.status}</Badge>,
      },
      {
        id: 'schedule',
        header: 'Schedule',
        cell: ({ row }) => (
          <div className="space-y-1 text-sm">
            <p>{formatDateTime(row.original.startsAt)}</p>
            <p className="text-muted-foreground">{formatDateTime(row.original.endsAt)}</p>
          </div>
        ),
      },
      {
        id: 'enrollmentWindow',
        header: 'Enrollment',
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
        header: 'Capacity',
        cell: ({ row }) => row.original.capacity ?? '—',
      },
      {
        id: 'sessions',
        header: 'Sessions',
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
                  <Link to={ROUTES.courseRunDetail(row.original.id)}>Manage classes</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openEditRun(row.original)}>
                  Edit course run
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    if (window.confirm('Delete this course run?')) {
                      deleteRunMutation.mutate(row.original.id);
                    }
                  }}
                >
                   Delete course run
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
          {course?.programId ? 'Back to courses' : 'Back to course'}
        </Link>
      </Button>

      <PageHeader
        title={course?.title ?? 'Course'}
        description={stripHtml(course?.description) || 'Manage content, course runs, and sales configuration.'}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setEditCourseOpen(true)} disabled={!course}>
              <Pencil className="mr-2 size-4" />
              Edit course
            </Button>
            <Button
              variant="destructive"
              disabled={deleteCourseMutation.isPending || !course}
              onClick={() => {
                if (window.confirm('Delete this course?')) {
                  deleteCourseMutation.mutate();
                }
              }}
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
          </div>
        }
      />

      {course ? (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-lg grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="syllabus">
                Syllabus ({totalSyllabusItems})
              </TabsTrigger>
              <TabsTrigger value="runs">Course runs ({courseRuns.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
                  <div className="flex gap-3">
                    <div className="bg-background flex size-10 shrink-0 items-center justify-center rounded-full border">
                      <BookOpen className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">1. Syllabus</p>
                      <p className="text-muted-foreground text-xs">
                        Add chapters & lessons — shared across all runs
                      </p>
                      <Button
                        variant="link"
                        className="h-auto px-0 text-xs"
                        onClick={() => setActiveTab('syllabus')}
                      >
                        {totalSyllabusItems > 0 ? 'Edit syllabus' : 'Create syllabus'}
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="bg-background flex size-10 shrink-0 items-center justify-center rounded-full border">
                      <CalendarDays className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">2. Course runs</p>
                      <p className="text-muted-foreground text-xs">Open classes, live schedule, enrollment</p>
                      <Button
                        variant="link"
                        className="h-auto px-0 text-xs"
                        onClick={openCreateRun}
                      >
                        {courseRuns.length > 0 ? 'Add course run' : 'Create course run'}
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="bg-background flex size-10 shrink-0 items-center justify-center rounded-full border">
                      <Layers className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">3. Publish</p>
                      <p className="text-muted-foreground text-xs">
                        {totalSyllabusItems} lessons · {courseRuns.length} classes · {totalSessions} sessions
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
                          <span>No thumbnail yet</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{course.code}</Badge>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <p className="text-muted-foreground text-sm">Belongs to program</p>
                          {course.programId ? (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <p className="font-medium">{programDisplayName}</p>
                              <Button variant="outline" size="sm" asChild>
                                <Link to={ROUTES.programCourses(course.programId)}>
                                  Open course list
                                </Link>
                              </Button>
                            </div>
                          ) : (
                            <p className="font-medium">Not linked to any program</p>
                          )}
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Order</p>
                          <p className="font-medium">{course.orderIndex ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Last updated</p>
                          <p className="font-medium">{formatDateTime(course.updatedAt)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Chapters</p>
                          <p className="font-medium">{syllabusSections.length}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">Lessons</p>
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
                      Course sales config
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <p className="text-sm font-medium">Apple Product ID</p>
                      <p className="text-muted-foreground mt-1 break-all text-sm">
                        {appleProductId || 'Not configured'}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-4">
                      <p className="text-sm font-medium">Android Product ID</p>
                      <p className="text-muted-foreground mt-1 break-all text-sm">
                        {androidProductId || 'Not configured'}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      disabled={iapMutation.isPending}
                      onClick={() => setEditIapOpen(true)}
                    >
                      Set up IAP mapping
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Course description</CardTitle>
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
                    <CardTitle className="text-base">Course runs</CardTitle>
                    <p className="text-muted-foreground mt-1 text-sm">
                      Each course run has its own live schedule, enrollment, and chat. Syllabus is shared.
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setCreateRunOpen(true)}>
                    <Plus className="mr-2 size-4" />
                    Add course run
                  </Button>
                </CardHeader>
                <CardContent className="pt-0">
                  <DataTable
                    columns={columns}
                    data={courseRuns}
                    isLoading={runsQuery.isLoading || courseQuery.isLoading}
                    emptyMessage="No course runs yet. Create one to open classes and enroll students."
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Loading course details...
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
            <SheetTitle>Edit course</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={courseForm.code}
                onChange={(e) => setCourseForm((prev) => ({ ...prev, code: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
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
              <Label>Upload new thumbnail</Label>
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
                If a new file is selected, it will be uploaded via presigned URL and overwrite the current thumbnail.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <RichTextEditor
                value={courseForm.description}
                minHeight="14rem"
                placeholder="Enter course description with rich formatting..."
                onChange={(description) =>
                  setCourseForm((prev) => ({ ...prev, description }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Preview description</Label>
              <div className="rounded-md border bg-muted/20 p-4">
                <RichTextPreview value={courseForm.description} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
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
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={editIapOpen} onOpenChange={setEditIapOpen}>
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[800px] sm:max-w-[800px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Set up course sales configuration</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
              Set up product IDs for iOS and Android to map this course with store payment packages.
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
              Save IAP mapping
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
            <SheetTitle>Edit course run</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <Label>Class code</Label>
              <Input
                value={runForm.code}
                onChange={(e) => setRunForm((prev) => ({ ...prev, code: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
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
                <Label>Start</Label>
                <DateTimePicker
                  value={runForm.startsAt}
                  onChange={(startsAt) => setRunForm((prev) => ({ ...prev, startsAt }))}
                />
              </div>
              <div className="space-y-2">
                <Label>End</Label>
                <DateTimePicker
                  value={runForm.endsAt}
                  onChange={(endsAt) => setRunForm((prev) => ({ ...prev, endsAt }))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Open enrollment</Label>
                <DateTimePicker
                  value={runForm.enrollmentStartDate}
                  onChange={(value) =>
                    setRunForm((prev) => ({ ...prev, enrollmentStartDate: value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Close enrollment</Label>
                <DateTimePicker
                  value={runForm.enrollmentEndDate}
                  onChange={(value) =>
                    setRunForm((prev) => ({ ...prev, enrollmentEndDate: value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Capacity</Label>
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
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
