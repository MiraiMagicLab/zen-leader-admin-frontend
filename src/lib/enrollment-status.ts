import { humanizeEnumValue } from '@/lib/humanize';

/** Distinct Tailwind classes for enrollment lifecycle states. */
export function enrollmentStatusClasses(status: string | null | undefined): string {
  switch ((status ?? '').trim().toUpperCase()) {
    case 'ACTIVE':
      return 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
    case 'PENDING':
    case 'INVITED':
      return 'border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300';
    case 'COMPLETED':
      return 'border-transparent bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300';
    case 'DROPPED':
    case 'CANCELLED':
    case 'REVOKED':
      return 'border-transparent bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
    case 'EXPIRED':
      return 'border-transparent bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    default:
      return 'border-transparent bg-muted text-muted-foreground';
  }
}

/** Human-readable enrollment status label. */
export function enrollmentStatusLabel(status: string | null | undefined): string {
  return humanizeEnumValue(status) || '—';
}
