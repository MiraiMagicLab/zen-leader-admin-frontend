import { apiGet } from '@/services/lib/api-request';
import type { StreakLogResponse, StreakSummaryResponse } from '@/services/types/domain';

export const streaksApi = {
  getSummary: (userId: string, days = 30) =>
    apiGet<StreakSummaryResponse>(
      `/api/v1/admin/streaks/users/${userId}?days=${days}`,
    ),
  getLogs: (userId: string, fromDate: string, toDate: string) =>
    apiGet<StreakLogResponse[]>(
      `/api/v1/admin/streaks/users/${userId}/logs?fromDate=${fromDate}&toDate=${toDate}`,
    ),
};
