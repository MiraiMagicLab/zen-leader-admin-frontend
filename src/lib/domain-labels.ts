/**
 * Human-readable labels for domain enum values returned by the API.
 */

/**
 * Normalizes role strings from the API to lowercase for display and filtering.
 *
 * @param roles role list from user payload
 * @returns normalized lowercase roles
 */
export function normalizeRoles(roles: string[] | undefined): string[] {
  if (!roles?.length) return ['user'];
  return roles.map((role) => role.trim().toLowerCase()).filter(Boolean);
}

/**
 * Returns a display label for a user role.
 *
 * @param role normalized role slug
 * @returns capitalized role label
 */
export function roleLabel(role: string): string {
  const normalized = role.trim().toLowerCase();
  if (normalized === 'admin') return 'Admin';
  if (normalized === 'user') return 'User';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

/**
 * Determines whether a user ban is still active based on {@code bannedUntil}.
 *
 * @param bannedUntil ISO timestamp or null
 * @returns true when the ban has not expired
 */
export function isBanActive(bannedUntil: string | null | undefined): boolean {
  if (!bannedUntil) return false;
  const until = Date.parse(bannedUntil);
  return !Number.isNaN(until) && until > Date.now();
}
