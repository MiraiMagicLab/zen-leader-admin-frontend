import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Activity,
  BookOpen,
  CalendarDays,
  CreditCard,
  GraduationCap,
  Layers,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react';

import { QuickLinks } from '@/components/admin/quick-links';
import { StatCard } from '@/components/admin/stat-card';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { queryKeys } from '@/hooks/query-keys';
import { BRAND } from '@/lib/brand/constants';
import { formatNumber } from '@/lib/format';
import { ROUTES } from '@/routes/paths';
import { courseRunsApi } from '@/services/course-runs/course-runs-api';
import { coursesApi } from '@/services/courses/courses-api';
import { eventsApi } from '@/services/events/events-api';
import { programsApi } from '@/services/programs/programs-api';
import { getUsersApi } from '@/services/users/users-api';
import { useAuthStore } from '@/stores/auth-store';

const quickLinks = [
  {
    title: 'Quản lý người dùng',
    description: 'Phân quyền, khóa tài khoản và xem hồ sơ học viên.',
    href: ROUTES.users,
    icon: Users,
  },
  {
    title: 'Tạo khóa học',
    description: 'Thêm chương trình, khóa học và đợt học mới.',
    href: ROUTES.courses,
    icon: BookOpen,
  },
  {
    title: 'Sự kiện & live',
    description: 'Lên lịch sự kiện và quản lý phiên live.',
    href: ROUTES.events,
    icon: CalendarDays,
  },
  {
    title: 'Kiểm duyệt nội dung',
    description: 'Xử lý báo cáo UGC và tin nhắn lớp học.',
    href: ROUTES.moderation,
    icon: ShieldAlert,
  },
];

export function AdminDashboardPage() {
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
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border bg-card px-6 py-8 shadow-sm md:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 -right-16 size-56 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-10 size-40 rounded-full bg-primary/5 blur-2xl"
        />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className="bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium">
              <Sparkles className="size-3.5" />
              Bảng điều khiển quản trị
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Xin chào, {displayName}
              </h1>
              <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed md:text-base">
                Tổng quan hoạt động nền tảng {BRAND.name} — theo dõi người dùng,
                nội dung học và vận hành hệ thống.
              </p>
            </div>
          </div>
          <div className="bg-background/70 grid grid-cols-2 gap-3 rounded-xl border p-4 backdrop-blur-sm sm:min-w-[240px]">
            <div>
              <p className="text-muted-foreground text-xs">Sự kiện</p>
              {isLoading ? (
                <Skeleton className="mt-1 h-7 w-10" />
              ) : (
                <p className="text-xl font-bold tabular-nums">
                  {formatNumber(stats?.events ?? 0)}
                </p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Đợt học</p>
              {isLoading ? (
                <Skeleton className="mt-1 h-7 w-10" />
              ) : (
                <p className="text-xl font-bold tabular-nums">
                  {formatNumber(stats?.runs ?? 0)}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Thống kê nhanh</h2>
          <p className="text-muted-foreground text-sm">
            Số liệu tổng hợp từ backend theo thời gian thực.
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Người dùng"
            value={formatNumber(stats?.users ?? 0)}
            icon={Users}
            href={ROUTES.users}
            tone="blue"
            isLoading={isLoading}
          />
          <StatCard
            title="Chương trình"
            value={formatNumber(stats?.programs ?? 0)}
            icon={GraduationCap}
            href={ROUTES.programs}
            tone="emerald"
            isLoading={isLoading}
          />
          <StatCard
            title="Khóa học"
            value={formatNumber(stats?.courses ?? 0)}
            icon={BookOpen}
            href={ROUTES.courses}
            tone="violet"
            isLoading={isLoading}
          />
          <StatCard
            title="Đợt học"
            value={formatNumber(stats?.runs ?? 0)}
            icon={Activity}
            href={ROUTES.courseRuns}
            tone="amber"
            isLoading={isLoading}
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="shadow-sm xl:col-span-2">
          <CardHeader>
            <CardTitle>Thao tác nhanh</CardTitle>
            <CardDescription>
              Truy cập nhanh các khu vực quản trị thường dùng.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QuickLinks items={quickLinks} />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Module vận hành</CardTitle>
            <CardDescription>Các mục hỗ trợ vận hành hàng ngày.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'Thanh toán & đơn hàng', icon: CreditCard, href: ROUTES.payments },
              { label: 'Đợt học đang mở', icon: Layers, href: ROUTES.courseRuns },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className="hover:bg-muted/60 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors"
                >
                  <Icon className="text-muted-foreground size-4" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
