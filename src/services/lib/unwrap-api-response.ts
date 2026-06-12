import type { ApiResponse } from '@/services/types/api';

export function unwrapApiResponse<T>(
  response: ApiResponse<T>,
  fallbackMessage = 'Yêu cầu thất bại.',
): T {
  if (!response.success || response.data === undefined) {
    throw new Error(
      response.errorMessage?.message ?? response.message ?? fallbackMessage,
    );
  }
  return response.data;
}
