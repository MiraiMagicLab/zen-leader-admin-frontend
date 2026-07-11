import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type FilterChipOption = {
  value: string;
  label: string;
};

type FilterChipGroupProps = {
  value: string;
  onChange: (value: string) => void;
  options: readonly FilterChipOption[];
  ariaLabel?: string;
  className?: string;
};

/**
 * Segmented inline filter control for admin list pages.
 */
export function FilterChipGroup({
  value,
  onChange,
  options,
  ariaLabel = 'Filter',
  className,
}: FilterChipGroupProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn('admin-segment flex flex-wrap items-center gap-1', className)}
    >
      {options.map((option) => {
        const active = value === option.value;
        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={active ? 'secondary' : 'ghost'}
            className={cn(
              'h-8 rounded-lg px-3 text-xs font-medium',
              active && 'border border-border/60 bg-background shadow-sm',
            )}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
