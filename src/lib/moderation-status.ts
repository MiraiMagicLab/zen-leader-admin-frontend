import { humanizeEnumValue } from '@/lib/humanize';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pending',
  RESOLVED: 'Resolved',
  DISMISSED: 'Dismissed',
};

/** Human-readable UGC report status. */
export function reportStatusLabel(value: string): string {
  const key = value.trim().toUpperCase();
  return STATUS_LABEL[key] ?? humanizeEnumValue(value);
}

/** Distinct Tailwind classes for moderation queue scanning. */
export function reportStatusClasses(value: string): string {
  switch (value.trim().toUpperCase()) {
    case 'PENDING':
      return 'border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300';
    case 'RESOLVED':
      return 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
    case 'DISMISSED':
      return 'border-transparent bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    default:
      return 'border-transparent bg-muted text-muted-foreground';
  }
}
