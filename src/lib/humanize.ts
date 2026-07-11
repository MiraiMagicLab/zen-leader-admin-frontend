const WORD_MAP: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  publish: 'Published',
  unpublish: 'Unpublished',
  request: 'Requested',
  accept: 'Accepted',
  reject: 'Rejected',
  cancel: 'Cancelled',
  unfriend: 'Unfriended',
};

/**
 * Convert a SCREAMING_SNAKE_CASE or dot.separated.action string into
 * a human-readable English label.
 *
 * Examples:
 *   "SYLLABUS_ITEM_UPDATE" → "Syllabus Item Update"
 *   "syllabus_item.update" → "Syllabus Item Updated"
 *   "IN_PROGRESS"          → "In Progress"
 */
export function humanizeEnumValue(raw: string | null | undefined): string {
  if (!raw?.trim()) return '—';

  const normalized = raw.trim();

  if (normalized.includes('.')) {
    const parts = normalized.split('.');
    const entity = parts[0]
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    const verb = parts[1]?.toLowerCase();
    const mapped = verb ? WORD_MAP[verb] ?? capitalize(verb) : '';
    return mapped ? `${entity} ${mapped}` : entity;
  }

  return normalized
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
