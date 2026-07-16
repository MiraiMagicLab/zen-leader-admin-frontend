import { isBanActive } from '@/lib/domain-labels';
import type { UserResponse } from '@/services/types/domain';

export type UserAccountStatus = 'active' | 'locked' | 'banned' | 'deleted';

export type UserStatusMeta = {
  key: UserAccountStatus;
  label: string;
  /** Tailwind classes for a distinct status pill. */
  className: string;
};

/**
 * Resolves the primary account status for admin lists and inspectors.
 * Priority: deleted → active ban → locked → active. Expired bans are ignored.
 */
export function resolveUserAccountStatus(user: UserResponse): UserStatusMeta {
  if (user.deletedAt) {
    return {
      key: 'deleted',
      label: 'Deleted',
      className:
        'border-transparent bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    };
  }

  if (isBanActive(user.bannedUntil)) {
    const isPermanent =
      Boolean(user.bannedUntil) &&
      Date.parse(user.bannedUntil!) >= Date.parse('2099-01-01T00:00:00Z');
    return {
      key: 'banned',
      label: isPermanent ? 'Banned permanently' : 'Banned',
      className:
        'border-transparent bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
    };
  }

  if (!user.isActive) {
    return {
      key: 'locked',
      label: 'Locked',
      className:
        'border-transparent bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300',
    };
  }

  return {
    key: 'active',
    label: 'Active',
    className:
      'border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  };
}

/** Verification is orthogonal to account status and should render separately. */
export function userVerificationMeta(user: UserResponse): {
  label: string;
  className: string;
} {
  if (user.isVerified) {
    return {
      label: 'Verified',
      className:
        'border-transparent bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300',
    };
  }
  return {
    label: 'Unverified',
    className:
      'border-border bg-background text-muted-foreground',
  };
}
