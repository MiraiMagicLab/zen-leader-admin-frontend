import { useMutation } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/query-keys';
import { queryClient } from '@/lib/query-client';
import { loginApi, logoutApi, getUserMeApi } from '@/services/auth';
import type { LoginRequest, AuthenticationDto } from '@/services/auth';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import { useAuthStore } from '@/stores/auth-store';

export function useLoginMutation() {
  const setSession = useAuthStore((state) => state.setSession);

  return useMutation({
    mutationKey: queryKeys.auth.login(),
    mutationFn: async (payload: LoginRequest): Promise<AuthenticationDto> => {
      const tokenResponse = await loginApi(payload);
      const user = await getUserMeApi(tokenResponse.accessToken);
      return {
        ...tokenResponse,
        user,
      };
    },
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
  return getApiErrorMessage(error, 'Login failed. Please try again.');
}
