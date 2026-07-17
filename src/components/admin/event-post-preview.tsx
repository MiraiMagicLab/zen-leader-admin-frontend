import { Badge } from '@/components/ui/badge';
import { AdminPersonAvatar } from '@/components/admin/admin-person-avatar';
import {
  eventStatusClasses,
  eventStatusLabel,
  eventTypeLabel,
} from '@/lib/event-labels';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { EventResponse } from '@/services/types/domain';

type EventPostPreviewProps = {
  event: EventResponse;
  /** Show longer content body (detail page). Dock uses a shorter clamp. */
  dense?: boolean;
  className?: string;
};

/**
 * Feed-style event post preview for admin list dock and detail pages.
 */
export function EventPostPreview({ event, dense = false, className }: EventPostPreviewProps) {
  const authorName = event.isOfficial ? 'Zen Leader System' : event.author.name;
  const authorAvatar = event.isOfficial ? null : event.author.avatarUrl;
  const body = event.content?.trim() || event.description?.trim() || '';

  return (
    <article
      className={cn(
        'overflow-hidden rounded-xl border bg-background shadow-sm',
        className,
      )}
    >
      {event.thumbnailUrl ? (
        <div className="bg-muted/20 aspect-[16/9] w-full overflow-hidden border-b">
          <img
            src={event.thumbnailUrl}
            alt=""
            className="size-full object-cover"
          />
        </div>
      ) : (
        <div className="bg-muted/30 text-muted-foreground flex aspect-[16/9] w-full items-center justify-center border-b text-sm">
          No cover image
        </div>
      )}

      <div className={cn('space-y-3', dense ? 'p-3' : 'p-4 sm:p-5')}>
        <div className="flex items-start gap-3">
          <AdminPersonAvatar name={authorName} avatarUrl={authorAvatar} size="default" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold">{authorName}</p>
              <Badge variant={event.isOfficial ? 'default' : 'secondary'}>
                {eventTypeLabel(event.isOfficial)}
              </Badge>
              <Badge variant="outline" className={cn(eventStatusClasses(event.status))}>
                {eventStatusLabel(event.status)}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {formatDateTime(event.startTime)}
              {event.endTime ? ` → ${formatDateTime(event.endTime)}` : ''}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className={cn('font-semibold tracking-tight', dense ? 'text-base' : 'text-lg')}>
            {event.title}
          </h3>
          {event.description?.trim() ? (
            <p
              className={cn(
                'text-muted-foreground text-sm leading-relaxed',
                dense && 'line-clamp-2',
              )}
            >
              {event.description}
            </p>
          ) : null}
          {body && body !== event.description?.trim() ? (
            <p
              className={cn(
                'text-sm leading-relaxed whitespace-pre-wrap',
                dense ? 'line-clamp-4 text-muted-foreground' : 'text-foreground/90',
              )}
            >
              {body}
            </p>
          ) : null}
        </div>

        <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 border-t pt-3 text-xs">
          <span>{event.engagementStats.likes} likes</span>
          <span>{event.engagementStats.interested} interested</span>
          <span>{event.engagementStats.comments ?? 0} comments</span>
        </div>
      </div>
    </article>
  );
}
