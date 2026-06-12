import { apiGet, apiPatch } from '@/services/lib/api-request';
import type { UgcReportResponse } from '@/services/types/domain';
import type { PagingResponse } from '@/services/types/pagination';

export const safetyApi = {
  listReports: (page = 0, pageSize = 20, status?: string) => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (status) params.set('status', status);
    return apiGet<PagingResponse<UgcReportResponse>>(
      `/api/v1/admin/safety/reports?${params.toString()}`,
    );
  },
  updateReportStatus: (reportId: string, status: string) =>
    apiPatch<UgcReportResponse>(
      `/api/v1/admin/safety/reports/${reportId}/status`,
      { status },
    ),
};
