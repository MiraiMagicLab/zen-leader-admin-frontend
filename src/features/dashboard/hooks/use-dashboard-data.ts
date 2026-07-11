import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/query-keys';
import { auditLogsApi } from '@/services/audit-logs/audit-logs-api';
import { liveSessionsApi } from '@/services/live-sessions/live-sessions-api';
import { paymentsApi } from '@/services/payments/payments-api';
import { safetyApi } from '@/services/safety/safety-api';

const ATTENTION_PAGE_SIZE = 5;
const REVENUE_SAMPLE_SIZE = 200;

/** Operational metrics surfaced on the admin dashboard. */
export type DashboardOpsMetrics = {
  activeLiveSessions: number;
  pendingPayments: number;
  paidOrders: number;
  paidRevenue: number;
  paidRevenueCurrency: string;
  paidRevenueSampled: boolean;
  enrollmentFailures: number;
  pendingReports: number;
};

function sumPaidRevenue(
  orders: { amount: number; currency: string }[],
): { total: number; currency: string } {
  if (orders.length === 0) {
    return { total: 0, currency: 'VND' };
  }

  return {
    total: orders.reduce((sum, order) => sum + order.amount, 0),
    currency: orders[0]?.currency ?? 'VND',
  };
}

/** Aggregated queries for the admin dashboard overview. */
export function useDashboardData() {
  const opsQuery = useQuery({
    queryKey: queryKeys.dashboard.ops(),
    queryFn: async (): Promise<DashboardOpsMetrics> => {
      const [
        activeLiveSessions,
        pendingPayments,
        paidOrdersPage,
        enrollmentFailures,
        pendingReports,
      ] = await Promise.all([
        liveSessionsApi.list(0, 1, 'ACTIVE'),
        paymentsApi.listOrders(0, 1, 'PENDING'),
        paymentsApi.listOrders(0, REVENUE_SAMPLE_SIZE, 'PAID'),
        paymentsApi.listOrders(0, 1, 'ENROLL_FAILED'),
        safetyApi.listReports(0, 1, 'PENDING'),
      ]);

      const revenue = sumPaidRevenue(paidOrdersPage.data);

      return {
        activeLiveSessions: activeLiveSessions.totalElement,
        pendingPayments: pendingPayments.totalElement,
        paidOrders: paidOrdersPage.totalElement,
        paidRevenue: revenue.total,
        paidRevenueCurrency: revenue.currency,
        paidRevenueSampled: paidOrdersPage.totalElement > paidOrdersPage.data.length,
        enrollmentFailures: enrollmentFailures.totalElement,
        pendingReports: pendingReports.totalElement,
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
    opsQuery,
    reportsQuery,
    failedPaymentsQuery,
    auditQuery,
  };
}
