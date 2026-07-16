export function normalizeEventStatus(status: string | null | undefined): string {
  return (status ?? '').trim().toUpperCase();
}

export function eventStatusLabel(status: string | null | undefined): string {
  switch (normalizeEventStatus(status)) {
    case 'DRAFT':
      return 'Draft';
    case 'PUBLISHED':
      return 'Published';
    case 'COMPLETED':
      return 'Completed';
    default:
      return status?.trim() || '—';
  }
}

/** Distinct Tailwind classes for event publishing state. */
export function eventStatusClasses(status: string | null | undefined): string {
  switch (normalizeEventStatus(status)) {
    case 'PUBLISHED':
      return 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
    case 'DRAFT':
      return 'border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300';
    case 'COMPLETED':
      return 'border-transparent bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    default:
      return 'border-transparent bg-muted text-muted-foreground';
  }
}

export function eventTypeLabel(isOfficial: boolean): string {
  return isOfficial ? 'System' : 'User';
}
