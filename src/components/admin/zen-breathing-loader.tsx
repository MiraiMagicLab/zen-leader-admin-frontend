import { BRAND } from '@/lib/brand/constants';
import { cn } from '@/lib/utils';

type ZenBreathingLoaderProps = {
  /** Outer diameter in px. */
  size?: number;
  /** Fewer rings for tight inline slots. */
  compact?: boolean;
  className?: string;
  /** Accessible label for screen readers. */
  label?: string;
};

/**
 * Shared Zen breathing-ripple loader (navy + green rings).
 * Matches mobile Flutter `ZenBreathingLoader` and Meet client CSS.
 */
export function ZenBreathingLoader({
  size = 48,
  compact = false,
  className,
  label = 'Loading',
}: ZenBreathingLoaderProps) {
  const ringCount = compact ? 2 : 3;

  return (
    <span
      role="status"
      aria-label={label}
      className={cn('zen-breathing-loader', compact && 'is-compact', className)}
      style={{ width: size, height: size }}
    >
      <span className="zen-breathing-core" aria-hidden />
      {Array.from({ length: ringCount }).map((_, index) => (
        <span
          key={index}
          className="zen-breathing-ring"
          style={{ animationDelay: `${(-index * 0.8).toFixed(1)}s` }}
          aria-hidden
        />
      ))}
      <span className="sr-only">{label}</span>
    </span>
  );
}

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
      <ZenBreathingLoader size={72} label={message ?? 'Loading'} />
      {message ? (
        <p className="text-muted-foreground max-w-xs text-center text-sm">{message}</p>
      ) : null}
    </div>
  );
}
