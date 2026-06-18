import { apiGet } from '@/services/lib/api-request';
import type { AuditLogResponse } from '@/services/types/domain';
import type { SpringPage } from '@/services/types/pagination';

export const auditLogsApi = {
  getAll: (params: {
    page?: number;
    size?: number;
    action?: string;
    entityType?: string;
    actorUserId?: string;
  }) => {
    const search = new URLSearchParams();
    search.set('page', String(params.page ?? 1));
    search.set('size', String(params.size ?? 20));
    if (params.action) search.set('action', params.action);
    if (params.entityType) search.set('entityType', params.entityType);
    if (params.actorUserId) search.set('actorUserId', params.actorUserId);
    return apiGet<SpringPage<AuditLogResponse>>(
      `/api/v1/admin/audit-logs?${search.toString()}`,
    );
  },
};
