import { useMutation } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/query-keys';
import { queryClient } from '@/lib/query-client';
import { loginApi, logoutApi } from '@/services/auth';
import type { LoginRequest } from '@/services/auth';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import { useAuthStore } from '@/stores/auth-store';

export function useLoginMutation() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationKey: queryKeys.auth.login(),
    mutationFn: (payload: LoginRequest) => loginApi(payload),
    onSuccess: setSession,
  });
}

export function useLogoutMutation() {
  const clearSession = useAuthStore((state) => state.clearSession);

  return useMutation({
    mutationKey: queryKeys.auth.logout(),
    mutationFn: async () => {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        await logoutApi(refreshToken);
      }
    },
    onSettled: () => {
      clearSession();
      queryClient.clear();
    },
  });
}

export function getAuthMutationErrorMessage(error: unknown): string {
  return getApiErrorMessage(error, 'Đăng nhập thất bại. Vui lòng thử lại.');
}
