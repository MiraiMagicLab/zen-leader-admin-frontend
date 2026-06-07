import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { assertAdminUser, mapAuthUser } from '@/lib/auth/session';
import type { AuthenticationDto } from '@/services/auth/types';

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  role: string;
  avatarUrl?: string;
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (session: AuthenticationDto) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setSession: (session) => {
        assertAdminUser(session.user);
        set({
          user: mapAuthUser(session.user),
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
        });
      },

      clearSession: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
        });
      },
    }),
    {
      name: 'lucy-admin-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);

/** Đăng nhập = có access token hợp lệ trong store (single source of truth) */
export const selectIsAuthenticated = (state: AuthState): boolean =>
  Boolean(state.accessToken && state.user);
