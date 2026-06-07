import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

import { AUTH_API } from '@/lib/auth/constants';
import { unwrapAuthResponse } from '@/lib/auth/session';
import type { ApiResponse } from '@/services/types/api';
import type { AuthenticationDto } from '@/services/auth/types';
import { ROUTES } from '@/routes';
import { useAuthStore } from '@/stores/auth-store';

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let refreshPromise: Promise<AuthenticationDto> | null = null;

export const httpClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

httpClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes(AUTH_API.token) ||
      originalRequest.url?.includes(AUTH_API.refresh)
    ) {
      return Promise.reject(error);
    }

    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      useAuthStore.getState().clearSession();
      redirectToLogin();
      return Promise.reject(error);
    }

    try {
      originalRequest._retry = true;
      const session = await refreshAccessTokenSingleFlight(refreshToken);
      useAuthStore.getState().setSession(session);
      originalRequest.headers.Authorization = `Bearer ${session.accessToken}`;
      return httpClient(originalRequest);
    } catch {
      useAuthStore.getState().clearSession();
      redirectToLogin();
      return Promise.reject(error);
    }
  },
);

async function refreshAccessTokenSingleFlight(
  refreshToken: string,
): Promise<AuthenticationDto> {
  if (!refreshPromise) {
    refreshPromise = httpClient
      .post<ApiResponse<AuthenticationDto>>(AUTH_API.refresh, { refreshToken })
      .then(({ data }) =>
        unwrapAuthResponse(data, 'Phiên đăng nhập đã hết hạn.'),
      )
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

function redirectToLogin() {
  if (window.location.pathname !== ROUTES.login) {
    window.location.assign(ROUTES.login);
  }
}
