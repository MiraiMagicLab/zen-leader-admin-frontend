/** POST /api/v1/auth/token */
export type LoginRequest = {
  email: string;
  passwordHash: string;
};

/** POST /api/v1/auth/refresh | /logout */
export type RefreshTokenRequest = {
  refreshToken: string;
};

/** Khớp AuthenticationResponse từ backend (chỉ chứa token) */
export type TokenResponseDto = {
  authenticated: boolean;
  accessToken: string;
  refreshToken: string;
};

export type AuthUserDto = {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  profileRole?: string;
  isActive?: boolean;
  isVerified?: boolean;
  active?: boolean;
  verified?: boolean;
  roles: string[];
  createdAt?: string;
  updatedAt?: string;
};

/** Khớp thông tin session gộp ở Frontend */
export type AuthenticationDto = TokenResponseDto & {
  user: AuthUserDto;
};

