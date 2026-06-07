import { AUTH_API } from '@/lib/auth/constants';
import { unwrapAuthResponse } from '@/lib/auth/session';
import type { ApiResponse } from '@/services/types/api';
import type {
  AuthUserDto,
  LoginRequest,
  RefreshTokenRequest,
  TokenResponseDto,
} from '@/services/auth/types';
import { httpClient } from '@/services/http-client';

export async function loginApi(payload: LoginRequest): Promise<TokenResponseDto> {
  const { data } = await httpClient.post<ApiResponse<TokenResponseDto>>(
    AUTH_API.token,
    payload,
  );

  return unwrapAuthResponse(data, 'Đăng nhập thất bại.');
}

export async function getUserMeApi(token: string): Promise<AuthUserDto> {
  const { data } = await httpClient.get<ApiResponse<AuthUserDto>>('/api/v1/users/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!data.success || !data.data) {
    throw new Error(
      data.errorMessage?.message ??
        data.message ??
        'Không thể lấy thông tin người dùng.',
    );
  }

  return data.data;
}

export async function logoutApi(refreshToken: string): Promise<void> {
  await httpClient.post<ApiResponse<void>>(AUTH_API.logout, {
    refreshToken,
  } satisfies RefreshTokenRequest);
}

