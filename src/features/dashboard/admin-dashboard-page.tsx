import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CreditCard,
  GraduationCap,
  ScrollText,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { AdminQueryError } from '@/components/admin/admin-query-state';
import { QuickLinks } from '@/components/admin/quick-links';
import { StatCard } from '@/components/admin/stat-card';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminSkeletonBar } from '@/components/admin/admin-loading';
import { queryKeys } from '@/hooks/query-keys';
import { ADMIN_PAGE_META } from '@/lib/admin-page-meta';
import { BRAND } from '@/lib/brand/constants';
import { formatDateTime, formatNumber } from '@/lib/format';
import { useAdminPageMeta } from '@/lib/page-meta';
import { ROUTES } from '@/routes/paths';
import { auditLogsApi } from '@/services/audit-logs/audit-logs-api';
import { courseRunsApi } from '@/services/course-runs/course-runs-api';
import { coursesApi } from '@/services/courses/courses-api';
import { eventsApi } from '@/services/events/events-api';
import { getApiErrorMessage } from '@/services/lib/get-api-error-message';
import { paymentsApi } from '@/services/payments/payments-api';
import { programsApi } from '@/services/programs/programs-api';
import { safetyApi } from '@/services/safety/safety-api';
import { getUsersApi } from '@/services/users/users-api';
import { useAuthStore } from '@/stores/auth-store';

const quickLinks = [
  {
    title: 'Manage users',
    description: 'Roles, account locks, and student profiles.',
    href: ROUTES.users,
    icon: Users,
  },
  {
    title: 'Create course',
    description: 'Add courses, syllabus, and course runs.',
    href: ROUTES.courses,
    icon: BookOpen,
  },
  {
    title: 'Manage events',
    description: 'Schedules, publishing status, and event details.',
    href: ROUTES.events,
    icon: CalendarDays,
  },
  {
    title: 'Review reports',
    description: 'Handle reports and community safety actions.',
    href: ROUTES.moderation,
    icon: ShieldAlert,
  },
  {
    title: 'Check payments',
    description: 'Review orders and resolve pending enrollments.',
    href: ROUTES.payments,
    icon: CreditCard,
  },
];

const CHART_CONFIG: ChartConfig = {
  count: {
    label: 'Count',
    color: 'var(--primary)',
  },
};

const ATTENTION_PAGE_SIZE = 5;

export function AdminDashboardPage() {
  useAdminPageMeta(ADMIN_PAGE_META.dashboard);

  const user = useAuthStore((state) => state.user);
  const displayName = user?.name?.trim() || 'Admin';

  const statsQuery = useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: async () => {
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
    queryFn: () => paymentsApi.listOrders(0, ATTENTION_PAGE_SIZE, 'ENROLL_FAILED'),
  });

  const auditQuery = useQuery({
    queryKey: queryKeys.auditLogs.list({ page: 1, size: ATTENTION_PAGE_SIZE }),
    queryFn: () => auditLogsApi.getAll({ page: 1, size: ATTENTION_PAGE_SIZE }),
  });

  const stats = statsQuery.data;
  const isLoading = statsQuery.isLoading;

  const chartData = [
    { label: 'Users', count: stats?.users ?? 0 },
    { label: 'Programs', count: stats?.programs ?? 0 },
    { label: 'Courses', count: stats?.courses ?? 0 },
    { label: 'Runs', count: stats?.runs ?? 0 },
    { label: 'Events', count: stats?.events ?? 0 },
  ];

  const pendingReports = reportsQuery.data?.data ?? [];
  const failedPayments = failedPaymentsQuery.data?.data ?? [];
  const recentAuditLogs = auditQuery.data?.data ?? [];

  return (
    <AdminPageShell
      title={`Hello, ${displayName}`}
      description={`Overview of learners, content, events, and operations across ${BRAND.name}.`}
    >
      <div className="space-y-6">
      {statsQuery.isError ? (
        <AdminQueryError
          message={getApiErrorMessage(statsQuery.error)}
          onRetry={() => void statsQuery.refetch()}
        />
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard
          title="Users"
          value={formatNumber(stats?.users ?? 0)}
          icon={Users}
          href={ROUTES.users}
          isLoading={isLoading}
        />
        <StatCard
          title="Programs"
          value={formatNumber(stats?.programs ?? 0)}
          icon={GraduationCap}
          href={ROUTES.programs}
          isLoading={isLoading}
        />
        <StatCard
          title="Courses"
          value={formatNumber(stats?.courses ?? 0)}
          icon={BookOpen}
          href={ROUTES.courses}
          isLoading={isLoading}
        />
        <StatCard
          title="Course runs"
          value={formatNumber(stats?.runs ?? 0)}
          icon={Activity}
          href={ROUTES.courseRuns}
          isLoading={isLoading}
        />
        <StatCard
          title="Events"
          value={formatNumber(stats?.events ?? 0)}
          icon={CalendarDays}
          href={ROUTES.events}
          isLoading={isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Platform counts</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={CHART_CONFIG} className="aspect-auto h-[240px] w-full">
              <BarChart data={chartData} margin={{ left: 4, right: 4 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">Quick actions</h2>
          <QuickLinks items={quickLinks} />
        </section>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="text-amber-500 size-4" />
            Needs attention
          </CardTitle>
          <Badge variant="secondary">Recent</Badge>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          {reportsQuery.isError ? (
            <AdminQueryError
              title="Reports"
              message={getApiErrorMessage(reportsQuery.error)}
              onRetry={() => void reportsQuery.refetch()}
              className="lg:col-span-3"
            />
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Pending reports</p>
                <Link to={ROUTES.moderation} className="text-primary text-xs hover:underline">
                  View all
                </Link>
              </div>
              {reportsQuery.isLoading ? (
                <div className="space-y-1.5">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <AdminSkeletonBar key={index} className="h-11 w-full rounded-md" />
                  ))}
                </div>
              ) : pendingReports.length === 0 ? (
                <p className="text-muted-foreground text-sm">No pending reports.</p>
              ) : (
                <ul className="space-y-1.5">
                  {pendingReports.map((report) => (
                    <li key={report.id} className="rounded-md border p-2 text-sm">
                      <p className="truncate font-medium">{report.reason}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {report.reporterDisplayName} · {formatDateTime(report.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {failedPaymentsQuery.isError ? (
            <AdminQueryError
              title="Payments"
              message={getApiErrorMessage(failedPaymentsQuery.error)}
              onRetry={() => void failedPaymentsQuery.refetch()}
              className="lg:col-span-3"
            />
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Enrollment failures</p>
                <Link to={ROUTES.payments} className="text-primary text-xs hover:underline">
                  View all
                </Link>
              </div>
              {failedPaymentsQuery.isLoading ? (
                <div className="space-y-1.5">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <AdminSkeletonBar key={index} className="h-11 w-full rounded-md" />
                  ))}
                </div>
              ) : failedPayments.length === 0 ? (
                <p className="text-muted-foreground text-sm">No enrollment failures.</p>
              ) : (
                <ul className="space-y-1.5">
                  {failedPayments.map((order) => (
                    <li key={order.orderId} className="rounded-md border p-2 text-sm">
                      <p className="truncate font-medium">{order.userDisplayName}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {order.courseRunCode} · {formatDateTime(order.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {auditQuery.isError ? (
            <AdminQueryError
              title="Audit log"
              message={getApiErrorMessage(auditQuery.error)}
              onRetry={() => void auditQuery.refetch()}
              className="lg:col-span-3"
            />
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <ScrollText className="size-3.5" />
                  Recent activity
                </p>
                <Link to={ROUTES.auditLogs} className="text-primary text-xs hover:underline">
                  View all
                </Link>
              </div>
              {auditQuery.isLoading ? (
                <div className="space-y-1.5">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <AdminSkeletonBar key={index} className="h-11 w-full rounded-md" />
                  ))}
                </div>
              ) : recentAuditLogs.length === 0 ? (
                <p className="text-muted-foreground text-sm">No recent activity.</p>
              ) : (
                <ul className="space-y-1.5">
                  {recentAuditLogs.map((log) => (
                    <li key={log.id} className="rounded-md border p-2 text-sm">
                      <p className="truncate font-medium">{log.action}</p>
                      <p className="text-muted-foreground truncate text-xs">
                        {log.actorDisplay ?? 'System'} · {formatDateTime(log.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </AdminPageShell>
  );
}
