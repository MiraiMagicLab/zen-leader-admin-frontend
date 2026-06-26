import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Image as ImageIcon,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { DateTimePicker } from '@/components/admin/datetime-picker';
import { ConfirmDialog, type PendingConfirm } from '@/components/admin/confirm-dialog';
import { ImageFilePicker } from '@/components/admin/image-file-picker';
import { PageHeader } from '@/components/admin/page-header';
import { TableRowActions, tableActionsColumn } from '@/components/admin/table-row-actions';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ADMIN_PAGE_META } from '@/lib/admin-page-meta';
import { stripHtml } from '@/lib/html';
import { SyllabusEditor } from '@/features/courses/components/syllabus-editor';
import { CreateCourseRunSheet } from '@/features/course-runs/components/create-course-run-sheet';
import { queryKeys } from '@/hooks/query-keys';
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
  paypalPriceUsd: string;
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
  paypalPriceUsd: '',
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
  useAdminPageMeta(ADMIN_PAGE_META.courseDetail);

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
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

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
      toast.success('Mobile purchase IDs updated.');
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
        metadata: mergeCourseRunPricingMetadata(
          editingRun?.metadata,
          runForm.paypalPriceUsd,
        ),
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
      setPendingConfirm(null);
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
      paypalPriceUsd: getPayPalPriceUsd(run.metadata),
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
        id: 'pricing',
        header: 'Pricing',
        cell: ({ row }) => formatCourseRunPricingSummary(row.original.metadata) || 'Free',
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
        ...tableActionsColumn<CourseRunResponse>(),
        cell: ({ row }) => (
          <TableRowActions>
            <Button variant="outline" size="sm" asChild>
              <Link to={ROUTES.courseRunDetail(row.original.id)}>Detail</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => openEditRun(row.original)}>
              Edit
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                setPendingConfirm({
                  title: 'Delete course run?',
                  description: (
                    <>
                      Delete run &quot;{row.original.code}&quot;. This cannot be undone.
                    </>
                  ),
                  action: () => deleteRunMutation.mutate(row.original.id),
                })
              }
            >
              Delete
            </Button>
          </TableRowActions>
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
              onClick={() =>
                setPendingConfirm({
                  title: 'Delete course?',
                  description: (
                    <>
                      Delete &quot;{course?.title}&quot; and all syllabus content. This cannot be
                      undone.
                    </>
                  ),
                  action: () => deleteCourseMutation.mutate(),
                })
              }
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
            <TabsList className="grid h-10 w-full max-w-2xl grid-cols-3">
              <TabsTrigger value="overview" className="h-full">
                Overview
              </TabsTrigger>
              <TabsTrigger value="syllabus" className="h-full">
                Syllabus ({totalSyllabusItems})
              </TabsTrigger>
              <TabsTrigger value="runs" className="h-full">
                Course runs ({courseRuns.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              <Card>
                <CardContent className="p-0">
                  <div className="grid w-full lg:grid-cols-[160px_minmax(240px,1fr)_minmax(0,1.2fr)]">
                    <div className="flex items-center justify-center border-b bg-muted/20 p-4 lg:border-b-0 lg:border-r">
                      <div className="bg-muted/30 aspect-square w-full max-w-[128px] overflow-hidden rounded-md border">
                        {course.thumbnailUrl ? (
                          <img
                            src={course.thumbnailUrl}
                            alt={course.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-1.5 px-2 text-center text-xs">
                            <ImageIcon className="size-7" />
                            <span>No thumbnail</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <dl className="divide-y border-b text-sm lg:border-b-0 lg:border-r">
                      <div className="grid gap-1 px-4 py-3 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                        <dt className="text-muted-foreground">Title</dt>
                        <dd className="font-semibold">{course.title}</dd>
                      </div>
                      <div className="grid gap-1 px-4 py-3 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                        <dt className="text-muted-foreground">Course code</dt>
                        <dd className="font-mono font-medium">{course.code}</dd>
                      </div>
                      <div className="grid gap-1 px-4 py-3 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                        <dt className="text-muted-foreground">Program</dt>
                        <dd className="font-medium">
                          {course.programId ? (
                            <Link
                              to={ROUTES.programCourses(course.programId)}
                              className="text-primary hover:underline"
                            >
                              {programDisplayName}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground font-normal">Not linked</span>
                          )}
                        </dd>
                      </div>
                      <div className="grid gap-1 px-4 py-3 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                        <dt className="text-muted-foreground">Last updated</dt>
                        <dd>{formatDateTime(course.updatedAt)}</dd>
                      </div>
                    </dl>

                    <div className="p-4">
                      <p className="text-muted-foreground mb-3 text-sm font-medium">Description</p>
                      <RichTextPreview value={course.description} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ShoppingBag className="size-4" />
                    Mobile purchase settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 p-6 pt-0">
                  <div className="overflow-hidden rounded-md border">
                    <table className="w-full table-fixed text-sm">
                      <tbody className="divide-y">
                        <tr>
                          <td className="text-muted-foreground w-[40%] px-4 py-3 align-top sm:w-[220px]">
                            Paid course runs
                          </td>
                          <td className="px-4 py-3 font-medium tabular-nums">
                            {courseRuns.filter((run) => hasCourseRunPricing(run.metadata)).length} /{' '}
                            {courseRuns.length}
                          </td>
                        </tr>
                        <tr>
                          <td className="text-muted-foreground px-4 py-3 align-top">
                            Apple Product ID
                          </td>
                          <td className="px-4 py-3 break-all font-medium">
                            {appleProductId || (
                              <span className="text-muted-foreground font-normal">Not set</span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td className="text-muted-foreground px-4 py-3 align-top">
                            Android Product ID
                          </td>
                          <td className="px-4 py-3 break-all font-medium">
                            {androidProductId || (
                              <span className="text-muted-foreground font-normal">Not set</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={iapMutation.isPending}
                    onClick={() => setEditIapOpen(true)}
                  >
                    Edit mobile purchase IDs
                  </Button>
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
            Loading course details…
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
              <ImageFilePicker
                file={courseForm.thumbnailFile}
                existingUrl={courseForm.thumbnailUrl}
                previewAlt={courseForm.title || 'Course thumbnail'}
                helperText="If you select a new image, it will replace the current cover image after saving."
                onFileChange={(thumbnailFile) =>
                  setCourseForm((prev) => ({ ...prev, thumbnailFile }))
                }
              />
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
              This section is only for native in-app purchase mapping. Web and PayPal checkout pricing is configured per course run.
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
              Save mobile purchase IDs
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
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-sm font-medium">Checkout pricing</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Save one global USD price on this run so checkout can create the right payment order.
              </p>
              <div className="mt-4 space-y-2">
                <Label>Global price (USD)</Label>
                <Input
                  inputMode="decimal"
                  placeholder="19.99"
                  value={runForm.paypalPriceUsd}
                  onChange={(e) =>
                    setRunForm((prev) => ({ ...prev, paypalPriceUsd: e.target.value }))
                  }
                />
              </div>
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
        pending={deleteCourseMutation.isPending || deleteRunMutation.isPending}
      />
    </div>
  );
}
