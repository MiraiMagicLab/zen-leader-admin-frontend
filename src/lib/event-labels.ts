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

export function eventTypeLabel(isOfficial: boolean): string {
  return isOfficial ? 'System' : 'User';
}
