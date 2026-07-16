export const COURSE_RUN_STATUS_OPTIONS = [
  'DRAFT',
  'OPEN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;

const LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

/** Human-readable Vietnamese label for a course-run status enum. */
export function courseRunStatusLabel(status: string): string {
  return LABELS[status] ?? status;
}

/** Tailwind classes for a status badge background/text. */
export function courseRunStatusClasses(status: string): string {
  switch (status) {
    case 'OPEN':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
    case 'IN_PROGRESS':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300';
    case 'DRAFT':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300';
    case 'COMPLETED':
      return 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    case 'CANCELLED':
      return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
    default:
      return 'bg-muted text-muted-foreground';
  }
}
