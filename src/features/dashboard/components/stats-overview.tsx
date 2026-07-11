import {
  Activity,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';

import { AdminSkeletonBar } from '@/components/admin/admin-loading';
import { AdminQueryError } from '@/components/admin/admin-query-state';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/routes/paths';
import type { DashboardStats } from '../hooks/use-dashboard-data';

type StatKey = keyof DashboardStats;

type StatItem = {
  label: string;
  shortLabel: string;
  key: StatKey;
  icon: LucideIcon;
  href: string;
  /** CSS var from theme --chart-N */
  chartVar: `--chart-${1 | 2 | 3 | 4 | 5}`;
  /** Soft tint for icon well */
  wellClass: string;
  iconClass: string;
};

const STAT_ITEMS: StatItem[] = [
  {
    label: 'Users',
    shortLabel: 'Users',
    key: 'users',
    icon: Users,
    href: ROUTES.users,
    chartVar: '--chart-1',
    wellClass: 'bg-[color-mix(in_oklch,var(--chart-1)_16%,transparent)]',
    iconClass: 'text-[var(--chart-1)]',
  },
  {
    label: 'Programs',
    shortLabel: 'Programs',
    key: 'programs',
    icon: GraduationCap,
    href: ROUTES.programs,
    chartVar: '--chart-2',
    wellClass: 'bg-[color-mix(in_oklch,var(--chart-2)_16%,transparent)]',
    iconClass: 'text-[var(--chart-2)]',
  },
  {
    label: 'Courses',
    shortLabel: 'Courses',
    key: 'courses',
    icon: BookOpen,
    href: ROUTES.courses,
    chartVar: '--chart-3',
    wellClass: 'bg-[color-mix(in_oklch,var(--chart-3)_16%,transparent)]',
    iconClass: 'text-[var(--chart-3)]',
  },
  {
    label: 'Course runs',
    shortLabel: 'Runs',
    key: 'runs',
    icon: Activity,
    href: ROUTES.courseRuns,
    chartVar: '--chart-4',
    wellClass: 'bg-[color-mix(in_oklch,var(--chart-4)_16%,transparent)]',
    iconClass: 'text-[var(--chart-4)]',
  },
  {
    label: 'Events',
    shortLabel: 'Events',
    key: 'events',
    icon: CalendarDays,
    href: ROUTES.events,
    chartVar: '--chart-5',
    wellClass: 'bg-[color-mix(in_oklch,var(--chart-5)_16%,transparent)]',
    iconClass: 'text-[var(--chart-5)]',
  },
];

const VOLUME_CHART_CONFIG: ChartConfig = Object.fromEntries(
  STAT_ITEMS.map((item) => [
    item.key,
    { label: item.label, color: `var(${item.chartVar})` },
  ]),
) as ChartConfig;

const CATALOG_KEYS = ['programs', 'courses', 'runs', 'events'] as const;

type StatsOverviewProps = {
  stats: DashboardStats | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
};

function ratioLabel(numerator: number, denominator: number): string {
  if (denominator <= 0) return '—';
  return (numerator / denominator).toFixed(1);
}

/** Single stat card with category color and deep-link. */
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
    <Link to={item.href} className="group block min-w-0 no-underline">
      <div
        className={cn(
          'border-border/60 bg-card hover:border-border relative flex h-full items-center gap-3 overflow-hidden rounded-xl border p-4 transition-all hover:shadow-sm',
        )}
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1"
          style={{ backgroundColor: `var(${item.chartVar})` }}
        />
        <div
          className={cn(
            'ml-1 flex size-10 shrink-0 items-center justify-center rounded-lg',
            item.wellClass,
            item.iconClass,
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs font-medium tracking-wide">
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
 * Platform KPI cards + admin charts:
 * - multi-color horizontal volume bars
 * - catalog mix donut (programs / courses / runs / events)
 * - derived density ratios for ops glance
 */
export function StatsOverview({
  stats,
  isLoading,
  isError,
  error,
  onRetry,
}: StatsOverviewProps) {
  const volumeData = STAT_ITEMS.map((item) => ({
    key: item.key,
    label: item.shortLabel,
    fullLabel: item.label,
    count: stats?.[item.key] ?? 0,
    fill: `var(${item.chartVar})`,
  }));

  const catalogItems = STAT_ITEMS.filter((item) =>
    (CATALOG_KEYS as readonly string[]).includes(item.key),
  );
  const catalogData = catalogItems.map((item) => ({
    key: item.key,
    name: item.shortLabel,
    value: stats?.[item.key] ?? 0,
    fill: `var(${item.chartVar})`,
  }));
  const catalogTotal = catalogData.reduce((sum, row) => sum + row.value, 0);

  const catalogConfig: ChartConfig = Object.fromEntries(
    catalogItems.map((item) => [
      item.key,
      { label: item.label, color: `var(${item.chartVar})` },
    ]),
  ) as ChartConfig;

  const users = stats?.users ?? 0;
  const programs = stats?.programs ?? 0;
  const courses = stats?.courses ?? 0;
  const runs = stats?.runs ?? 0;

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

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Platform volume
            </CardTitle>
            <CardDescription>
              Absolute counts across users and learning inventory. Each bar uses
              its own category color.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <AdminSkeletonBar className="h-[280px] w-full rounded-lg" />
            ) : (
              <ChartContainer
                config={VOLUME_CHART_CONFIG}
                className="aspect-auto h-[280px] w-full"
              >
                <BarChart
                  data={volumeData}
                  layout="vertical"
                  margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
                >
                  <CartesianGrid
                    horizontal={false}
                    strokeDasharray="3 3"
                    className="stroke-border/50"
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={72}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <ChartTooltip
                    cursor={{ fill: 'var(--muted)', opacity: 0.35 }}
                    content={<ChartTooltipContent />}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={28}>
                    {volumeData.map((row) => (
                      <Cell key={row.key} fill={row.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Catalog mix</CardTitle>
            <CardDescription>
              Share of learning objects (programs, courses, runs, events). Users
              are excluded so scale stays readable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <AdminSkeletonBar className="h-[280px] w-full rounded-lg" />
            ) : catalogTotal === 0 ? (
              <div className="text-muted-foreground flex h-[280px] items-center justify-center text-sm">
                No catalog records yet.
              </div>
            ) : (
              <ChartContainer
                config={catalogConfig}
                className="aspect-auto mx-auto h-[280px] w-full"
              >
                <PieChart>
                  <ChartTooltip
                    content={<ChartTooltipContent nameKey="key" hideLabel />}
                  />
                  <Pie
                    data={catalogData}
                    dataKey="value"
                    nameKey="key"
                    innerRadius={58}
                    outerRadius={92}
                    strokeWidth={2}
                    stroke="var(--card)"
                    paddingAngle={2}
                  >
                    {catalogData.map((row) => (
                      <Cell key={row.key} fill={row.fill} />
                    ))}
                    <Label
                      content={({ viewBox }) => {
                        if (
                          !viewBox ||
                          !('cx' in viewBox) ||
                          !('cy' in viewBox)
                        ) {
                          return null;
                        }
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy ?? 0) - 6}
                              className="fill-foreground text-xl font-semibold"
                            >
                              {formatNumber(catalogTotal)}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy ?? 0) + 14}
                              className="fill-muted-foreground text-[11px]"
                            >
                              catalog items
                            </tspan>
                          </text>
                        );
                      }}
                    />
                  </Pie>
                  <ChartLegend
                    content={<ChartLegendContent nameKey="key" />}
                    verticalAlign="bottom"
                  />
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiTile
          label="Courses / program"
          value={isLoading ? null : ratioLabel(courses, programs)}
          hint="Catalog depth"
        />
        <KpiTile
          label="Runs / course"
          value={isLoading ? null : ratioLabel(runs, courses)}
          hint="Delivery density"
        />
        <KpiTile
          label="Catalog total"
          value={isLoading ? null : formatNumber(catalogTotal)}
          hint="Programs + courses + runs + events"
        />
        <KpiTile
          label="Users on platform"
          value={isLoading ? null : formatNumber(users)}
          hint="Accounts (all roles)"
        />
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | null;
  hint: string;
}) {
  return (
    <div className="border-border/60 bg-card rounded-xl border px-4 py-3">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      {value === null ? (
        <AdminSkeletonBar className="mt-2 h-6 w-14" />
      ) : (
        <p className="text-foreground mt-1 text-xl font-semibold tabular-nums tracking-tight">
          {value}
        </p>
      )}
      <p className="text-muted-foreground mt-1 text-[11px] leading-snug">{hint}</p>
    </div>
  );
}
