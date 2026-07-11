export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN');
}

/** Collapse duplicate actor labels such as `email (email)` from audit logs. */
export function formatAuditActorDisplay(value: string | null | undefined): string {
  if (!value?.trim()) return 'System';

  const trimmed = value.trim();
  const duplicateMatch = trimmed.match(/^(.+?)\s*\((.+)\)$/);
  if (duplicateMatch && duplicateMatch[1].trim() === duplicateMatch[2].trim()) {
    return duplicateMatch[1].trim();
  }

  return trimmed;
}

/** Short relative time for feeds; falls back to locale datetime for older entries. */
export function formatRelativeDateTime(value: string | null | undefined): string {
  if (!value) return '—';

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) return 'Vừa xong';
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return formatDateTime(value);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('vi-VN');
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('vi-VN').format(value);
}
