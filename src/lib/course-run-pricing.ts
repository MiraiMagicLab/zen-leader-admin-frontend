const PRICE_KEYS = [
  'paypalPriceUsd',
  'priceUsd',
] as const;

/**
 * Returns the first numeric-like metadata value for the provided keys.
 */
function firstMetadataValue(
  metadata: Record<string, unknown> | null | undefined,
  keys: readonly string[],
): string {
  if (!metadata) {
    return '';
  }

  for (const key of keys) {
    const value = metadata[key];
    if (value == null) {
      continue;
    }

    const normalized = String(value).trim();
    if (normalized) {
      return normalized;
    }
  }

  return '';
}

/**
 * Reads the editable PayPal USD price from course-run metadata.
 */
export function getPayPalPriceUsd(metadata: Record<string, unknown> | null | undefined): string {
  return firstMetadataValue(metadata, ['paypalPriceUsd', 'priceUsd']);
}

/**
 * Builds the next course-run metadata object while preserving unrelated keys.
 */
export function mergeCourseRunPricingMetadata(
  metadata: Record<string, unknown> | null | undefined,
  paypalPriceUsd: string,
): Record<string, unknown> {
  const nextMetadata: Record<string, unknown> = { ...(metadata ?? {}) };
  const normalizedUsd = paypalPriceUsd.trim();

  if (normalizedUsd) {
    nextMetadata.paypalPriceUsd = normalizedUsd;
  } else {
    delete nextMetadata.paypalPriceUsd;
    delete nextMetadata.priceUsd;
  }

  delete nextMetadata.paypalPriceVnd;
  delete nextMetadata.stripePriceVnd;
  delete nextMetadata.androidPriceVnd;
  delete nextMetadata.priceVnd;
  delete nextMetadata.paymentPriceVnd;
  delete nextMetadata.price;

  return nextMetadata;
}

/**
 * Formats course-run pricing metadata for compact admin display.
 */
export function formatCourseRunPricingSummary(
  metadata: Record<string, unknown> | null | undefined,
): string {
  const usd = getPayPalPriceUsd(metadata);

  if (usd) {
    return `$${usd} USD`;
  }
  return '';
}

/**
 * Returns whether the run currently has any configured checkout pricing.
 */
export function hasCourseRunPricing(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  return PRICE_KEYS.some((key) => {
    const value = metadata?.[key];
    if (value == null) {
      return false;
    }
    const numeric = Number(String(value).trim());
    return Number.isFinite(numeric) && numeric > 0;
  });
}
