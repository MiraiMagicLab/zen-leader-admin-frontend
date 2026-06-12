import type { ZodError } from 'zod';

const fieldLabels: Record<string, string> = {
  code: 'Mã',
  title: 'Tiêu đề',
  description: 'Mô tả',
  orderIndex: 'Thứ tự',
  email: 'Email',
  password: 'Mật khẩu',
};

function formatIssue(path: PropertyKey[], code: string, message: string, minimum?: number, maximum?: number) {
  const field = String(path[0] ?? 'Trường');
  const label = fieldLabels[field] ?? field;

  if (code === 'too_small' && typeof minimum === 'number') {
    return `${label} phải có ít nhất ${minimum} ký tự`;
  }
  if (code === 'too_big' && typeof maximum === 'number') {
    return `${label} không được vượt quá ${maximum} ký tự`;
  }
  if (message.startsWith('Too small') || message.startsWith('Too big')) {
    return `${label}: dữ liệu không hợp lệ`;
  }
  if (message.includes('Required') || code === 'invalid_type') {
    return `${label} không được để trống`;
  }
  return message.includes(label) ? message : `${label}: ${message}`;
}

export function getZodErrorMessage(error: ZodError): string {
  return error.issues
    .map((issue) =>
      formatIssue(
        issue.path,
        issue.code,
        issue.message,
        'minimum' in issue ? Number(issue.minimum) : undefined,
        'maximum' in issue ? Number(issue.maximum) : undefined,
      ),
    )
    .join('. ');
}

export function getZodFieldErrors(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_form');
    if (!errors[key]) {
      errors[key] = formatIssue(
        issue.path,
        issue.code,
        issue.message,
        'minimum' in issue ? Number(issue.minimum) : undefined,
        'maximum' in issue ? Number(issue.maximum) : undefined,
      );
    }
  }
  return errors;
}
