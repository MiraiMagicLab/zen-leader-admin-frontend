export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    login: () => [...queryKeys.auth.all, 'login'] as const,
    logout: () => [...queryKeys.auth.all, 'logout'] as const,
  },
} as const;
