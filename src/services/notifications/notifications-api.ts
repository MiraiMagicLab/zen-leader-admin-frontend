import { apiGet, apiPost } from '@/services/lib/api-request';
import type { NotificationResponse } from '@/services/types/domain';

export const notificationsApi = {
  getByUser: (userId: string) =>
    apiGet<NotificationResponse[]>(`/api/v1/admin/notifications/users/${userId}`),
  broadcast: (payload: {
    title: string;
    message: string;
    type: string;
    userIds?: string[];
  }) =>
    apiPost<{ sentCount: number }>('/api/v1/admin/notifications/broadcast', payload),
};
