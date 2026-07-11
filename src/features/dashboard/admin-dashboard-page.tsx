import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { ADMIN_PAGE_META } from '@/lib/admin-page-meta';
import { auditActionLabel } from '@/lib/audit-labels';
import { BRAND } from '@/lib/brand/constants';
import { formatDateTime } from '@/lib/format';
import { useAdminPageMeta } from '@/lib/page-meta';
import { useAuthStore } from '@/stores/auth-store';

import { AttentionSection, type AttentionColumnConfig } from './components/attention-section';
import { DashboardQuickLinks } from './components/dashboard-quick-links';
import { StatsOverview } from './components/stats-overview';
import { DASHBOARD_QUICK_LINKS } from './constants/quick-links';
import { useDashboardData } from './hooks/use-dashboard-data';

import type {
  AdminPaymentOrderResponse,
  AuditLogResponse,
  UgcReportResponse,
} from '@/services/types/domain';

/**
 * Admin dashboard overview page.
 * Displays platform stats, chart, quick actions, and items needing attention.
 */
export function AdminDashboardPage() {
  useAdminPageMeta(ADMIN_PAGE_META.dashboard);

  const user = useAuthStore((state) => state.user);
  const displayName = user?.name?.trim() || 'Admin';

  const { statsQuery, reportsQuery, failedPaymentsQuery, auditQuery } =
    useDashboardData();

  const attentionColumns: AttentionColumnConfig<
    UgcReportResponse | AdminPaymentOrderResponse | AuditLogResponse
  >[] = [
    {
      title: 'Pending reports',
      viewAllHref: '/moderation',
      items: reportsQuery.data?.data ?? [],
      isLoading: reportsQuery.isLoading,
      isError: reportsQuery.isError,
      error: reportsQuery.error,
      emptyMessage: 'No pending reports.',
      onRetry: () => void reportsQuery.refetch(),
      renderPrimary: (item) => {
        if ('reason' in item) return item.reason;
        return '';
      },
      renderSecondary: (item) => {
        if ('reporterDisplayName' in item)
          return `${item.reporterDisplayName} \u00b7 ${formatDateTime(item.createdAt)}`;
        return '';
      },
      keyExtractor: (item) => {
        if ('id' in item && !('orderId' in item)) return item.id;
        return '';
      },
    },
    {
      title: 'Enrollment failures',
      viewAllHref: '/payments',
      items: failedPaymentsQuery.data?.data ?? [],
      isLoading: failedPaymentsQuery.isLoading,
      isError: failedPaymentsQuery.isError,
      error: failedPaymentsQuery.error,
      emptyMessage: 'No enrollment failures.',
      onRetry: () => void failedPaymentsQuery.refetch(),
      renderPrimary: (item) => {
        if ('userDisplayName' in item) return item.userDisplayName;
        return '';
      },
      renderSecondary: (item) => {
        if ('courseRunCode' in item)
          return `${item.courseRunCode} \u00b7 ${formatDateTime(item.createdAt)}`;
        return '';
      },
      keyExtractor: (item) => {
        if ('orderId' in item) return item.orderId;
        return '';
      },
    },
    {
      title: 'Recent activity',
      viewAllHref: '/audit-logs',
      items: auditQuery.data?.data ?? [],
      isLoading: auditQuery.isLoading,
      isError: auditQuery.isError,
      error: auditQuery.error,
      emptyMessage: 'No recent activity.',
      onRetry: () => void auditQuery.refetch(),
      renderPrimary: (item) => {
        if ('action' in item && !('reason' in item)) return auditActionLabel(item.action);
        return '';
      },
      renderSecondary: (item) => {
        if ('actorDisplay' in item && !('reporterDisplayName' in item))
          return `${item.actorDisplay ?? 'System'} \u00b7 ${formatDateTime(item.createdAt)}`;
        return '';
      },
      keyExtractor: (item) => {
        if ('id' in item && !('orderId' in item) && !('reporterId' in item))
          return item.id;
        return '';
      },
    },
  ];

  return (
    <AdminPageShell
      title={`Hello, ${displayName}`}
      description={`Overview of learners, content, events, and operations across ${BRAND.name}.`}
    >
      <div className="space-y-6">
        <StatsOverview
          stats={statsQuery.data}
          isLoading={statsQuery.isLoading}
          isError={statsQuery.isError}
          error={statsQuery.error}
          onRetry={() => void statsQuery.refetch()}
        />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DashboardQuickLinks items={DASHBOARD_QUICK_LINKS} />
          </div>
        </div>

        <AttentionSection columns={attentionColumns} />
      </div>
    </AdminPageShell>
  );
}
