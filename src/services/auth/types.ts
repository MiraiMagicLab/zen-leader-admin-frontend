/** POST /api/v1/auth/token */
export type LoginRequest = {
  email: string;
  password: string;
};

/** POST /api/v1/auth/refresh | /logout */
export type RefreshTokenRequest = {
  refreshToken: string;
};

/** Khớp UserResponse từ backend */
export type AuthUserDto = {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  profileRole?: string;
  isActive: boolean;
  isVerified: boolean;
  role: string;
  createdAt?: string;
  updatedAt?: string;
};

/** Khớp AuthenticationResponse từ backend */
export type AuthenticationDto = {
  authenticated: boolean;
  accessToken: string;
  refreshToken: string;
  user: AuthUserDto;
};
