import {
  AlertTriangle,
  CircleDollarSign,
  Radio,
  ShieldAlert,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { AdminSkeletonBar } from '@/components/admin/admin-loading';
import { AdminQueryError } from '@/components/admin/admin-query-state';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatCurrencyAmounts, formatNumber, primaryCurrencyAmount } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/routes/paths';
import type { AdminOpsOverviewResponse } from '@/services/types/domain';

type OpsMetricItem = {
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
  tone: 'live' | 'money' | 'warn' | 'neutral';
  getValue: (metrics: AdminOpsOverviewResponse) => string;
  getHint?: (metrics: AdminOpsOverviewResponse) => string | null;
};

const TONE_STYLES: Record<
  OpsMetricItem['tone'],
  { well: string; icon: string; accent: string }
> = {
  live: {
    well: 'bg-emerald-500/10',
    icon: 'text-emerald-600 dark:text-emerald-400',
    accent: 'bg-emerald-500',
  },
  money: {
    well: 'bg-sky-500/10',
    icon: 'text-sky-600 dark:text-sky-400',
    accent: 'bg-sky-500',
  },
  warn: {
    well: 'bg-amber-500/10',
    icon: 'text-amber-600 dark:text-amber-400',
    accent: 'bg-amber-500',
  },
  neutral: {
    well: 'bg-muted/70',
    icon: 'text-muted-foreground',
    accent: 'bg-primary',
  },
};

const OPS_METRICS: OpsMetricItem[] = [
  {
    label: 'Live rooms',
    description: 'Sessions currently active on meet',
    icon: Radio,
    href: ROUTES.events,
    tone: 'live',
    getValue: (m) => formatNumber(m.activeLiveSessions),
    getHint: () => 'View events & sessions',
  },
  {
    label: 'Revenue (30d)',
    description: 'Collected payments in the last 30 days',
    icon: CircleDollarSign,
    href: ROUTES.revenue,
    tone: 'money',
    getValue: (m) => formatCurrencyAmounts(m.collectedRevenueLast30Days),
    getHint: (m) => {
      const primary = primaryCurrencyAmount(m.collectedRevenueLast30Days);
      return primary
        ? `${formatNumber(primary.orderCount)} paid orders`
        : 'No paid orders yet';
    },
  },
  {
    label: 'Pending payments',
    description: 'Orders awaiting checkout',
    icon: Wallet,
    href: `${ROUTES.payments}?status=PENDING`,
    tone: 'neutral',
    getValue: (m) => formatNumber(m.pendingPayments),
  },
  {
    label: 'Pending reports',
    description: 'Moderation queue needing review',
    icon: ShieldAlert,
    href: ROUTES.moderation,
    tone: 'warn',
    getValue: (m) => formatNumber(m.pendingReports),
  },
  {
    label: 'Enrollment failures',
    description: 'Paid orders that failed to enroll',
    icon: AlertTriangle,
    href: `${ROUTES.payments}?status=ENROLL_FAILED`,
    tone: 'warn',
    getValue: (m) => formatNumber(m.enrollmentFailures),
  },
];

type StatsOverviewProps = {
  metrics: AdminOpsOverviewResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
};

/** Single operational KPI card with deep-link to the relevant admin queue. */
function OpsMetricCard({
  item,
  metrics,
  isLoading,
}: {
  item: OpsMetricItem;
  metrics: AdminOpsOverviewResponse | undefined;
  isLoading: boolean;
}) {
  const Icon = item.icon;
  const tone = TONE_STYLES[item.tone];

  return (
    <Link to={item.href} className="group block min-w-0 no-underline">
      <div className="admin-metric-card relative flex h-full items-start gap-3 p-4">
        <span
          aria-hidden
          className={cn('absolute inset-y-3 left-0 w-0.5 rounded-sm', tone.accent)}
        />
        <div
          className={cn(
            'ml-1 flex size-10 shrink-0 items-center justify-center rounded-md border border-border/50',
            tone.well,
            tone.icon,
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs font-medium">{item.label}</p>
          {isLoading || !metrics ? (
            <AdminSkeletonBar className="mt-1.5 h-7 w-24" />
          ) : (
            <p className="text-foreground mt-1 text-xl font-semibold tracking-tight tabular-nums">
              {item.getValue(metrics)}
            </p>
          )}
          <p className="text-muted-foreground mt-1 text-[11px] leading-snug">
            {item.description}
            {!isLoading && metrics && item.getHint?.(metrics) ? (
              <span className="block">{item.getHint(metrics)}</span>
            ) : null}
          </p>
        </div>
      </div>
    </Link>
  );
}

/**
 * Operational snapshot for admins: live activity, revenue, queues needing action.
 */
export function StatsOverview({
  metrics,
  isLoading,
  isError,
  error,
  onRetry,
}: StatsOverviewProps) {
  const pending = metrics?.pendingPayments ?? 0;
  const paid = metrics?.paidOrders ?? 0;
  const failed = metrics?.enrollmentFailures ?? 0;
  const pipelineTotal = pending + paid + failed;

  return (
    <div className="space-y-4">
      {isError ? (
        <AdminQueryError
          message={(error as Error)?.message ?? 'Failed to load dashboard metrics.'}
          onRetry={onRetry}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {OPS_METRICS.map((item) => (
          <OpsMetricCard
            key={item.label}
            item={item}
            metrics={metrics}
            isLoading={isLoading}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="admin-panel shadow-none ring-0 lg:col-span-8">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Payment pipeline</CardTitle>
            <CardDescription>
              Queue health across checkout, successful enrollments, and failures.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <AdminSkeletonBar className="h-10 w-full rounded-xl" />
            ) : pipelineTotal === 0 ? (
              <p className="text-muted-foreground text-sm">No payment records yet.</p>
            ) : (
              <>
                <div className="flex h-3 overflow-hidden rounded-full border border-border/60 bg-muted/40">
                  {pending > 0 ? (
                    <span
                      className="bg-amber-400/90"
                      style={{ width: `${(pending / pipelineTotal) * 100}%` }}
                      title={`Pending: ${pending}`}
                    />
                  ) : null}
                  {paid > 0 ? (
                    <span
                      className="bg-emerald-500/90"
                      style={{ width: `${(paid / pipelineTotal) * 100}%` }}
                      title={`Paid: ${paid}`}
                    />
                  ) : null}
                  {failed > 0 ? (
                    <span
                      className="bg-destructive/85"
                      style={{ width: `${(failed / pipelineTotal) * 100}%` }}
                      title={`Failed: ${failed}`}
                    />
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <PipelineStat label="Awaiting payment" value={pending} tone="pending" />
                  <PipelineStat label="Paid orders" value={paid} tone="paid" />
                  <PipelineStat label="Enrollment failed" value={failed} tone="failed" />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="admin-panel shadow-none ring-0 lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Users className="size-4" />
              Platform snapshot
            </CardTitle>
            <CardDescription>Accounts and all-time collected revenue.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading || !metrics ? (
              <>
                <AdminSkeletonBar className="h-12 w-full rounded-xl" />
                <AdminSkeletonBar className="h-12 w-full rounded-xl" />
              </>
            ) : (
              <>
                <div className="admin-subtle-panel px-4 py-3">
                  <p className="text-muted-foreground text-xs">Total users</p>
                  <p className="text-foreground mt-1 text-xl font-semibold tabular-nums">
                    {formatNumber(metrics.totalUsers)}
                  </p>
                </div>
                <div className="admin-subtle-panel px-4 py-3">
                  <p className="text-muted-foreground text-xs">All-time revenue</p>
                  <p className="text-foreground mt-1 text-base font-semibold tabular-nums leading-snug">
                    {formatCurrencyAmounts(metrics.collectedRevenue)}
                  </p>
                  <Link
                    to={ROUTES.revenue}
                    className="text-primary mt-2 inline-block text-xs font-medium hover:underline"
                  >
                    Open revenue dashboard
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PipelineStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'pending' | 'paid' | 'failed';
}) {
  const dotClass =
    tone === 'pending'
      ? 'bg-amber-400'
      : tone === 'paid'
        ? 'bg-emerald-500'
        : 'bg-destructive';

  return (
    <div className="admin-subtle-panel flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className={cn('size-2 shrink-0 rounded-full', dotClass)} />
        <p className="text-muted-foreground truncate text-xs">{label}</p>
      </div>
      <p className="text-foreground text-sm font-semibold tabular-nums">
        {formatNumber(value)}
      </p>
    </div>
  );
}
