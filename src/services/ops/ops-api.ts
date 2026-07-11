import { apiGet } from '@/services/lib/api-request';
import type {
  AdminOpsOverviewResponse,
  PaymentAnalyticsResponse,
} from '@/services/types/domain';

export type PaymentAnalyticsParams = {
  from?: string;
  to?: string;
  granularity?: 'day' | 'week';
  topLimit?: number;
};

export const opsApi = {
  /** Single-payload admin dashboard overview aggregates. */
  getOverview: () =>
    apiGet<AdminOpsOverviewResponse>('/api/v1/admin/ops/overview'),
};

export const paymentsAnalyticsApi = {
  /** Revenue analytics for finance dashboard charts. */
  getAnalytics: (params: PaymentAnalyticsParams = {}) => {
    const search = new URLSearchParams();
    if (params.from) search.set('from', params.from);
    if (params.to) search.set('to', params.to);
    if (params.granularity) search.set('granularity', params.granularity);
    if (params.topLimit != null) search.set('topLimit', String(params.topLimit));
    const query = search.toString();
    return apiGet<PaymentAnalyticsResponse>(
      `/api/v1/admin/payments/analytics${query ? `?${query}` : ''}`,
    );
  },
};
