import { useEffect, useState, type ReactNode } from 'react';

import { useAuthStore } from '@/stores/auth-store';

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [hasHydrated, setHasHydrated] = useState(
    () => useAuthStore.persist.hasHydrated(),
  );

  useEffect(() => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setHasHydrated(true);
    });

    useAuthStore.persist.rehydrate();

    return unsubscribe;
  }, []);

  if (!hasHydrated) {
    return (
      <div className="bg-background flex min-h-svh items-center justify-center">
        <div className="text-muted-foreground text-sm">Đang tải...</div>
      </div>
    );
  }

  return children;
}
