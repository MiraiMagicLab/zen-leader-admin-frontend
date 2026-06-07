import {
  Navigate,
  Outlet,
  createBrowserRouter,
} from 'react-router-dom';

import { LoginPage } from '@/features/authentication';
import { AdminDashboardPage } from '@/features/dashboard';
import { selectIsAuthenticated, useAuthStore } from '@/stores/auth-store';

/** Đường dẫn app */
export const ROUTES = {
  home: '/',
  login: '/login',
} as const;

function ProtectedRoute() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace />;
  }

  return <Outlet />;
}

function GuestRoute() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  if (isAuthenticated) {
    return <Navigate to={ROUTES.home} replace />;
  }

  return <Outlet />;
}

function CatchAllRoute() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  return (
    <Navigate
      to={isAuthenticated ? ROUTES.home : ROUTES.login}
      replace
    />
  );
}

export const appRouter = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [
      {
        path: ROUTES.login,
        element: <LoginPage />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: ROUTES.home,
        element: <AdminDashboardPage />,
      },
    ],
  },
  {
    path: '*',
    element: <CatchAllRoute />,
  },
]);
