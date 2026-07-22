import { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

import {
  isChunkLoadError,
  reloadOnceForStaleChunk,
} from '@/lib/lazy-with-retry';

function errorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return error.statusText || `HTTP ${error.status}`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error ?? 'Unknown error');
}

/**
 * Route-level fallback that auto-recovers from stale Vite chunks after deploy,
 * and otherwise shows a simple reload CTA instead of React Router's default page.
 */
export function RouteErrorElement() {
  const error = useRouteError();
  const message = errorMessage(error);
  const staleChunk = isChunkLoadError(error);

  useEffect(() => {
    if (staleChunk) {
      reloadOnceForStaleChunk();
    }
  }, [staleChunk]);

  return (
    <main className="flex min-h-svh items-center justify-center bg-[var(--background)] px-6 py-10 text-[var(--foreground)]">
      <div className="max-w-md space-y-4 text-center">
        <p className="text-sm font-medium tracking-wide text-[var(--muted-foreground)] uppercase">
          Zen Leader Admin
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {staleChunk ? 'Đang tải phiên bản mới…' : 'Đã xảy ra lỗi'}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {staleChunk
            ? 'Ứng dụng vừa được cập nhật. Trang sẽ tự tải lại để lấy bản mới nhất.'
            : message}
        </p>
        {!staleChunk ? (
          <button
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-[var(--primary-foreground)]"
            onClick={() => window.location.reload()}
          >
            Tải lại trang
          </button>
        ) : null}
      </div>
    </main>
  );
}
