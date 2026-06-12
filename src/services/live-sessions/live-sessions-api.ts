import { apiDelete, apiGet, apiPost } from '@/services/lib/api-request';
import type { LiveSessionResponse } from '@/services/types/domain';
import type { PagingResponse } from '@/services/types/pagination';

export const liveSessionsApi = {
  list: (page = 0, pageSize = 20, status?: string) => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (status) params.set('status', status);
    return apiGet<PagingResponse<LiveSessionResponse>>(
      `/api/v1/admin/live-sessions?${params.toString()}`,
    );
  },
  end: (sessionId: string) =>
    apiPost<LiveSessionResponse>(`/api/v1/admin/live-sessions/${sessionId}/end`),
  remove: (sessionId: string) =>
    apiDelete<string>(`/api/v1/admin/live-sessions/${sessionId}`),
};
