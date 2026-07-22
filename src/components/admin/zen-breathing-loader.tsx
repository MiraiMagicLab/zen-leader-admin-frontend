import { BRAND } from '@/lib/brand/constants';
import { cn } from '@/lib/utils';

type ZenBlockLoaderProps = {
  /** Row height in px (blocks scale from this). */
  size?: number;
  /** Three smaller blocks for tight inline slots. */
  compact?: boolean;
  className?: string;
  /** Accessible label for screen readers. */
  label?: string;
};

/**
 * Horizontal square-block wave loader (navy + green).
 * Shared visual with mobile meet connect + Meet client.
 */
export function ZenBlockLoader({
  size = 40,
  compact = false,
  className,
  label = 'Loading',
}: ZenBlockLoaderProps) {
  const count = compact ? 3 : 4;

  return (
    <span
      role="status"
      aria-label={label}
      className={cn('zen-block-loader', compact && 'is-compact', className)}
      style={{ height: size, fontSize: size }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <span
          key={index}
          className="zen-block-dot"
          style={{ animationDelay: `${index * 0.12}s` }}
          aria-hidden
        />
      ))}
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** @deprecated Prefer [ZenBlockLoader]. */
export const ZenBreathingLoader = ZenBlockLoader;

type ZenPageLoadingProps = {
  message?: string;
  showLogo?: boolean;
  className?: string;
  /** Use min-h-svh for auth / cold-start full screens. */
  fullScreen?: boolean;
};

/**
 * Full-page branded zen loader with optional logo + status text.
 */
export function ZenPageLoading({
  message,
  showLogo = true,
  className,
  fullScreen = false,
}: ZenPageLoadingProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-5',
        fullScreen && 'bg-background min-h-svh w-full',
        className,
      )}
    >
      {showLogo ? (
        <img
          src={BRAND.logoPath}
          alt={BRAND.name}
          className="h-10 w-auto max-w-[140px] object-contain"
          onError={(event) => {
            event.currentTarget.src = BRAND.logoFallbackPath;
          }}
        />
      ) : null}
      <ZenBlockLoader size={44} label={message ?? 'Loading'} />
      {message ? (
        <p className="text-muted-foreground max-w-xs text-center text-sm">{message}</p>
      ) : null}
    </div>
  );
}
