import { Link } from 'react-router-dom';
import { CalendarClock, Pencil, Trash2, Users, Video } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/format';
import { formatCourseRunPricingSummary } from '@/lib/course-run-pricing';
import { ROUTES } from '@/routes/paths';
import type { CourseRunResponse } from '@/services/types/domain';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Nháp',
  OPEN: 'Đang mở',
  IN_PROGRESS: 'Đang học',
  COMPLETED: 'Đã xong',
  CANCELLED: 'Đã hủy',
};

function statusClasses(status: string) {
  if (status === 'OPEN') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
  }
  if (status === 'CANCELLED') {
    return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
  }
  return 'bg-muted text-muted-foreground';
}

type CourseRunCardProps = {
  run: CourseRunResponse;
  onEdit: () => void;
  onDelete: () => void;
};

export function CourseRunCard({ run, onEdit, onDelete }: CourseRunCardProps) {
  const sessionCount = (run.courseSessions ?? run.sessions ?? []).length;
  const pricing = formatCourseRunPricingSummary(run.metadata) || 'Miễn phí';

  return (
    <div className="rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm">{run.code}</span>
          <span
            className={cn(
              'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
              statusClasses(run.status),
            )}
          >
            {STATUS_LABEL[run.status] ?? run.status}
          </span>
          <span className="bg-primary/10 text-primary inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium">
            {pricing}
          </span>
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" asChild>
            <Link to={ROUTES.courseRunDetail(run.id)}>Quản lý lớp</Link>
          </Button>
          <Button variant="outline" size="icon" className="size-8" onClick={onEdit} aria-label="Sửa lớp">
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="text-destructive size-8"
            onClick={onDelete}
            aria-label="Xóa lớp"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="text-muted-foreground mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <Video className="size-3.5" />
          {sessionCount} buổi học
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Users className="size-3.5" />
          Sức chứa: {run.capacity ?? 'không giới hạn'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="size-3.5" />
          Ghi danh: {formatDateTime(run.enrollmentStartDate)} – {formatDateTime(run.enrollmentEndDate)}
        </span>
      </div>
    </div>
  );
}
