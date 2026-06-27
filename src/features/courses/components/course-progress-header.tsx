import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/routes/paths';
import type { CourseResponse } from '@/services/types/domain';
import type { CompletionAnchor, CourseCompletion } from '@/features/courses/lib/course-completion';

type CourseProgressHeaderProps = {
  course: CourseResponse;
  completion: CourseCompletion;
  onEdit: () => void;
  onDelete: () => void;
  onScrollTo: (anchor: CompletionAnchor) => void;
};

export function CourseProgressHeader({
  course,
  completion,
  onEdit,
  onDelete,
  onScrollTo,
}: CourseProgressHeaderProps) {
  const isReady = completion.status === 'ready';
  const programName = course.programCode?.trim() || 'Chương trình';

  return (
    <div className="bg-card space-y-4 rounded-xl border p-5 shadow-sm">
      <nav className="text-muted-foreground flex flex-wrap items-center gap-1 text-sm">
        <Link to={ROUTES.programs} className="hover:text-foreground">
          Programs
        </Link>
        <ChevronRight className="size-3.5" />
        {course.programId ? (
          <Link to={ROUTES.programCourses(course.programId)} className="hover:text-foreground">
            {programName}
          </Link>
        ) : (
          <span>{programName}</span>
        )}
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{course.title}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold">{course.title}</h1>
            <span className="text-muted-foreground rounded-md border px-1.5 py-0.5 font-mono text-xs">
              {course.code}
            </span>
          </div>
          <span
            className={cn(
              'inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium',
              isReady
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
            )}
          >
            {isReady ? 'Sẵn sàng' : 'Nháp'}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="mr-2 size-4" />
            Sửa thông tin
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete}>
            <Trash2 className="mr-2 size-4" />
            Xóa
          </Button>
          {!isReady && completion.firstIncomplete ? (
            <Button size="sm" onClick={() => onScrollTo(completion.firstIncomplete!.anchor)}>
              Tiếp tục: {completion.firstIncomplete.label}
              <ArrowRight className="ml-2 size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="text-muted-foreground flex items-center justify-between text-xs">
          <span>Hoàn thiện khóa học</span>
          <span className="text-foreground font-medium">
            {completion.doneCount}/{completion.totalCount} bước · {completion.percent}%
          </span>
        </div>
        <Progress value={completion.percent} className="h-2" />
      </div>
    </div>
  );
}
