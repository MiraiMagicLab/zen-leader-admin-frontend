import { useEffect, useState, type ReactNode } from 'react';

import { ZenPageLoading } from '@/components/admin/zen-breathing-loader';
import { clearAdminSessionAndRedirect } from '@/lib/auth/session-lifecycle';
import { assertAdminUser, mapAuthUser } from '@/lib/auth/session';
import { getUserMeApi } from '@/services/auth';
import { useAuthStore } from '@/stores/auth-store';

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [hasHydrated, setHasHydrated] = useState(
    () => useAuthStore.persist.hasHydrated(),
  );
  const [isCheckingSession, setIsCheckingSession] = useState(false);

  useEffect(() => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });

    useAuthStore.persist.rehydrate();

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const accessToken = useAuthStore.getState().accessToken;
    if (!accessToken) {
      setIsCheckingSession(false);
      return;
    }

    let cancelled = false;
    setIsCheckingSession(true);

    void getUserMeApi(accessToken)
      .then((user) => {
        if (cancelled) {
          return;
        }

        assertAdminUser(user);
        useAuthStore.getState().setUser(mapAuthUser(user));
      })
      .catch(() => {
        if (!cancelled) {
          clearAdminSessionAndRedirect();
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsCheckingSession(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hasHydrated]);

  if (!hasHydrated || isCheckingSession) {
    return <ZenPageLoading fullScreen message="Preparing your workspace…" />;
  }

  return children;
}
