import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/query-keys';
import { auditLogsApi } from '@/services/audit-logs/audit-logs-api';
import { courseRunsApi } from '@/services/course-runs/course-runs-api';
import { coursesApi } from '@/services/courses/courses-api';
import { eventsApi } from '@/services/events/events-api';
import { paymentsApi } from '@/services/payments/payments-api';
import { programsApi } from '@/services/programs/programs-api';
import { safetyApi } from '@/services/safety/safety-api';
import { getUsersApi } from '@/services/users/users-api';

const ATTENTION_PAGE_SIZE = 5;

/** Platform-wide stats fetched in parallel from 5 endpoints. */
export type DashboardStats = {
  users: number;
  programs: number;
  courses: number;
  runs: number;
  events: number;
};

/** Aggregated queries for the admin dashboard overview. */
export function useDashboardData() {
  const statsQuery = useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: async (): Promise<DashboardStats> => {
      const [users, programs, courses, runs, events] = await Promise.all([
        getUsersApi({ page: 1, size: 1 }),
        programsApi.getPage(0, 1),
        coursesApi.getPage(0, 1),
        courseRunsApi.getPage(0, 1),
        eventsApi.getAll(0, 1, true),
      ]);
      return {
        users: users.totalElement,
        programs: programs.totalElement,
        courses: courses.totalElement,
        runs: runs.totalElement,
        events: events.totalElement,
      };
    },
  });

  const reportsQuery = useQuery({
    queryKey: queryKeys.safety.reports(0, 'PENDING', ''),
    queryFn: () => safetyApi.listReports(0, ATTENTION_PAGE_SIZE, 'PENDING'),
  });

  const failedPaymentsQuery = useQuery({
    queryKey: queryKeys.payments.list(0, 'ENROLL_FAILED', ''),
    queryFn: () =>
      paymentsApi.listOrders(0, ATTENTION_PAGE_SIZE, 'ENROLL_FAILED'),
  });

  const auditQuery = useQuery({
    queryKey: queryKeys.auditLogs.list({ page: 1, size: ATTENTION_PAGE_SIZE }),
    queryFn: () =>
      auditLogsApi.getAll({ page: 1, size: ATTENTION_PAGE_SIZE }),
  });

  return {
    statsQuery,
    reportsQuery,
    failedPaymentsQuery,
    auditQuery,
  };
}
