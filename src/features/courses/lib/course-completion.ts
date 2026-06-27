import { stripHtml } from '@/lib/html';
import type { CourseResponse } from '@/services/types/domain';

/** Which workspace section a checklist step scrolls to. */
export type CompletionAnchor = 'info' | 'syllabus' | 'runs';

export type CompletionStepId = 'info' | 'syllabus' | 'runs' | 'sessions' | 'ready';

export type CompletionStep = {
  id: CompletionStepId;
  label: string;
  /** Short hint shown on the right of the checklist row. */
  summary: string;
  done: boolean;
  anchor: CompletionAnchor;
};

export type CourseCompletion = {
  steps: CompletionStep[];
  doneCount: number;
  totalCount: number;
  percent: number;
  status: 'draft' | 'ready';
  /** First step not yet done — drives the header CTA. Null when everything is done. */
  firstIncomplete: CompletionStep | null;
};

/**
 * Derives course setup progress purely from a {@link CourseResponse}. No backend flag exists for
 * "published"; a course is considered ready for students once it has at least one OPEN run.
 */
export function computeCourseCompletion(
  course: CourseResponse | null | undefined,
): CourseCompletion {
  const sections = course?.syllabusSections ?? [];
  const runs = course?.courseRuns ?? [];

  const lessonCount = sections.reduce((n, s) => n + (s.items?.length ?? 0), 0);
  const sessionCount = runs.reduce(
    (n, r) => n + (r.courseSessions ?? r.sessions ?? []).length,
    0,
  );
  const hasOpenRun = runs.some((r) => r.status === 'OPEN');

  const hasDescription = Boolean(stripHtml(course?.description ?? '').trim());
  const infoDone = Boolean(course?.title?.trim() && course?.code?.trim() && hasDescription);

  const steps: CompletionStep[] = [
    {
      id: 'info',
      label: 'Course information',
      summary: infoDone ? 'Complete' : 'Add a description',
      done: infoDone,
      anchor: 'info',
    },
    {
      id: 'syllabus',
      label: 'Syllabus',
      summary:
        lessonCount > 0
          ? `${sections.length} chapter${sections.length === 1 ? '' : 's'} · ${lessonCount} lesson${lessonCount === 1 ? '' : 's'}`
          : 'No lessons yet',
      done: lessonCount > 0,
      anchor: 'syllabus',
    },
    {
      id: 'runs',
      label: 'Open a class',
      summary: runs.length > 0 ? `${runs.length} class${runs.length === 1 ? '' : 'es'}` : 'No classes yet',
      done: runs.length > 0,
      anchor: 'runs',
    },
    {
      id: 'sessions',
      label: 'Sessions',
      summary: sessionCount > 0 ? `${sessionCount} session${sessionCount === 1 ? '' : 's'}` : 'No sessions yet',
      done: sessionCount > 0,
      anchor: 'runs',
    },
    {
      id: 'ready',
      label: 'Ready for students',
      summary: hasOpenRun ? 'A class is open' : 'No open class',
      done: hasOpenRun,
      anchor: 'runs',
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const totalCount = steps.length;

  return {
    steps,
    doneCount,
    totalCount,
    percent: Math.round((doneCount / totalCount) * 100),
    status: hasOpenRun ? 'ready' : 'draft',
    firstIncomplete: steps.find((s) => !s.done) ?? null,
  };
}
