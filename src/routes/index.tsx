import { Suspense, type ReactNode } from 'react';
import {
  Navigate,
  Outlet,
  createBrowserRouter,
} from 'react-router-dom';

import { LoginPage } from '@/features/authentication';
import { AdminRouteLoading } from '@/components/admin/admin-query-state';
import { AdminLayout } from '@/layouts/admin-layout';
import { lazyWithRetry } from '@/lib/lazy-with-retry';
import { ROUTES } from '@/routes/paths';
import { RouteErrorElement } from '@/routes/route-error-element';
import { selectIsAuthenticated, useAuthStore } from '@/stores/auth-store';

const AdminDashboardPage = lazyWithRetry(() =>
  import('@/features/dashboard').then((m) => ({ default: m.AdminDashboardPage })),
);
const UsersListPage = lazyWithRetry(() =>
  import('@/features/users/users-list-page').then((m) => ({ default: m.UsersListPage })),
);
const ProgramsListPage = lazyWithRetry(() =>
  import('@/features/programs/programs-list-page').then((m) => ({
    default: m.ProgramsListPage,
  })),
);
const CoursesListPage = lazyWithRetry(() =>
  import('@/features/courses/courses-list-page').then((m) => ({
    default: m.CoursesListPage,
  })),
);
const CourseDetailPage = lazyWithRetry(() =>
  import('@/features/courses/course-detail-page').then((m) => ({
    default: m.CourseDetailPage,
  })),
);
const CourseRunsListPage = lazyWithRetry(() =>
  import('@/features/course-runs/course-runs-list-page').then((m) => ({
    default: m.CourseRunsListPage,
  })),
);
const CourseRunDetailPage = lazyWithRetry(() =>
  import('@/features/course-runs/course-run-detail-page').then((m) => ({
    default: m.CourseRunDetailPage,
  })),
);
const SyllabusItemDetailPage = lazyWithRetry(() =>
  import('@/features/syllabus-items/syllabus-item-detail-page').then((m) => ({
    default: m.SyllabusItemDetailPage,
  })),
);
const EventsListPage = lazyWithRetry(() =>
  import('@/features/events/events-list-page').then((m) => ({
    default: m.EventsListPage,
  })),
);
const EventDetailPage = lazyWithRetry(() =>
  import('@/features/events/event-detail-page').then((m) => ({
    default: m.EventDetailPage,
  })),
);
const PaymentsPage = lazyWithRetry(() =>
  import('@/features/payments/payments-page').then((m) => ({ default: m.PaymentsPage })),
);
const RevenueDashboardPage = lazyWithRetry(() =>
  import('@/features/revenue').then((m) => ({ default: m.RevenueDashboardPage })),
);
const NotificationsPage = lazyWithRetry(() =>
  import('@/features/notifications/notifications-page').then((m) => ({
    default: m.NotificationsPage,
  })),
);
const ModerationPage = lazyWithRetry(() =>
  import('@/features/moderation/moderation-page').then((m) => ({
    default: m.ModerationPage,
  })),
);
const AuditLogsPage = lazyWithRetry(() =>
  import('@/features/audit-logs/audit-logs-page').then((m) => ({
    default: m.AuditLogsPage,
  })),
);
const SettingsPage = lazyWithRetry(() =>
  import('@/features/settings/settings-page').then((m) => ({ default: m.SettingsPage })),
);

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

function LazyPage({ children }: { children: ReactNode }) {
  return <Suspense fallback={<AdminRouteLoading />}>{children}</Suspense>;
}

export const appRouter = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <RouteErrorElement />,
    children: [
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
            element: <AdminLayout />,
            children: [
              {
                path: ROUTES.home,
                element: (
                  <LazyPage>
                    <AdminDashboardPage />
                  </LazyPage>
                ),
              },
              {
                path: ROUTES.users,
                element: (
                  <LazyPage>
                    <UsersListPage />
                  </LazyPage>
                ),
              },
              {
                path: ROUTES.programs,
                element: (
                  <LazyPage>
                    <ProgramsListPage />
                  </LazyPage>
                ),
              },
              {
                path: '/programs/:programId/courses',
                element: (
                  <LazyPage>
                    <CoursesListPage />
                  </LazyPage>
                ),
              },
              {
                path: ROUTES.courses,
                element: (
                  <LazyPage>
                    <CoursesListPage />
                  </LazyPage>
                ),
              },
              {
                path: '/courses/:courseId',
                element: (
                  <LazyPage>
                    <CourseDetailPage />
                  </LazyPage>
                ),
              },
              {
                path: ROUTES.courseRuns,
                element: (
                  <LazyPage>
                    <CourseRunsListPage />
                  </LazyPage>
                ),
              },
              {
                path: '/course-runs/:runId',
                element: (
                  <LazyPage>
                    <CourseRunDetailPage />
                  </LazyPage>
                ),
              },
              {
                path: '/syllabus-items/:itemId',
                element: (
                  <LazyPage>
                    <SyllabusItemDetailPage />
                  </LazyPage>
                ),
              },
              {
                path: ROUTES.events,
                element: (
                  <LazyPage>
                    <EventsListPage />
                  </LazyPage>
                ),
              },
              {
                path: '/events/:eventId',
                element: (
                  <LazyPage>
                    <EventDetailPage />
                  </LazyPage>
                ),
              },
              {
                path: ROUTES.payments,
                element: (
                  <LazyPage>
                    <PaymentsPage />
                  </LazyPage>
                ),
              },
              {
                path: ROUTES.revenue,
                element: (
                  <LazyPage>
                    <RevenueDashboardPage />
                  </LazyPage>
                ),
              },
              {
                path: ROUTES.notifications,
                element: (
                  <LazyPage>
                    <NotificationsPage />
                  </LazyPage>
                ),
              },
              {
                path: ROUTES.moderation,
                element: (
                  <LazyPage>
                    <ModerationPage />
                  </LazyPage>
                ),
              },
              {
                path: ROUTES.auditLogs,
                element: (
                  <LazyPage>
                    <AuditLogsPage />
                  </LazyPage>
                ),
              },
              {
                path: ROUTES.settings,
                element: (
                  <LazyPage>
                    <SettingsPage />
                  </LazyPage>
                ),
              },
            ],
          },
        ],
      },
      {
        path: '*',
        element: <CatchAllRoute />,
      },
    ],
  },
]);

export { ROUTES };
