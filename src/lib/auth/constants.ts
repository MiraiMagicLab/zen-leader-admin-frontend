export const ADMIN_ROLE = 'ADMIN' as const;

export const AUTH_API = {
  base: '/api/v1/auth',
  token: '/api/v1/auth/token',
  refresh: '/api/v1/auth/refresh',
  logout: '/api/v1/auth/logout',
} as const;
