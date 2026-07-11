import {
  AlertTriangle,
  CircleDollarSign,
  Radio,
  ShieldAlert,
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
import { formatMoney, formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ROUTES } from '@/routes/paths';
import type { DashboardOpsMetrics } from '../hooks/use-dashboard-data';

type OpsMetricKey = keyof Pick<
  DashboardOpsMetrics,
  | 'activeLiveSessions'
  | 'pendingPayments'
  | 'paidOrders'
  | 'enrollmentFailures'
  | 'pendingReports'
>;

type OpsMetricItem = {
  label: string;
  description: string;
  key: OpsMetricKey;
  icon: LucideIcon;
  href: string;
  tone: 'live' | 'money' | 'warn' | 'neutral';
  format?: 'count';
};

const OPS_METRICS: OpsMetricItem[] = [
  {
    label: 'Live rooms',
    description: 'Sessions currently active on meet',
    key: 'activeLiveSessions',
    icon: Radio,
    href: `${ROUTES.liveSessions}?status=ACTIVE`,
    tone: 'live',
  },
  {
    label: 'Collected revenue',
    description: 'Sum of paid orders (sampled up to 200)',
    key: 'paidOrders',
    icon: CircleDollarSign,
    href: `${ROUTES.payments}?status=PAID`,
    tone: 'money',
  },
  {
    label: 'Pending payments',
    description: 'Orders awaiting checkout',
    key: 'pendingPayments',
    icon: Wallet,
    href: `${ROUTES.payments}?status=PENDING`,
    tone: 'neutral',
  },
  {
    label: 'Pending reports',
    description: 'Moderation queue needing review',
    key: 'pendingReports',
    icon: ShieldAlert,
    href: ROUTES.moderation,
    tone: 'warn',
  },
  {
    label: 'Enrollment failures',
    description: 'Paid orders that failed to enroll',
    key: 'enrollmentFailures',
    icon: AlertTriangle,
    href: `${ROUTES.payments}?status=ENROLL_FAILED`,
    tone: 'warn',
  },
];

const TONE_STYLES: Record<OpsMetricItem['tone'], { well: string; icon: string; accent: string }> = {
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

type StatsOverviewProps = {
  metrics: DashboardOpsMetrics | undefined;
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
  metrics: DashboardOpsMetrics | undefined;
  isLoading: boolean;
}) {
  const Icon = item.icon;
  const tone = TONE_STYLES[item.tone];
  const count = metrics?.[item.key] ?? 0;

  let displayValue = isLoading ? null : formatNumber(count);
  if (item.key === 'paidOrders' && metrics && !isLoading) {
    displayValue = formatMoney(metrics.paidRevenue, metrics.paidRevenueCurrency);
    if (metrics.paidRevenueSampled) {
      displayValue = `${displayValue}+`;
    }
  }

  return (
    <Link to={item.href} className="group block min-w-0 no-underline">
      <div className="admin-metric-card relative flex h-full items-start gap-3 p-4">
        <span aria-hidden className={cn('absolute inset-y-3 left-0 w-1 rounded-full', tone.accent)} />
        <div
          className={cn(
            'ml-1 flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/50',
            tone.well,
            tone.icon,
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs font-medium">{item.label}</p>
          {displayValue === null ? (
            <AdminSkeletonBar className="mt-1.5 h-7 w-24" />
          ) : (
            <p className="text-foreground mt-1 text-xl font-semibold tracking-tight tabular-nums">
              {displayValue}
            </p>
          )}
          <p className="text-muted-foreground mt-1 text-[11px] leading-snug">
            {item.description}
            {item.key === 'paidOrders' && metrics && !isLoading ? (
              <span className="block">{formatNumber(metrics.paidOrders)} paid orders</span>
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
            key={item.key}
            item={item}
            metrics={metrics}
            isLoading={isLoading}
          />
        ))}
      </div>

      <Card className="admin-panel shadow-none ring-0">
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
      <p className="text-foreground text-sm font-semibold tabular-nums">{formatNumber(value)}</p>
    </div>
  );
}
