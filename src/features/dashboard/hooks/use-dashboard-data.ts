import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/query-keys';
import { auditLogsApi } from '@/services/audit-logs/audit-logs-api';
import { opsApi } from '@/services/ops/ops-api';
import { paymentsApi } from '@/services/payments/payments-api';
import { safetyApi } from '@/services/safety/safety-api';

const ATTENTION_PAGE_SIZE = 5;

/** Aggregated queries for the admin dashboard overview. */
export function useDashboardData() {
  const opsQuery = useQuery({
    queryKey: queryKeys.dashboard.ops(),
    queryFn: () => opsApi.getOverview(),
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
    opsQuery,
    reportsQuery,
    failedPaymentsQuery,
    auditQuery,
  };
}
