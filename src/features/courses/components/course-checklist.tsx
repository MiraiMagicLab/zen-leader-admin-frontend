import { CheckCircle2, ChevronRight, Circle } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { CompletionAnchor, CourseCompletion } from '@/features/courses/lib/course-completion';

type CourseChecklistProps = {
  completion: CourseCompletion;
  onSelect: (anchor: CompletionAnchor) => void;
};

export function CourseChecklist({ completion, onSelect }: CourseChecklistProps) {
  const remaining = completion.totalCount - completion.doneCount;
  const nextId = completion.firstIncomplete?.id;

  return (
    <div className="bg-card rounded-xl border p-5 shadow-sm">
      <h2 className="text-base font-semibold">Các bước tiếp theo</h2>
      <p className="text-muted-foreground mt-0.5 text-sm">
        {remaining > 0
          ? `Còn ${remaining} bước để khóa học sẵn sàng cho học viên.`
          : 'Khóa học đã sẵn sàng cho học viên.'}
      </p>

      <ul className="mt-3 flex flex-col gap-0.5">
        {completion.steps.map((step) => {
          const isNext = step.id === nextId;
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => onSelect(step.anchor)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors',
                  isNext ? 'bg-primary/10' : 'hover:bg-muted/60',
                )}
              >
                {step.done ? (
                  <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Circle className={cn('size-5 shrink-0', isNext ? 'text-primary' : 'text-muted-foreground')} />
                )}
                <span className={cn('flex-1 text-sm', isNext && 'text-primary font-medium')}>
                  {step.label}
                </span>
                <span className="text-muted-foreground text-xs">{step.summary}</span>
                <ChevronRight className="text-muted-foreground size-4 shrink-0" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
