import { toast as sonnerToast } from 'sonner';

import { getApiErrorMessage } from '@/services/lib/get-api-error-message';

/**
 * Admin toast helpers — consistent copy and error extraction for mutations.
 */
export const adminToast = {
  success(message: string) {
    sonnerToast.success(message);
  },

  info(message: string) {
    sonnerToast.info(message);
  },

  error(error: unknown, fallback = 'Something went wrong. Please try again.') {
    sonnerToast.error(getApiErrorMessage(error, fallback));
  },

  promise<T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error?: string },
  ) {
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: (error) => getApiErrorMessage(error, messages.error ?? 'Action failed.'),
    });
  },
};

/** @deprecated Use adminToast — kept for gradual migration. */
export const toast = adminToast;
