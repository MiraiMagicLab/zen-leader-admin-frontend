import { apiGet } from '@/services/lib/api-request';
import type { RelationshipResponse } from '@/services/types/domain';

export const relationshipsApi = {
  getFriends: (userId: string) =>
    apiGet<RelationshipResponse[]>(
      `/api/v1/admin/relationships/users/${userId}/friends`,
    ),
  getRequests: (userId: string, status = 'PENDING') =>
    apiGet<RelationshipResponse[]>(
      `/api/v1/admin/relationships/users/${userId}/requests?status=${status}`,
    ),
};
