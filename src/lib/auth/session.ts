import type { AuthUserDto } from '@/services/auth/types';
import type { ApiResponse } from '@/services/types/api';
import { ADMIN_ROLE } from '@/lib/auth/constants';
import type { AuthUser } from '@/stores/auth-store';

export function mapAuthUser(dto: AuthUserDto): AuthUser {
  return {
    id: dto.id,
    email: dto.email,
    username: dto.email,
    name: dto.displayName?.trim() || dto.email,
    role: dto.roles?.[0] || 'USER',
    avatarUrl: dto.avatarUrl,
  };
}

export function assertAdminUser(user: AuthUserDto): void {
  const hasAdminRole = user.roles?.some(
    (role) => role.toUpperCase() === ADMIN_ROLE,
  );
  if (!hasAdminRole) {
    throw new Error('Account does not have Admin access.');
  }
  
  const isVerified = user.isVerified ?? user.verified;
  if (!isVerified) {
    throw new Error('Account email has not been verified.');
  }

  const isActive = user.isActive ?? user.active;
  if (!isActive) {
    throw new Error('Account has been disabled.');
  }
}

export function unwrapAuthResponse<T extends { accessToken: string }>(
  response: ApiResponse<T>,
  fallbackMessage: string,
): T {
  if (!response.success || !response.data?.accessToken) {
    throw new Error(
      response.errorMessage?.message ??
        response.message ??
        fallbackMessage,
    );
  }

  return response.data;
}

