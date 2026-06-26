import { apiGet, apiPost } from '@/services/lib/api-request';
import type {
  AdminPaymentOrderResponse,
  PaymentOrderResponse,
} from '@/services/types/domain';
import type { PagingResponse } from '@/services/types/pagination';

export const paymentsApi = {
  listOrders: (page = 0, pageSize = 10, status?: string, keyword?: string) => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (status) params.set('status', status);
    if (keyword) params.set('keyword', keyword);
    return apiGet<PagingResponse<AdminPaymentOrderResponse>>(
      `/api/v1/admin/payments/orders?${params.toString()}`,
    );
  },
  retryEnrollment: (orderId: string) =>
    apiPost<PaymentOrderResponse>(
      `/api/v1/admin/payments/orders/${orderId}/retry-enrollment`,
    ),
};
