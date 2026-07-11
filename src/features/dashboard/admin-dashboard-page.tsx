import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { ADMIN_PAGE_META } from '@/lib/admin-page-meta';
import { BRAND } from '@/lib/brand/constants';
import { formatDateTime } from '@/lib/format';
import { useAdminPageMeta } from '@/lib/page-meta';
import { useAuthStore } from '@/stores/auth-store';

import {
  NeedsAttentionSection,
  type NeedsAttentionColumnConfig,
} from './components/needs-attention-section';
import { RecentActivitySection } from './components/recent-activity-section';
import { DashboardQuickLinks } from './components/dashboard-quick-links';
import { StatsOverview } from './components/stats-overview';
import { DASHBOARD_QUICK_LINKS } from './constants/quick-links';
import { useDashboardData } from './hooks/use-dashboard-data';

import type {
  AdminPaymentOrderResponse,
  UgcReportResponse,
} from '@/services/types/domain';

/**
 * Admin dashboard overview page.
 * Displays platform stats, quick actions, actionable queues, and recent audit activity.
 */
export function AdminDashboardPage() {
  useAdminPageMeta(ADMIN_PAGE_META.dashboard);

  const user = useAuthStore((state) => state.user);
  const displayName = user?.name?.trim() || 'Admin';

  const { statsQuery, reportsQuery, failedPaymentsQuery, auditQuery } =
    useDashboardData();

  const needsAttentionColumns: NeedsAttentionColumnConfig<
    UgcReportResponse | AdminPaymentOrderResponse
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
          return `${item.reporterDisplayName} · ${formatDateTime(item.createdAt)}`;
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
          return `${item.courseRunCode} · ${formatDateTime(item.createdAt)}`;
        return '';
      },
      keyExtractor: (item) => {
        if ('orderId' in item) return item.orderId;
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

        <div className="grid gap-6 xl:grid-cols-12">
          <div className="xl:col-span-4">
            <NeedsAttentionSection columns={needsAttentionColumns} />
          </div>
          <div className="xl:col-span-5">
            <RecentActivitySection
              items={auditQuery.data?.data ?? []}
              isLoading={auditQuery.isLoading}
              isError={auditQuery.isError}
              error={auditQuery.error}
              onRetry={() => void auditQuery.refetch()}
            />
          </div>
          <div className="xl:col-span-3">
            <DashboardQuickLinks items={DASHBOARD_QUICK_LINKS} />
          </div>
        </div>
      </div>
    </AdminPageShell>
  );
}
