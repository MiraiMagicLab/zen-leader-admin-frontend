import { useNavigate } from 'react-router-dom';
import { CalendarClock, Trash2, Users, Video } from 'lucide-react';

import { TableRowActionMenu } from '@/components/admin/table-row-actions';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/format';
import { formatCourseRunPricingSummary } from '@/lib/course-run-pricing';
import { courseRunStatusClasses, courseRunStatusLabel } from '@/lib/course-run-status';
import { ROUTES } from '@/routes/paths';
import type { CourseRunResponse } from '@/services/types/domain';

type CourseRunCardProps = {
  run: CourseRunResponse;
  onEdit: () => void;
  onDelete: () => void;
};

export function CourseRunCard({ run, onEdit, onDelete }: CourseRunCardProps) {
  const navigate = useNavigate();
  const sessionCount = (run.courseSessions ?? run.sessions ?? []).length;
  const pricing = formatCourseRunPricingSummary(run.metadata) || 'Free';

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm">{run.code}</span>
          <span
            className={cn(
              'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
              courseRunStatusClasses(run.status),
            )}
          >
            {courseRunStatusLabel(run.status)}
          </span>
          <Badge variant="secondary">{pricing}</Badge>
        </div>
        <TableRowActionMenu
          items={[
            { label: 'Manage', onClick: () => navigate(ROUTES.courseRunDetail(run.id)) },
            { label: 'Edit', onClick: onEdit },
            { label: 'Delete', icon: Trash2, destructive: true, onClick: onDelete },
          ]}
        />
      </div>

      <div className="text-muted-foreground mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <Video className="size-3.5" />
          {sessionCount} sessions
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-3.5" />
          Capacity: {run.capacity ?? 'Unlimited'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="size-3.5" />
          Enrollment: {formatDateTime(run.enrollmentStartDate)} – {formatDateTime(run.enrollmentEndDate)}
        </span>
      </div>
    </div>
  );
}
