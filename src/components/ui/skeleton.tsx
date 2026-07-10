import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'animate-pulse rounded-md bg-muted-foreground/12 dark:bg-muted-foreground/18',
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
