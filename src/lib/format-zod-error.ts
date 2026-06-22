import type { ZodError } from 'zod';

const fieldLabels: Record<string, string> = {
  code: 'Code',
  title: 'Title',
  description: 'Description',
  orderIndex: 'Order',
  email: 'Email',
  password: 'Password',
};

function formatIssue(path: PropertyKey[], code: string, message: string, minimum?: number, maximum?: number) {
  const field = String(path[0] ?? 'Field');
  const label = fieldLabels[field] ?? field;

  if (code === 'too_small' && typeof minimum === 'number') {
    return `${label} must be at least ${minimum} characters`;
  }
  if (code === 'too_big' && typeof maximum === 'number') {
    return `${label} must not exceed ${maximum} characters`;
  }
  if (message.startsWith('Too small') || message.startsWith('Too big')) {
    return `${label}: invalid value`;
  }
  if (message.includes('Required') || code === 'invalid_type') {
    return `${label} required`;
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
