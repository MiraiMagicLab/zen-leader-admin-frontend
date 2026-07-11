import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { adminToast as toast } from '@/lib/admin-toast';

import { AdminDetailSkeleton, AdminQueryError } from '@/components/admin/admin-query-state';
import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { ConfirmDialog, type PendingConfirm } from '@/components/admin/confirm-dialog';
import { TableRowActionMenu } from '@/components/admin/table-row-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { courseRunStatusLabel } from '@/lib/course-run-status';
import { queryKeys } from '@/hooks/query-keys';
import { ADMIN_LIST_PAGE_SIZE } from '@/lib/admin-pagination';
import { ADMIN_PAGE_META } from '@/lib/admin-page-meta';
import { formatCourseRunPricingSummary, hasCourseRunPricing } from '@/lib/course-run-pricing';
import { formatDateTime } from '@/lib/format';
import { useAdminPageMeta } from '@/lib/page-meta';
import { ROUTES } from '@/routes/paths';
import { courseRunsApi } from '@/services/course-runs/course-runs-api';
import { coursesApi } from '@/services/courses/courses-api';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import { enrollmentsApi, sessionsApi } from '@/services/lms/lms-api';
import type { EnrollmentResponse } from '@/services/types/domain';

import { CourseRunEnrollmentsPanel } from '@/features/course-runs/components/course-run-enrollments-panel';
import { CourseRunProgressInspector } from '@/features/course-runs/components/course-run-progress-inspector';
import { CourseRunSessionsPanel } from '@/features/course-runs/components/course-run-sessions-panel';
import { CourseRunSettingsPanel } from '@/features/course-runs/components/course-run-settings-panel';

const DETAIL_PAGE_SIZE = 100;

/**
 * Course run detail page. Orchestrates the run/course/sessions/enrollments queries
 * and header actions; the sessions tab, enrollment tab, run-settings sheet, and the
 * per-enrollment progress inspector are each owned by dedicated panel components.
 */
export function CourseRunDetailPage() {
  useAdminPageMeta(ADMIN_PAGE_META.courseRunDetail);

  const { runId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [runSettingsOpen, setRunSettingsOpen] = useState(false);
  const [enrollmentPage, setEnrollmentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('sessions');
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);
  const [progressEnrollment, setProgressEnrollment] = useState<EnrollmentResponse | null>(null);

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

  const openRunSettings = () => {
    if (!run) {
      return;
    }
    setRunSettingsOpen(true);
  };

  // Open the settings sheet when arriving with ?settings=1. Handled during render
  // (guarded by state) instead of in an effect to avoid react-hooks/set-state-in-effect.
  const [settingsParamHandled, setSettingsParamHandled] = useState(false);
  if (searchParams.get('settings') === '1' && run && !settingsParamHandled) {
    setSettingsParamHandled(true);
    setRunSettingsOpen(true);
    setSearchParams({}, { replace: true });
  }

  const deleteRunMutation = useMutation({
    mutationFn: () => courseRunsApi.remove(runId!),
    onSuccess: () => {
      toast.success('Course run deleted.');
      navigate(run?.courseId ? ROUTES.courseDetail(run.courseId) : ROUTES.courseRuns);
    },
    onError: (error) => toast.error(error),
  });

  if (!runId) {
    return null;
  }

  return (
    <>
    <AdminPageShell
      title={run?.code ?? 'Course run'}
      description={
        run && course ? `Course: ${course.title}` : 'Manage sessions and enrollment.'
      }
      toolbar={
        <Button variant="ghost" size="sm" asChild className="-ml-2 self-start">
          <Link to={run?.courseId ? ROUTES.courseDetail(run.courseId) : ROUTES.courseRuns}>
            <ArrowLeft className="mr-2 size-4" />
            {run?.courseId ? 'Back to course' : 'Back to course runs'}
          </Link>
        </Button>
      }
      actions={
        run ? (
          <div className="flex flex-wrap gap-2">
            <TableRowActionMenu
              items={[
                {
                  label: 'Run settings',
                  onClick: openRunSettings,
                },
                {
                  label: 'Delete',
                  icon: Trash2,
                  destructive: true,
                  disabled: deleteRunMutation.isPending,
                  onClick: () =>
                    setPendingConfirm({
                      title: 'Delete course run?',
                      description: (
                        <>
                          Delete course run &quot;{run.code}&quot; along with its sessions. This
                          cannot be undone.
                        </>
                      ),
                      action: () => deleteRunMutation.mutate(),
                    }),
                },
              ]}
            />
          </div>
        ) : undefined
      }
    >
      {run ? (
        <div className="space-y-6">
            <section className="overflow-hidden rounded-lg border">
                <div className="grid lg:grid-cols-2 lg:divide-x">
                  <dl className="divide-y text-sm">
                    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                      <dt className="text-muted-foreground">Class code</dt>
                      <dd className="font-mono font-semibold">{run.code}</dd>
                    </div>
                    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                      <dt className="text-muted-foreground">Status</dt>
                      <dd>
                        <Badge variant="secondary">{courseRunStatusLabel(run.status)}</Badge>
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
                      <dt className="text-muted-foreground">Price</dt>
                      <dd className="font-medium">
                        {hasCourseRunPricing(run.metadata)
                          ? formatCourseRunPricingSummary(run.metadata)
                          : 'Free'}
                      </dd>
                    </div>
                    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                      <dt className="text-muted-foreground">Starts</dt>
                      <dd>{formatDateTime(run.startsAt)}</dd>
                    </div>
                    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                      <dt className="text-muted-foreground">Ends</dt>
                      <dd>{formatDateTime(run.endsAt)}</dd>
                    </div>
                  </dl>

                  <dl className="divide-y text-sm">
                    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                      <dt className="text-muted-foreground">Open enrollment</dt>
                      <dd>{formatDateTime(run.enrollmentStartDate)}</dd>
                    </div>
                    <div className="grid gap-1 px-4 py-3 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:items-center sm:gap-4">
                      <dt className="text-muted-foreground">Close enrollment</dt>
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
            </section>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid h-10 w-full max-w-md grid-cols-2">
                <TabsTrigger value="sessions" className="h-full">
                  Sessions ({sessions.length})
                </TabsTrigger>
                <TabsTrigger value="enrollments" className="h-full">
                  Enrollment ({enrollmentsQuery.data?.totalElement ?? 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sessions" className="space-y-4">
                <CourseRunSessionsPanel
                  runId={runId}
                  sessions={sessions}
                  isLoading={sessionsQuery.isLoading}
                />
              </TabsContent>

              <TabsContent value="enrollments" className="space-y-4">
                <CourseRunEnrollmentsPanel
                  runId={runId}
                  enrollments={enrollments}
                  isLoading={enrollmentsQuery.isLoading}
                  totalPages={enrollmentsQuery.data?.totalPages ?? 1}
                  enrollmentPage={enrollmentPage}
                  onEnrollmentPageChange={setEnrollmentPage}
                  onOpenProgress={setProgressEnrollment}
                />
              </TabsContent>
            </Tabs>
          </div>
        ) : runQuery.isError ? (
          <AdminQueryError
            message={getApiErrorMessage(runQuery.error)}
            onRetry={() => void runQuery.refetch()}
          />
        ) : (
          <AdminDetailSkeleton />
        )}
      </AdminPageShell>

      {run ? (
        <CourseRunSettingsPanel
          open={runSettingsOpen}
          onOpenChange={setRunSettingsOpen}
          run={run}
        />
      ) : null}

      <CourseRunProgressInspector
        runId={runId}
        enrollment={progressEnrollment}
        open={Boolean(progressEnrollment)}
        onOpenChange={(open) => {
          if (!open) setProgressEnrollment(null);
        }}
      />

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
        pending={deleteRunMutation.isPending}
      />
    </>
  );
}
