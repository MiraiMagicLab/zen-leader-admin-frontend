import {
  Activity,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { AdminSkeletonBar } from '@/components/admin/admin-loading';
import { AdminQueryError } from '@/components/admin/admin-query-state';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/routes/paths';
import type { DashboardStats } from '../hooks/use-dashboard-data';
import { Link } from 'react-router-dom';

type StatItem = {
  label: string;
  key: keyof DashboardStats;
  icon: LucideIcon;
  href: string;
  color: string;
};

const STAT_ITEMS: StatItem[] = [
  { label: 'Users', key: 'users', icon: Users, href: ROUTES.users, color: 'text-blue-600 dark:text-blue-400' },
  { label: 'Programs', key: 'programs', icon: GraduationCap, href: ROUTES.programs, color: 'text-violet-600 dark:text-violet-400' },
  { label: 'Courses', key: 'courses', icon: BookOpen, href: ROUTES.courses, color: 'text-emerald-600 dark:text-emerald-400' },
  { label: 'Course runs', key: 'runs', icon: Activity, href: ROUTES.courseRuns, color: 'text-amber-600 dark:text-amber-400' },
  { label: 'Events', key: 'events', icon: CalendarDays, href: ROUTES.events, color: 'text-rose-600 dark:text-rose-400' },
];

const CHART_CONFIG: ChartConfig = {
  count: {
    label: 'Count',
    color: 'var(--primary)',
  },
};

type StatsOverviewProps = {
  stats: DashboardStats | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
};

/** Single stat card with icon, value, and link. */
function StatCard({
  item,
  value,
  isLoading,
}: {
  item: StatItem;
  value: number;
  isLoading: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      to={item.href}
      className="group block min-w-0 no-underline"
    >
      <div className="border-border/60 hover:border-border bg-card flex h-full items-center gap-4 rounded-xl border p-4 transition-all hover:shadow-sm">
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/60',
            item.color,
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
            {item.label}
          </p>
          {isLoading ? (
            <AdminSkeletonBar className="mt-1 h-7 w-16" />
          ) : (
            <p className="text-foreground text-2xl font-semibold tracking-tight tabular-nums">
              {formatNumber(value)}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

/**
 * Stats cards row + platform counts bar chart.
 * Renders 5 stat cards in a responsive grid, then a bar chart below.
 */
export function StatsOverview({
  stats,
  isLoading,
  isError,
  error,
  onRetry,
}: StatsOverviewProps) {
  const chartData = STAT_ITEMS.map((item) => ({
    label: item.label,
    count: stats?.[item.key] ?? 0,
  }));

  return (
    <div className="space-y-4">
      {isError ? (
        <AdminQueryError
          message={(error as Error)?.message ?? 'Failed to load stats.'}
          onRetry={onRetry}
        />
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {STAT_ITEMS.map((item) => (
          <StatCard
            key={item.key}
            item={item}
            value={stats?.[item.key] ?? 0}
            isLoading={isLoading}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Platform overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={CHART_CONFIG}
            className="aspect-auto h-[220px] w-full"
          >
            <BarChart
              data={chartData}
              margin={{ left: 4, right: 4, top: 4, bottom: 4 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={36}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="count"
                fill="var(--color-count)"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
