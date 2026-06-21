import { queryClient } from '@/lib/query-client';
import { ROUTES } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Clears the admin session and cached protected data before redirecting to login.
 */
export function clearAdminSessionAndRedirect(): void {
  useAuthStore.getState().clearSession();
  queryClient.clear();

  if (window.location.pathname !== ROUTES.login) {
    window.location.assign(ROUTES.login);
  }
}
