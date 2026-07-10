import { useQuery } from '@tanstack/react-query';

import { AdminDockPanel } from '@/components/admin/admin-dock-panel';
import { InspectorField } from '@/components/admin/admin-inspector';
import { AdminPanelSkeleton } from '@/components/admin/admin-loading';
import { AdminQueryError } from '@/components/admin/admin-query-state';
import { Progress } from '@/components/ui/progress';
import { queryKeys } from '@/hooks/query-keys';
import { formatDateTime } from '@/lib/format';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import { progressApi } from '@/services/progress/progress-api';
import type { EnrollmentResponse } from '@/services/types/domain';

type CourseRunProgressInspectorProps = {
  /** Course run the enrollment belongs to; used to scope the progress summary query. */
  runId: string;
  /** Enrollment currently being inspected, or `null` when the inspector is closed. */
  enrollment: EnrollmentResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Floating progress panel for a single enrollment (replaces edge-locked sheet).
 */
export function CourseRunProgressInspector({
  runId,
  enrollment,
  open,
  onOpenChange,
}: CourseRunProgressInspectorProps) {
  const progressQuery = useQuery({
    queryKey: queryKeys.progress.summary(enrollment?.userId ?? '', runId),
    queryFn: () => progressApi.getSummary(enrollment!.userId, runId),
    enabled: Boolean(enrollment && runId && open),
  });

  return (
    <AdminDockPanel
      open={open}
      onClose={() => onOpenChange(false)}
      title="Learning progress"
      description={
        enrollment ? enrollment.userDisplayName ?? enrollment.userEmail ?? undefined : undefined
      }
      isLoading={progressQuery.isLoading}
    >
      {progressQuery.isError ? (
        <AdminQueryError
          message={getApiErrorMessage(progressQuery.error)}
          onRetry={() => void progressQuery.refetch()}
        />
      ) : progressQuery.isLoading ? (
        <AdminPanelSkeleton lines={4} />
      ) : progressQuery.data ? (
        <div className="space-y-6">
          <div className="space-y-1.5">
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>Syllabus progress</span>
              <span className="text-foreground font-medium">
                {progressQuery.data.completedSyllabusItems}/{progressQuery.data.totalSyllabusItems} ·{' '}
                {progressQuery.data.syllabusProgressPercent ?? 0}%
              </span>
            </div>
            <Progress value={progressQuery.data.syllabusProgressPercent ?? 0} className="h-2" />
          </div>
          <div className="space-y-1.5">
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>Session attendance</span>
              <span className="text-foreground font-medium">
                {progressQuery.data.attendedSessions}/{progressQuery.data.totalSessions} ·{' '}
                {progressQuery.data.sessionProgressPercent ?? 0}%
              </span>
            </div>
            <Progress value={progressQuery.data.sessionProgressPercent ?? 0} className="h-2" />
          </div>
          <dl className="grid grid-cols-2 gap-4">
            <InspectorField
              label="Enrollment ID"
              value={progressQuery.data.enrollmentId}
              mono
              className="col-span-2"
            />
            <InspectorField
              label="Last updated"
              value={formatDateTime(progressQuery.data.lastUpdatedAt)}
              className="col-span-2"
            />
          </dl>
        </div>
      ) : null}
    </AdminDockPanel>
  );
}
