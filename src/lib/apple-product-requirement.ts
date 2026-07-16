import type { CourseResponse } from '@/services/types/domain';

/**
 * Shown whenever admins try to open a class without an Apple Product ID.
 *
 * Android mobile checkout uses PayPal on the course run, so Android Product ID is not required.
 */
export const APPLE_PRODUCT_ID_REQUIRED_NOTE =
  'Please contact the developer who manages the Apple Developer account to create an Apple Product ID before opening this course for enrollment. Android checkout uses PayPal, so an Android Product ID is not required.';

/** Returns true when the course has a non-blank Apple Product ID. */
export function hasAppleProductId(
  course: Pick<CourseResponse, 'appleProductId'> | null | undefined,
): boolean {
  return Boolean(course?.appleProductId?.trim());
}

/**
 * Returns an error message when the run cannot be set to OPEN, otherwise null.
 */
export function getOpenRunBlockedMessage(
  course: Pick<CourseResponse, 'appleProductId'> | null | undefined,
  status: string,
): string | null {
  if (status !== 'OPEN') {
    return null;
  }
  if (hasAppleProductId(course)) {
    return null;
  }
  return APPLE_PRODUCT_ID_REQUIRED_NOTE;
}
