import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
  AxiosHeaders,
} from 'axios';

import { AUTH_API } from '@/lib/auth/constants';
import { clearAdminSessionAndRedirect } from '@/lib/auth/session-lifecycle';
import { unwrapAuthResponse } from '@/lib/auth/session';
import type { TokenResponseDto } from '@/services/auth/types';
import type { ApiResponse } from '@/services/types/api';
import { useAuthStore } from '@/stores/auth-store';

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

function isFormDataBody(data: unknown): data is FormData {
  return typeof FormData !== 'undefined' && data instanceof FormData;
}

let refreshPromise: Promise<TokenResponseDto> | null = null;

export const httpClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

httpClient.interceptors.request.use((config) => {
  const headers = AxiosHeaders.from(config.headers);

  if (config.data instanceof FormData) {
    headers.delete('Content-Type');
  }

  if (!config.url?.includes(AUTH_API.refresh)) {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  config.headers = headers;
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
      isFormDataBody(originalRequest.data) ||
      originalRequest.url?.includes(AUTH_API.token) ||
      originalRequest.url?.includes(AUTH_API.refresh)
    ) {
      return Promise.reject(error);
    }

    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      clearAdminSessionAndRedirect();
      return Promise.reject(error);
    }

    try {
      originalRequest._retry = true;
      const tokenResponse = await refreshAccessTokenSingleFlight(refreshToken);
      useAuthStore.getState().setTokens(tokenResponse.accessToken, tokenResponse.refreshToken);
      originalRequest.headers.Authorization = `Bearer ${tokenResponse.accessToken}`;
      return httpClient(originalRequest);
    } catch {
      clearAdminSessionAndRedirect();
      return Promise.reject(error);
    }
  },
);

async function refreshAccessTokenSingleFlight(
  refreshToken: string,
): Promise<TokenResponseDto> {
  if (!refreshPromise) {
    refreshPromise = httpClient
      .post<ApiResponse<TokenResponseDto>>(AUTH_API.refresh, { refreshToken })
      .then(({ data }) =>
        unwrapAuthResponse(data, 'Session expired.'),
      )
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}
