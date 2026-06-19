/** `datetime-local` input value: `YYYY-MM-DDTHH:mm` */

export function parseLocalDateTime(value: string | undefined): Date | undefined {
  if (!value?.trim()) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export function toLocalDateTimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toLocalDateTimeFromIso(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  return toLocalDateTimeValue(parsed);
}

export function formatLocalDateTimeDisplay(
  value: string | undefined,
  placeholder = 'Chọn ngày giờ',
): string {
  const parsed = parseLocalDateTime(value);
  if (!parsed) return placeholder;
  return parsed.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function extractTimePart(value: string | undefined): string {
  const parsed = parseLocalDateTime(value);
  if (!parsed) return '09:00';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

export function mergeDateAndTime(date: Date, time: string): string {
  const [hourRaw, minuteRaw] = time.split(':');
  const hours = Number(hourRaw);
  const minutes = Number(minuteRaw);
  const merged = new Date(date);
  merged.setHours(
    Number.isFinite(hours) ? hours : 9,
    Number.isFinite(minutes) ? minutes : 0,
    0,
    0,
  );
  return toLocalDateTimeValue(merged);
}
