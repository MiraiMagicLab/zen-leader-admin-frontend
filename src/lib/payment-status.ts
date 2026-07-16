import { humanizeEnumValue } from '@/lib/humanize';

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Awaiting payment',
  PAID: 'Paid',
  ENROLL_FAILED: 'Enrollment failed',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
  REFUND_PENDING: 'Refund pending',
  REFUNDED: 'Refunded',
};

/** Human-readable payment order status for admin tables. */
export function paymentStatusLabel(status: string): string {
  return PAYMENT_STATUS_LABEL[status] ?? humanizeEnumValue(status);
}

/** Distinct Tailwind classes so ops can scan payment outcomes quickly. */
export function paymentStatusClasses(status: string): string {
  switch (status) {
    case 'PAID':
      return 'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
    case 'PENDING':
      return 'border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300';
    case 'ENROLL_FAILED':
      return 'border-transparent bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
    case 'EXPIRED':
    case 'CANCELLED':
      return 'border-transparent bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    case 'REFUND_PENDING':
      return 'border-transparent bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-300';
    case 'REFUNDED':
      return 'border-transparent bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300';
    default:
      return 'border-transparent bg-muted text-muted-foreground';
  }
}

export const PAYMENT_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  ...Object.entries(PAYMENT_STATUS_LABEL).map(([value, label]) => ({ value, label })),
] as const;
