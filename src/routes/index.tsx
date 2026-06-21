import {
  Navigate,
  Outlet,
  createBrowserRouter,
} from 'react-router-dom';

import { AuditLogsPage } from '@/features/audit-logs/audit-logs-page';
import { LoginPage } from '@/features/authentication';
import { CourseRunDetailPage } from '@/features/course-runs/course-run-detail-page';
import { CourseRunsListPage } from '@/features/course-runs/course-runs-list-page';
import { CourseDetailPage } from '@/features/courses/course-detail-page';
import { CoursesListPage } from '@/features/courses/courses-list-page';
import { AdminDashboardPage } from '@/features/dashboard';
import { EventDetailPage } from '@/features/events/event-detail-page';
import { EventsListPage } from '@/features/events/events-list-page';
import { SyllabusItemDetailPage } from '@/features/syllabus-items/syllabus-item-detail-page';
import { ModerationPage } from '@/features/moderation/moderation-page';
import { PaymentsPage } from '@/features/payments/payments-page';
import { ProgramsListPage } from '@/features/programs/programs-list-page';
import { UserDetailPage } from '@/features/users/user-detail-page';
import { UsersListPage } from '@/features/users/users-list-page';
import { AdminLayout } from '@/layouts/admin-layout';
import { ROUTES } from '@/routes/paths';
import { selectIsAuthenticated, useAuthStore } from '@/stores/auth-store';

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
        element: <AdminLayout />,
        children: [
          { path: ROUTES.home, element: <AdminDashboardPage /> },
          { path: ROUTES.users, element: <UsersListPage /> },
          { path: '/users/:userId', element: <UserDetailPage /> },
          { path: ROUTES.programs, element: <ProgramsListPage /> },
          {
            path: '/programs/:programId/courses',
            element: <CoursesListPage />,
          },
          { path: ROUTES.courses, element: <CoursesListPage /> },
          { path: '/courses/:courseId', element: <CourseDetailPage /> },
          { path: ROUTES.courseRuns, element: <CourseRunsListPage /> },
          { path: '/course-runs/:runId', element: <CourseRunDetailPage /> },
          { path: '/syllabus-items/:itemId', element: <SyllabusItemDetailPage /> },
          { path: ROUTES.events, element: <EventsListPage /> },
          { path: '/events/:eventId', element: <EventDetailPage /> },
          { path: ROUTES.payments, element: <PaymentsPage /> },
          { path: ROUTES.moderation, element: <ModerationPage /> },
          { path: ROUTES.auditLogs, element: <AuditLogsPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <CatchAllRoute />,
  },
]);

export { ROUTES };
