import type { AuthenticationDto, AuthUserDto } from '@/services/auth/types';
import type { ApiResponse } from '@/services/types/api';
import { ADMIN_ROLE } from '@/lib/auth/constants';
import type { AuthUser } from '@/stores/auth-store';

export function mapAuthUser(dto: AuthUserDto): AuthUser {
  return {
    id: dto.id,
    email: dto.email,
    username: dto.email,
    name: dto.displayName?.trim() || dto.email,
    role: dto.role,
    avatarUrl: dto.avatarUrl,
  };
}

export function assertAdminUser(user: AuthUserDto): void {
  if (user.role?.toUpperCase() !== ADMIN_ROLE) {
    throw new Error('Tài khoản không có quyền truy cập Admin.');
  }
  if (!user.isVerified) {
    throw new Error('Tài khoản chưa được xác minh email.');
  }
  if (!user.isActive) {
    throw new Error('Tài khoản đã bị vô hiệu hóa.');
  }
}

export function unwrapAuthResponse(
  response: ApiResponse<AuthenticationDto>,
  fallbackMessage: string,
): AuthenticationDto {
  if (!response.success || !response.data?.accessToken) {
    throw new Error(
      response.errorMessage?.message ??
        response.message ??
        fallbackMessage,
    );
  }

  return response.data;
}
