import axios from 'axios';
import { ZodError } from 'zod';

import { getZodErrorMessage } from '@/lib/format-zod-error';
import type { ApiResponse } from '@/services/types/api';

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Đã xảy ra lỗi. Vui lòng thử lại.',
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
    payload?.message ??
    error.message ??
    fallback
  );
}
