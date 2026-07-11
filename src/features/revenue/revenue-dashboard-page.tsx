import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import { RefreshCw } from 'lucide-react';

import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { AdminQueryError } from '@/components/admin/admin-query-state';
import { AdminSkeletonBar } from '@/components/admin/admin-loading';
import { FilterSelect } from '@/components/admin/filter-select';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { queryKeys } from '@/hooks/query-keys';
import { ADMIN_PAGE_META } from '@/lib/admin-page-meta';
import { formatCurrencyAmounts, formatMoney, formatNumber, primaryCurrencyAmount } from '@/lib/format';
import { humanizeEnumValue } from '@/lib/humanize';
import { useAdminPageMeta } from '@/lib/page-meta';
import { ROUTES } from '@/routes/paths';
import { paymentsAnalyticsApi } from '@/services/ops/ops-api';
import type { CurrencyAmountResponse } from '@/services/types/domain';

const RANGE_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
] as const;

const GRANULARITY_OPTIONS = [
  { value: 'day', label: 'Daily' },
  { value: 'week', label: 'Weekly' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'var(--chart-4)',
  PAID: 'var(--chart-3)',
  ENROLL_FAILED: 'var(--chart-5)',
  EXPIRED: 'var(--muted-foreground)',
  CANCELLED: 'var(--border)',
  REFUND_PENDING: 'var(--chart-2)',
  REFUNDED: 'var(--chart-1)',
};

const TIMESERIES_CONFIG: ChartConfig = {
  amount: { label: 'Revenue', color: 'var(--chart-3)' },
};

const PROVIDER_CONFIG: ChartConfig = {
  amount: { label: 'Revenue', color: 'var(--chart-1)' },
};

const TOP_RUNS_CONFIG: ChartConfig = {
  amount: { label: 'Revenue', color: 'var(--chart-2)' },
};

function rangeToIsoWindow(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

function sumAmounts(rows: CurrencyAmountResponse[] | undefined): number {
  return rows?.reduce((sum, row) => sum + row.amount, 0) ?? 0;
}

/**
 * Admin finance dashboard: revenue KPIs, timeseries, status/provider mix, and top course runs.
 */
export function RevenueDashboardPage() {
  useAdminPageMeta(ADMIN_PAGE_META.revenue);

  const [rangeDays, setRangeDays] = useState('30');
  const [granularity, setGranularity] = useState<'day' | 'week'>('day');

  const window = useMemo(
    () => rangeToIsoWindow(Number(rangeDays) || 30),
    [rangeDays],
  );

  const analyticsQuery = useQuery({
    queryKey: queryKeys.payments.analytics({
      from: window.from,
      to: window.to,
      granularity,
    }),
    queryFn: () =>
      paymentsAnalyticsApi.getAnalytics({
        from: window.from,
        to: window.to,
        granularity,
        topLimit: 8,
      }),
  });

  const analytics = analyticsQuery.data;
  const primary = primaryCurrencyAmount(analytics?.collectedRevenue);
  const primaryCurrency = primary?.currency ?? 'VND';

  const timeseriesData = useMemo(() => {
    if (!analytics?.timeseries?.length) return [];
    const byBucket = new Map<string, number>();
    for (const point of analytics.timeseries) {
      if (point.currency !== primaryCurrency) continue;
      byBucket.set(point.bucket, (byBucket.get(point.bucket) ?? 0) + point.amount);
    }
    return Array.from(byBucket.entries()).map(([bucket, amount]) => ({
      bucket,
      amount,
      label: bucket.slice(5),
    }));
  }, [analytics?.timeseries, primaryCurrency]);

  const statusData = useMemo(
    () =>
      (analytics?.byStatus ?? [])
        .filter((row) => row.count > 0)
        .map((row) => ({
          key: row.status,
          name: humanizeEnumValue(row.status),
          value: row.count,
          fill: STATUS_COLORS[row.status] ?? 'var(--chart-1)',
        })),
    [analytics?.byStatus],
  );

  const statusConfig = useMemo(() => {
    const config: ChartConfig = {};
    for (const row of statusData) {
      config[row.key] = { label: row.name, color: row.fill };
    }
    return config;
  }, [statusData]);

  const providerData = useMemo(
    () =>
      (analytics?.byProvider ?? [])
        .filter((row) => row.currency === primaryCurrency)
        .map((row) => ({
          provider: row.provider,
          amount: row.amount,
          orderCount: row.orderCount,
        })),
    [analytics?.byProvider, primaryCurrency],
  );

  const topRunsData = useMemo(
    () =>
      (analytics?.topCourseRuns ?? [])
        .filter((row) => row.currency === primaryCurrency)
        .map((row) => ({
          code: row.courseRunCode,
          amount: row.amount,
          orderCount: row.orderCount,
          courseRunId: row.courseRunId,
        })),
    [analytics?.topCourseRuns, primaryCurrency],
  );

  const refundedPrimary = primaryCurrencyAmount(analytics?.refundedAmount);

  return (
    <AdminPageShell
      title="Revenue"
      description="Collected course-purchase revenue, payment mix, and top-selling course runs."
      actions={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void analyticsQuery.refetch()}
          disabled={analyticsQuery.isFetching}
        >
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <FilterSelect
            ariaLabel="Date range"
            placeholder="Range"
            value={rangeDays}
            onChange={setRangeDays}
            options={RANGE_OPTIONS}
          />
          <FilterSelect
            ariaLabel="Granularity"
            placeholder="Granularity"
            value={granularity}
            onChange={(value) => setGranularity(value as 'day' | 'week')}
            options={GRANULARITY_OPTIONS}
          />
        </div>

        {analyticsQuery.isError ? (
          <AdminQueryError
            message={
              (analyticsQuery.error as Error)?.message ??
              'Failed to load revenue analytics.'
            }
            onRetry={() => void analyticsQuery.refetch()}
          />
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Collected revenue"
            value={
              analyticsQuery.isLoading
                ? null
                : formatCurrencyAmounts(analytics?.collectedRevenue)
            }
            hint={`${formatNumber(primary?.orderCount ?? 0)} collected orders`}
          />
          <KpiCard
            label="Paid orders"
            value={
              analyticsQuery.isLoading
                ? null
                : formatNumber(analytics?.paidOrderCount ?? 0)
            }
            hint="Status PAID created in range"
          />
          <KpiCard
            label="Enrollment failures"
            value={
              analyticsQuery.isLoading
                ? null
                : formatNumber(analytics?.enrollmentFailedOrderCount ?? 0)
            }
            hint="Need retry from Payments"
          />
          <KpiCard
            label="Refunded"
            value={
              analyticsQuery.isLoading
                ? null
                : refundedPrimary
                  ? formatMoney(refundedPrimary.amount, refundedPrimary.currency)
                  : formatMoney(0, primaryCurrency)
            }
            hint={`${formatNumber(analytics?.refundedOrderCount ?? 0)} refunded orders`}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="admin-panel shadow-none ring-0 lg:col-span-8">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Revenue over time ({primaryCurrency})
              </CardTitle>
              <CardDescription>
                Collected payments by {granularity === 'week' ? 'week' : 'day'} in the
                selected range.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsQuery.isLoading ? (
                <AdminSkeletonBar className="h-[280px] w-full rounded-xl" />
              ) : timeseriesData.length === 0 ? (
                <EmptyChart message="No collected payments in this range." />
              ) : (
                <ChartContainer
                  config={TIMESERIES_CONFIG}
                  className="aspect-auto h-[280px] w-full"
                >
                  <LineChart data={timeseriesData} margin={{ left: 8, right: 8, top: 8 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={56}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => formatNumber(Number(value))}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) =>
                            formatMoney(Number(value), primaryCurrency)
                          }
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      stroke="var(--color-amount)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="admin-panel shadow-none ring-0 lg:col-span-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Orders by status</CardTitle>
              <CardDescription>Lifetime status mix across all orders.</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsQuery.isLoading ? (
                <AdminSkeletonBar className="h-[280px] w-full rounded-xl" />
              ) : statusData.length === 0 ? (
                <EmptyChart message="No payment orders yet." />
              ) : (
                <ChartContainer
                  config={statusConfig}
                  className="aspect-auto mx-auto h-[280px] w-full"
                >
                  <PieChart>
                    <ChartTooltip
                      content={<ChartTooltipContent nameKey="key" hideLabel />}
                    />
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="key"
                      innerRadius={52}
                      outerRadius={84}
                      strokeWidth={2}
                      stroke="var(--card)"
                      paddingAngle={2}
                    >
                      {statusData.map((row) => (
                        <Cell key={row.key} fill={row.fill} />
                      ))}
                    </Pie>
                    <ChartLegend content={<ChartLegendContent nameKey="key" />} />
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="admin-panel shadow-none ring-0 lg:col-span-5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Revenue by provider ({primaryCurrency})
              </CardTitle>
              <CardDescription>Collected amount per payment provider.</CardDescription>
            </CardHeader>
            <CardContent>
              {analyticsQuery.isLoading ? (
                <AdminSkeletonBar className="h-[240px] w-full rounded-xl" />
              ) : providerData.length === 0 ? (
                <EmptyChart message="No provider revenue in this range." />
              ) : (
                <ChartContainer
                  config={PROVIDER_CONFIG}
                  className="aspect-auto h-[240px] w-full"
                >
                  <BarChart data={providerData} margin={{ left: 8, right: 8, top: 8 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="provider" tickLine={false} axisLine={false} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={56}
                      tickFormatter={(value) => formatNumber(Number(value))}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) =>
                            formatMoney(Number(value), primaryCurrency)
                          }
                        />
                      }
                    />
                    <Bar
                      dataKey="amount"
                      fill="var(--color-amount)"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="admin-panel shadow-none ring-0 lg:col-span-7">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-medium">
                    Top course runs ({primaryCurrency})
                  </CardTitle>
                  <CardDescription>
                    Highest collected revenue in the selected range.
                  </CardDescription>
                </div>
                <Link
                  to={ROUTES.payments}
                  className="text-primary text-xs font-medium hover:underline"
                >
                  View orders
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {analyticsQuery.isLoading ? (
                <AdminSkeletonBar className="h-[240px] w-full rounded-xl" />
              ) : topRunsData.length === 0 ? (
                <EmptyChart message="No course-run revenue in this range." />
              ) : (
                <ChartContainer
                  config={TOP_RUNS_CONFIG}
                  className="aspect-auto h-[240px] w-full"
                >
                  <BarChart
                    data={topRunsData}
                    layout="vertical"
                    margin={{ left: 8, right: 16, top: 8 }}
                  >
                    <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                    <XAxis
                      type="number"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => formatNumber(Number(value))}
                    />
                    <YAxis
                      type="category"
                      dataKey="code"
                      width={96}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) =>
                            formatMoney(Number(value), primaryCurrency)
                          }
                        />
                      }
                    />
                    <Bar
                      dataKey="amount"
                      fill="var(--color-amount)"
                      radius={[0, 8, 8, 0]}
                      maxBarSize={22}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {!analyticsQuery.isLoading && analytics ? (
          <p className="text-muted-foreground text-xs">
            Window {new Date(analytics.from).toLocaleString('vi-VN')} →{' '}
            {new Date(analytics.to).toLocaleString('vi-VN')} · Gross collected{' '}
            {formatNumber(sumAmounts(analytics.collectedRevenue))} across currencies
          </p>
        ) : null}
      </div>
    </AdminPageShell>
  );
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | null;
  hint: string;
}) {
  return (
    <div className="admin-metric-card p-4">
      <p className="text-muted-foreground text-xs font-medium">{label}</p>
      {value === null ? (
        <AdminSkeletonBar className="mt-2 h-7 w-28" />
      ) : (
        <p className="text-foreground mt-1 text-xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
      )}
      <p className="text-muted-foreground mt-1 text-[11px]">{hint}</p>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="text-muted-foreground flex h-[240px] items-center justify-center text-sm">
      {message}
    </div>
  );
}
