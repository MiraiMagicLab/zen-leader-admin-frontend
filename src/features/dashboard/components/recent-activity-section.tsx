import { Link } from 'react-router-dom';
import { Clock, History } from 'lucide-react';

import { AdminSkeletonBar } from '@/components/admin/admin-loading';
import { AdminQueryError } from '@/components/admin/admin-query-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  auditActionLabel,
  auditEntityTypeLabel,
} from '@/lib/audit-labels';
import { formatAuditActorDisplay, formatDateTime, formatRelativeDateTime } from '@/lib/format';
import type { AuditLogResponse } from '@/services/types/domain';

type RecentActivitySectionProps = {
  items: AuditLogResponse[];
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  onRetry?: () => void;
};

/** Skeleton for the activity timeline. */
function ActivityTimelineSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <AdminSkeletonBar key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

/**
 * Compact audit timeline for the dashboard.
 * Separated from actionable "needs attention" queues for clearer hierarchy.
 */
export function RecentActivitySection({
  items,
  isLoading,
  isError,
  error,
  onRetry,
}: RecentActivitySectionProps) {
  return (
    <Card className="flex h-full flex-col border-border/70 shadow-none ring-0">
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="text-muted-foreground size-4 shrink-0" />
          Recent activity
        </CardTitle>
        <Link
          to="/audit-logs"
          className="text-primary text-xs font-medium hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        {isError ? (
          <AdminQueryError
            message={(error as Error)?.message ?? 'Failed to load activity.'}
            onRetry={onRetry}
          />
        ) : isLoading ? (
          <ActivityTimelineSkeleton />
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-sm">No recent activity.</p>
        ) : (
          <ul className="max-h-[min(28rem,52vh)] space-y-0 overflow-y-auto pr-1">
            {items.map((item, index) => (
              <li
                key={item.id}
                className="relative flex gap-3 pb-4 last:pb-0"
              >
                {index < items.length - 1 ? (
                  <span
                    aria-hidden
                    className="bg-border absolute top-6 bottom-0 left-[7px] w-px"
                  />
                ) : null}
                <span className="bg-muted text-muted-foreground relative z-10 mt-1 flex size-3.5 shrink-0 items-center justify-center rounded-full">
                  <Clock className="size-2.5" />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium leading-snug">
                      {auditActionLabel(item.action)}
                    </p>
                    <time
                      className="text-muted-foreground shrink-0 text-[11px] tabular-nums"
                      dateTime={item.createdAt}
                      title={formatDateTime(item.createdAt)}
                    >
                      {formatRelativeDateTime(item.createdAt)}
                    </time>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
                      {auditEntityTypeLabel(item.entityType)}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {formatAuditActorDisplay(item.actorDisplay)}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
