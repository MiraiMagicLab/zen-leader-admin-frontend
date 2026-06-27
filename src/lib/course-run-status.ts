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
  if (status === 'OPEN') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
  }
  if (status === 'CANCELLED') {
    return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
  }
  return 'bg-muted text-muted-foreground';
}
