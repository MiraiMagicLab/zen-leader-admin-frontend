export function normalizeEventStatus(status: string | null | undefined): string {
  return (status ?? '').trim().toUpperCase();
}

export function eventStatusLabel(status: string | null | undefined): string {
  switch (normalizeEventStatus(status)) {
    case 'DRAFT':
      return 'Nháp';
    case 'PUBLISHED':
      return 'Đã xuất bản';
    case 'COMPLETED':
      return 'Đã kết thúc';
    default:
      return status?.trim() || '—';
  }
}

export function eventTypeLabel(isOfficial: boolean): string {
  return isOfficial ? 'Hệ thống' : 'Người dùng';
}
