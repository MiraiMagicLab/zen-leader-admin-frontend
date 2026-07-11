import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type AdminActionBarProps = {
  children: ReactNode;
  className?: string;
  /** `between` puts optional leading actions on the left (e.g. Delete in forms). */
  align?: 'end' | 'between';
};

/**
 * Single-row action strip for dock footers and dialog footers.
 * Uses horizontal scroll instead of wrapping when space is tight.
 */
export function AdminActionBar({
  children,
  className,
  align = 'end',
}: AdminActionBarProps) {
  return (
    <div
      className={cn(
        'flex w-full min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto',
        align === 'between' ? 'justify-between' : 'justify-end',
        className,
      )}
    >
      {children}
    </div>
  );
}

type AdminFormDialogFooterProps = {
  onCancel: () => void;
  cancelLabel?: string;
  submitLabel: string;
  onSubmit: () => void;
  pending?: boolean;
  disabled?: boolean;
  /** Left-aligned destructive control (e.g. Delete in edit dialogs). */
  dangerAction?: ReactNode;
  /** Outline buttons before Cancel on the right (e.g. Preview). */
  secondaryActions?: ReactNode;
};

/**
 * Standard editor dialog footer: optional danger on the left; Cancel + primary on the right.
 */
export function AdminFormDialogFooter({
  onCancel,
  cancelLabel = 'Cancel',
  submitLabel,
  onSubmit,
  pending = false,
  disabled = false,
  dangerAction,
  secondaryActions,
}: AdminFormDialogFooterProps) {
  return (
    <AdminActionBar align={dangerAction ? 'between' : 'end'}>
      {dangerAction ? <div className="shrink-0">{dangerAction}</div> : null}
      <div className="ml-auto flex shrink-0 flex-nowrap items-center justify-end gap-2">
        {secondaryActions}
        <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button type="button" disabled={disabled || pending} onClick={onSubmit}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </AdminActionBar>
  );
}

/**
 * Dock footer button order: ghost utility → outline secondary → destructive outline → primary.
 */
export const adminDockButtonSize = 'sm' as const;
