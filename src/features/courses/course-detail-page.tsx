import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Image as ImageIcon,
  Info,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react';
import { adminToast as toast } from '@/lib/admin-toast';

import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { AdminDetailSkeleton, AdminEmptyState, AdminQueryError } from '@/components/admin/admin-query-state';
import { DateTimePicker } from '@/components/admin/datetime-picker';
import { ConfirmDialog, type PendingConfirm } from '@/components/admin/confirm-dialog';
import { ImageFilePicker } from '@/components/admin/image-file-picker';
import { TableRowActionMenu } from '@/components/admin/table-row-actions';
import { RichTextEditor } from '@/components/rich-text-editor';
import { RichTextPreview } from '@/components/rich-text-preview';
import { Button } from '@/components/ui/button';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AdminPageTabs,
  AdminTabsContent,
  AdminTabsList,
  AdminTabsTrigger,
} from '@/components/admin/admin-tabs';
import { ADMIN_PAGE_META } from '@/lib/admin-page-meta';
import { SyllabusEditor } from '@/features/courses/components/syllabus-editor';
import { CreateCourseRunSheet } from '@/features/course-runs/components/create-course-run-sheet';
import { CourseRunCard } from '@/features/courses/components/course-run-card';
import { WorkspaceSection } from '@/features/courses/components/workspace-section';
import {
  computeCourseCompletion,
  type CompletionAnchor,
} from '@/features/courses/lib/course-completion';
import { queryKeys } from '@/hooks/query-keys';
import {
  getPayPalPriceUsd,
  hasCourseRunPricing,
  mergeCourseRunPricingMetadata,
} from '@/lib/course-run-pricing';
import { confirmDiscard } from '@/lib/confirm-discard';
import { useBeforeUnload } from '@/hooks/use-beforeunload';
import { toLocalDateTimeFromIso } from '@/lib/datetime-local';
import { formatDateTime } from '@/lib/format';
import { useAdminPageMeta } from '@/lib/page-meta';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/routes/paths';
import { assetsApi } from '@/services/assets/assets-api';
import { courseRunsApi } from '@/services/course-runs/course-runs-api';
import { coursesApi } from '@/services/courses/courses-api';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import type { CourseRunResponse } from '@/services/types/domain';

const WORKSPACE_SECTIONS: Array<{ id: CompletionAnchor; label: string }> = [
  { id: 'info', label: 'Information' },
  { id: 'syllabus', label: 'Syllabus' },
  { id: 'runs', label: 'Classes' },
];

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

const LEGACY_TAB_ANCHOR: Record<string, CompletionAnchor> = {
  overview: 'info',
  syllabus: 'syllabus',
  runs: 'runs',
};

function resolveInitialTab(
  section: string | null,
  tab: string | null,
  hasItem: boolean,
): CompletionAnchor {
  if (section === 'info' || section === 'syllabus' || section === 'runs') {
    return section;
  }
  if (tab && LEGACY_TAB_ANCHOR[tab]) {
    return LEGACY_TAB_ANCHOR[tab];
  }
  return hasItem ? 'syllabus' : 'info';
}

export function CourseDetailPage() {
  useAdminPageMeta(ADMIN_PAGE_META.courseDetail);

  const { courseId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const deepLinkItemId = searchParams.get('itemId');
  const clearDeepLinkItem = () => {
    if (!searchParams.has('itemId')) {
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete('itemId');
    setSearchParams(next, { replace: true });
  };

  const [activeTab, setActiveTabState] = useState<CompletionAnchor>(() =>
    resolveInitialTab(searchParams.get('section'), searchParams.get('tab'), Boolean(deepLinkItemId)),
  );
  const selectTab = (tab: CompletionAnchor) => {
    setActiveTabState(tab);
    const next = new URLSearchParams(searchParams);
    next.delete('tab');
    if (tab === 'info') {
      next.delete('section');
    } else {
      next.set('section', tab);
    }
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

  const course = courseQuery.data;
  const courseRuns = course?.courseRuns ?? [];
  const completion = computeCourseCompletion(course);
  const programDisplayName = course?.programCode?.trim() || 'Program';
  const paidRunCount = courseRuns.filter((run) => hasCourseRunPricing(run.metadata)).length;

  const syncedCourseIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!course || syncedCourseIdRef.current === course.id) {
      return;
    }
    syncedCourseIdRef.current = course.id;
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

  const totalSyllabusItems = (course?.syllabusSections ?? []).reduce(
    (count, section) => count + (section.items?.length ?? 0),
    0,
  );

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
      toast.success('In-app purchase IDs updated.');
      setEditIapOpen(false);
      await invalidateCourseQueries();
    },
    onError: (error) => toast.error(error),
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
        metadata: mergeCourseRunPricingMetadata(editingRun?.metadata, runForm.paypalPriceUsd),
        capacity: runForm.capacity ? Number(runForm.capacity) : null,
        enrollmentStartDate: runForm.enrollmentStartDate
          ? new Date(runForm.enrollmentStartDate).toISOString()
          : null,
        enrollmentEndDate: runForm.enrollmentEndDate
          ? new Date(runForm.enrollmentEndDate).toISOString()
          : null,
      }),
    onSuccess: async () => {
      toast.success('Class updated.');
      setEditingRun(null);
      setRunForm(emptyRunForm);
      await invalidateCourseQueries();
    },
    onError: (error) => toast.error(error),
  });

  const deleteRunMutation = useMutation({
    mutationFn: (runId: string) => courseRunsApi.remove(runId),
    onSuccess: async () => {
      toast.success('Class deleted.');
      setPendingConfirm(null);
      await invalidateCourseQueries();
    },
    onError: (error) => toast.error(error),
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
    onError: (error) => toast.error(error),
  });

  const deleteCourseMutation = useMutation({
    mutationFn: () => coursesApi.remove(courseId!),
    onSuccess: () => {
      toast.success('Course deleted.');
      void navigate(ROUTES.courses);
    },
    onError: (error) => toast.error(error),
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

  const confirmDeleteCourse = () =>
    setPendingConfirm({
      title: 'Delete course?',
      description: (
        <>Delete &quot;{course?.title}&quot; and its entire syllabus. This cannot be undone.</>
      ),
      action: () => deleteCourseMutation.mutate(),
    });

  const confirmDeleteRun = (run: CourseRunResponse) =>
    setPendingConfirm({
      title: 'Delete class?',
      description: <>Delete class &quot;{run.code}&quot;. This cannot be undone.</>,
      action: () => deleteRunMutation.mutate(run.id),
    });

  const courseFormDirty =
    editCourseOpen &&
    Boolean(course) &&
    (courseForm.code !== course!.code ||
      courseForm.title !== course!.title ||
      courseForm.description !== (course!.description ?? '') ||
      courseForm.orderIndex !== String(course!.orderIndex ?? 0) ||
      courseForm.thumbnailUrl !== (course!.thumbnailUrl ?? '') ||
      courseForm.thumbnailFile !== null);

  const iapDirty =
    editIapOpen &&
    Boolean(course) &&
    (appleProductId !== (course!.appleProductId ?? '') ||
      androidProductId !== (course!.androidProductId ?? ''));

  const runDirty =
    Boolean(editingRun) &&
    (runForm.code !== editingRun!.code ||
      runForm.status !== editingRun!.status ||
      runForm.startsAt !== (editingRun!.startsAt ? toLocalDateTimeFromIso(editingRun!.startsAt) : '') ||
      runForm.endsAt !== (editingRun!.endsAt ? toLocalDateTimeFromIso(editingRun!.endsAt) : '') ||
      runForm.timezone !== (editingRun!.timezone ?? 'Asia/Ho_Chi_Minh') ||
      runForm.capacity !== (editingRun!.capacity != null ? String(editingRun!.capacity) : '') ||
      runForm.paypalPriceUsd !== getPayPalPriceUsd(editingRun!.metadata) ||
      runForm.enrollmentStartDate !==
        (editingRun!.enrollmentStartDate ? toLocalDateTimeFromIso(editingRun!.enrollmentStartDate) : '') ||
      runForm.enrollmentEndDate !==
        (editingRun!.enrollmentEndDate ? toLocalDateTimeFromIso(editingRun!.enrollmentEndDate) : ''));

  useBeforeUnload(
    (editCourseOpen && courseFormDirty) ||
      (editIapOpen && iapDirty) ||
      (Boolean(editingRun) && runDirty),
  );

  const handleEditCourseOpenChange = (open: boolean) => {
    if (!open && !confirmDiscard(courseFormDirty)) {
      return;
    }
    setEditCourseOpen(open);
  };

  const handleEditIapOpenChange = (open: boolean) => {
    if (!open && !confirmDiscard(iapDirty)) {
      return;
    }
    setEditIapOpen(open);
  };

  const handleEditRunOpenChange = (open: boolean) => {
    if (!open) {
      if (!confirmDiscard(runDirty)) {
        return;
      }
      setEditingRun(null);
      setRunForm(emptyRunForm);
    }
  };

  const courseFormValid =
    courseForm.code.trim().length > 0 && courseForm.title.trim().length > 0;
  const runFormValid =
    runForm.code.trim().length > 0 &&
    runForm.startsAt.trim().length > 0 &&
    runForm.endsAt.trim().length > 0;

  if (!courseId) {
    return null;
  }

  const isReady = completion.status === 'ready';

  return (
    <AdminPageShell
      title={course?.title ?? 'Course'}
      description="Manage information, syllabus, and classes for this course."
      toolbar={
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" size="sm" className="-ml-2" asChild>
            <Link to={ROUTES.courses}>
              <ArrowLeft className="mr-2 size-4" />
              Back to courses
            </Link>
          </Button>
          <nav className="text-muted-foreground flex flex-wrap items-center gap-1 text-sm">
            <Link to={ROUTES.programs} className="hover:text-foreground">
              Programs
            </Link>
            <ChevronRight className="size-3.5" />
            {course?.programId ? (
              <Link to={ROUTES.programCourses(course.programId)} className="hover:text-foreground">
                {programDisplayName}
              </Link>
            ) : (
              <span>{programDisplayName}</span>
            )}
            <ChevronRight className="size-3.5" />
            <span className="text-foreground">{course?.title ?? '...'}</span>
          </nav>
        </div>
      }
      actions={
        course ? (
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium',
                isReady
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
              )}
            >
              {isReady ? 'Ready' : 'Draft'}
            </span>
            <TableRowActionMenu
              items={[
                {
                  label: 'Edit info',
                  onClick: () => setEditCourseOpen(true),
                },
                {
                  label: 'Delete',
                  icon: Trash2,
                  destructive: true,
                  onClick: confirmDeleteCourse,
                },
              ]}
            />
          </div>
        ) : undefined
      }
    >
      {courseQuery.isError ? (
        <AdminQueryError
          message={getApiErrorMessage(courseQuery.error)}
          onRetry={() => void courseQuery.refetch()}
        />
      ) : null}

      {course ? (
        <AdminPageTabs
          value={activeTab}
          onValueChange={(value) => selectTab(value as CompletionAnchor)}
        >
          <AdminTabsList columns={3} maxWidth="lg">
            {WORKSPACE_SECTIONS.map((section) => {
              const count =
                section.id === 'syllabus'
                  ? totalSyllabusItems
                  : section.id === 'runs'
                    ? courseRuns.length
                    : null;
              return (
                <AdminTabsTrigger key={section.id} value={section.id}>
                  {section.label}
                  {count != null ? ` (${count})` : ''}
                </AdminTabsTrigger>
              );
            })}
          </AdminTabsList>

          <AdminTabsContent value="info">
            <WorkspaceSection
              id="info"
              icon={<Info className="size-4" />}
              title="Course information"
              action={
                <Button variant="outline" size="sm" onClick={() => setEditCourseOpen(true)}>
                  Edit info
                </Button>
              }
            >
              <div className="grid gap-5 sm:grid-cols-[140px_minmax(0,1fr)]">
                <div className="bg-muted/30 mx-auto aspect-square w-full max-w-[140px] overflow-hidden rounded-md border sm:mx-0">
                  {course.thumbnailUrl ? (
                    <img
                      src={course.thumbnailUrl}
                      alt={course.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-1.5 text-center text-xs">
                      <ImageIcon className="size-7" />
                      <span>No image</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[7rem_minmax(0,1fr)]">
                    <dt className="text-muted-foreground">Course code</dt>
                    <dd className="font-mono">{course.code}</dd>
                    <dt className="text-muted-foreground">Program</dt>
                    <dd>
                      {course.programId ? (
                        <Link
                          to={ROUTES.programCourses(course.programId)}
                          className="text-primary hover:underline"
                        >
                          {programDisplayName}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Not linked</span>
                      )}
                    </dd>
                    <dt className="text-muted-foreground">Updated</dt>
                    <dd>{formatDateTime(course.updatedAt)}</dd>
                  </dl>
                  <div>
                    <p className="text-muted-foreground mb-1 text-sm">Description</p>
                    <RichTextPreview value={course.description} />
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <ShoppingBag className="text-muted-foreground size-4" />
                    Mobile in-app purchase (optional)
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={iapMutation.isPending}
                    onClick={() => setEditIapOpen(true)}
                  >
                    Edit purchase IDs
                  </Button>
                </div>
                <div className="text-muted-foreground mt-3 grid gap-2 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]">
                  <span>Paid classes</span>
                  <span className="text-foreground tabular-nums">
                    {paidRunCount} / {courseRuns.length}
                  </span>
                  <span>Apple Product ID</span>
                  <span className="text-foreground break-all">{appleProductId || 'Not set'}</span>
                  <span>Android Product ID</span>
                  <span className="text-foreground break-all">{androidProductId || 'Not set'}</span>
                </div>
              </div>
            </WorkspaceSection>
          </AdminTabsContent>

          <AdminTabsContent value="syllabus">
            <WorkspaceSection id="syllabus" icon={<BookOpen className="size-4" />} title="Syllabus">
              <SyllabusEditor
                courseId={courseId}
                courseTitle={course.title}
                initialItemId={deepLinkItemId}
                onInitialItemHandled={clearDeepLinkItem}
              />
            </WorkspaceSection>
          </AdminTabsContent>

          <AdminTabsContent value="runs">
            <WorkspaceSection
              id="runs"
              icon={<CalendarDays className="size-4" />}
              title="Classes"
              action={
                <Button size="sm" onClick={() => setCreateRunOpen(true)}>
                  <Plus className="mr-2 size-4" />
                  Open a class
                </Button>
              }
            >
              {courseRuns.length ? (
                <div className="space-y-3">
                  {courseRuns.map((run) => (
                    <CourseRunCard
                      key={run.id}
                      run={run}
                      onEdit={() => openEditRun(run)}
                      onDelete={() => confirmDeleteRun(run)}
                    />
                  ))}
                </div>
              ) : (
                <AdminEmptyState
                  title="No classes yet"
                  description="Open a class to schedule sessions and let students enroll. Each class has its own schedule; the syllabus is shared."
                  action={
                    <Button size="sm" onClick={() => setCreateRunOpen(true)}>
                      <Plus className="mr-2 size-4" />
                      Open a class
                    </Button>
                  }
                />
              )}
            </WorkspaceSection>
          </AdminTabsContent>
        </AdminPageTabs>
      ) : courseQuery.isLoading ? (
        <AdminDetailSkeleton />
      ) : null}

      <CreateCourseRunSheet
        open={createRunOpen}
        onOpenChange={setCreateRunOpen}
        courseId={courseId}
        onCreated={(created) => {
          void invalidateCourseQueries();
          void navigate(ROUTES.courseRunDetail(created.id));
        }}
      />

      <Sheet open={editCourseOpen} onOpenChange={handleEditCourseOpenChange}>
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[560px] sm:max-w-[560px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Edit course</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <Label>
                Course code <span className="text-destructive">*</span>
              </Label>
              <Input
                value={courseForm.code}
                onChange={(e) => setCourseForm((prev) => ({ ...prev, code: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                value={courseForm.title}
                onChange={(e) => setCourseForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Cover image</Label>
              <ImageFilePicker
                file={courseForm.thumbnailFile}
                existingUrl={courseForm.thumbnailUrl}
                previewAlt={courseForm.title || 'Course thumbnail'}
                helperText="Choosing a new image replaces the current cover after saving."
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
                placeholder="Enter a course description…"
                onChange={(description) =>
                  setCourseForm((prev) => ({ ...prev, description }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Description preview</Label>
              <div className="bg-muted/20 rounded-md border p-4">
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
              disabled={updateCourseMutation.isPending || !courseFormValid}
            >
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={editIapOpen} onOpenChange={handleEditIapOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure in-app purchase IDs</DialogTitle>
            <DialogDescription>
              Used only for in-app purchase (IAP) mapping. Web/PayPal pricing is configured per
              class.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
          <DialogFooter>
            <Button onClick={() => iapMutation.mutate()} disabled={iapMutation.isPending}>
              Save purchase IDs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(editingRun)} onOpenChange={handleEditRunOpenChange}>
        <SheetContent className="flex h-svh w-screen max-w-full flex-col gap-0 overflow-hidden p-0 sm:w-[560px] sm:max-w-[560px]">
          <SheetHeader className="shrink-0 border-b px-6 pt-6 pb-4 text-left">
            <SheetTitle>Edit class</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <Label>
                Class code <span className="text-destructive">*</span>
              </Label>
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
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Starts <span className="text-destructive">*</span>
                </Label>
                <DateTimePicker
                  value={runForm.startsAt}
                  onChange={(startsAt) => setRunForm((prev) => ({ ...prev, startsAt }))}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Ends <span className="text-destructive">*</span>
                </Label>
                <DateTimePicker
                  value={runForm.endsAt}
                  onChange={(endsAt) => setRunForm((prev) => ({ ...prev, endsAt }))}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Enrollment opens</Label>
                <DateTimePicker
                  value={runForm.enrollmentStartDate}
                  onChange={(value) =>
                    setRunForm((prev) => ({ ...prev, enrollmentStartDate: value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Enrollment closes</Label>
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
            <div className="bg-muted/20 rounded-lg border p-4">
              <p className="text-sm font-medium">Pricing</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Set a single USD price for this class so checkout creates the correct order.
              </p>
              <div className="mt-4 space-y-2">
                <Label>Price (USD)</Label>
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
              disabled={updateRunMutation.isPending || !runFormValid}
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
    </AdminPageShell>
  );
}
