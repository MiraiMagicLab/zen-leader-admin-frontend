import { humanizeEnumValue } from '@/lib/humanize';

/** Distinct Tailwind classes for course-session lifecycle states. */
export function sessionStatusClasses(status: string | null | undefined): string {
  switch ((status ?? '').trim().toUpperCase()) {
    case 'LIVE':
    case 'IN_PROGRESS':
    case 'ACTIVE':
      return 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
    case 'SCHEDULED':
    case 'UPCOMING':
      return 'border-transparent bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300';
    case 'DRAFT':
      return 'border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300';
    case 'COMPLETED':
    case 'ENDED':
      return 'border-transparent bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    case 'CANCELLED':
      return 'border-transparent bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
    default:
      return 'border-transparent bg-muted text-muted-foreground';
  }
}

/** Human-readable session status label. */
export function sessionStatusLabel(status: string | null | undefined): string {
  return humanizeEnumValue(status) || '—';
}
