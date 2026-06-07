import { AUTH_API } from '@/lib/auth/constants';
import { unwrapAuthResponse } from '@/lib/auth/session';
import type { ApiResponse } from '@/services/types/api';
import type {
  AuthenticationDto,
  LoginRequest,
  RefreshTokenRequest,
} from '@/services/auth/types';
import { httpClient } from '@/services/http-client';

export async function loginApi(payload: LoginRequest): Promise<AuthenticationDto> {
  const { data } = await httpClient.post<ApiResponse<AuthenticationDto>>(
    AUTH_API.token,
    payload,
  );

  return unwrapAuthResponse(data, 'Đăng nhập thất bại.');
}

export async function logoutApi(refreshToken: string): Promise<void> {
  await httpClient.post<ApiResponse<void>>(AUTH_API.logout, {
    refreshToken,
  } satisfies RefreshTokenRequest);
}
