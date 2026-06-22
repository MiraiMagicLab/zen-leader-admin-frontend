import axios from 'axios';
import { ZodError } from 'zod';

import { getZodErrorMessage } from '@/lib/format-zod-error';
import type { ApiResponse } from '@/services/types/api';

export function getApiErrorMessage(
  error: unknown,
  fallback = 'An error occurred. Please try again.',
): string {
  if (error instanceof ZodError) {
    return getZodErrorMessage(error);
  }

  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  const payload = error.response?.data as ApiResponse<unknown> | undefined;

  return (
    payload?.errorMessage?.message ??
    enrollmentErrorMessage(payload?.errorMessage?.errorCode) ??
    payload?.message ??
    error.message ??
    fallback
  );
}

const ENROLLMENT_ERROR_MESSAGES: Record<string, string> = {
  'lms.enrollment_already_exists':
    'This user is already enrolled in the class.',
};

function enrollmentErrorMessage(errorCode: string | undefined): string | undefined {
  if (!errorCode) return undefined;
  return ENROLLMENT_ERROR_MESSAGES[errorCode];
}
