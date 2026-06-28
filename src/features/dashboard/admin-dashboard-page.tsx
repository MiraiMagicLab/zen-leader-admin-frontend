import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  BookOpen,
  CalendarDays,
  CreditCard,
  GraduationCap,
  ShieldAlert,
  Users,
} from 'lucide-react';

import { QuickLinks } from '@/components/admin/quick-links';
import { StatCard } from '@/components/admin/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { queryKeys } from '@/hooks/query-keys';
import { ADMIN_PAGE_META } from '@/lib/admin-page-meta';
import { BRAND } from '@/lib/brand/constants';
import { formatNumber } from '@/lib/format';
import { useAdminPageMeta } from '@/lib/page-meta';
import { ROUTES } from '@/routes/paths';
import { courseRunsApi } from '@/services/course-runs/course-runs-api';
import { coursesApi } from '@/services/courses/courses-api';
import { eventsApi } from '@/services/events/events-api';
import { programsApi } from '@/services/programs/programs-api';
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

  const stats = statsQuery.data;
  const isLoading = statsQuery.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hello, {displayName}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Overview of learners, content, events, and operations across {BRAND.name}.
        </p>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick actions</CardTitle>
        </CardHeader>
        <CardContent>
          <QuickLinks items={quickLinks} />
        </CardContent>
      </Card>
    </div>
  );
}
