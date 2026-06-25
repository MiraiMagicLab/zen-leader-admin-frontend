import { useEffect, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type ServerPaginationProps = {
  /** Current page index. Defaults to 0-based unless `pageBase` is 1. */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Whether `page` is 0-based (default) or 1-based. */
  pageBase?: 0 | 1;
  className?: string;
};

function toDisplayPage(page: number, pageBase: 0 | 1) {
  return pageBase === 0 ? page + 1 : page;
}

function toPageIndex(displayPage: number, pageBase: 0 | 1) {
  return pageBase === 0 ? displayPage - 1 : displayPage;
}

export function ServerPagination({
  page,
  totalPages,
  onPageChange,
  pageBase = 0,
  className,
}: ServerPaginationProps) {
  const safeTotal = Math.max(1, totalPages);
  const displayPage = toDisplayPage(page, pageBase);
  const [pageInput, setPageInput] = useState(String(displayPage));

  useEffect(() => {
    setPageInput(String(displayPage));
  }, [displayPage]);

  const goToDisplayPage = (target: number) => {
    const clamped = Math.min(Math.max(1, target), safeTotal);
    onPageChange(toPageIndex(clamped, pageBase));
    setPageInput(String(clamped));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = Number.parseInt(pageInput, 10);
    if (Number.isNaN(parsed)) {
      setPageInput(String(displayPage));
      return;
    }
    goToDisplayPage(parsed);
  };

  return (
    <div className={cn('flex flex-wrap items-center justify-end gap-2', className)}>
      <Button
        variant="outline"
        size="sm"
        disabled={displayPage <= 1}
        onClick={() => goToDisplayPage(displayPage - 1)}
      >
        Previous page
      </Button>

      <form className="flex items-center gap-2" onSubmit={handleSubmit}>
        <span className="text-muted-foreground text-sm">Page</span>
        <Input
          type="number"
          min={1}
          max={safeTotal}
          value={pageInput}
          aria-label="Page number"
          className="h-8 w-16 px-2 text-center"
          onChange={(event) => setPageInput(event.target.value)}
          onBlur={() => {
            const parsed = Number.parseInt(pageInput, 10);
            if (Number.isNaN(parsed)) {
              setPageInput(String(displayPage));
              return;
            }
            goToDisplayPage(parsed);
          }}
        />
        <span className="text-muted-foreground text-sm">/ {safeTotal}</span>
        <Button type="submit" variant="outline" size="sm">
          Go
        </Button>
      </form>

      <Button
        variant="outline"
        size="sm"
        disabled={displayPage >= safeTotal}
        onClick={() => goToDisplayPage(displayPage + 1)}
      >
        Next page
      </Button>
    </div>
  );
}
