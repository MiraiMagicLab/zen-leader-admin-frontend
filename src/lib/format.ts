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

/** Currency display for admin payment metrics. */
export function formatMoney(
  amount: number,
  currency = 'VND',
): string {
  return `${formatNumber(amount)} ${currency}`;
}

/** Picks the primary currency amount for KPI display (prefers VND, else first). */
export function primaryCurrencyAmount(
  amounts: { currency: string; amount: number; orderCount: number }[] | undefined,
): { currency: string; amount: number; orderCount: number } | null {
  if (!amounts?.length) return null;
  return amounts.find((row) => row.currency === 'VND') ?? amounts[0] ?? null;
}

/** Formats multi-currency totals into a compact display string. */
export function formatCurrencyAmounts(
  amounts: { currency: string; amount: number; orderCount: number }[] | undefined,
): string {
  if (!amounts?.length) return formatMoney(0, 'VND');
  return amounts.map((row) => formatMoney(row.amount, row.currency)).join(' · ');
}
