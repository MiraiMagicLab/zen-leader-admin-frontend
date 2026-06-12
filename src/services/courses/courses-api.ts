import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
} from '@/services/lib/api-request';
import type {
  CourseResponse,
  CourseUpsertRequest,
} from '@/services/types/domain';

export const coursesApi = {
  getAll: (programId?: string) =>
    apiGet<CourseResponse[]>(
      programId
        ? `/api/v1/courses?programId=${encodeURIComponent(programId)}`
        : '/api/v1/courses',
    ),
  getById: (id: string) => apiGet<CourseResponse>(`/api/v1/courses/${id}`),
  create: (payload: CourseUpsertRequest) =>
    apiPost<CourseResponse>('/api/v1/courses', payload),
  update: (id: string, payload: CourseUpsertRequest) =>
    apiPut<CourseResponse>(`/api/v1/courses/${id}`, payload),
  remove: (id: string) => apiDelete<string>(`/api/v1/courses/${id}`),
  updateIapMapping: (
    id: string,
    payload: { appleProductId?: string | null; androidProductId?: string | null },
  ) =>
    apiPut<CourseResponse>(`/api/v1/courses/${id}/iap-mapping`, payload),
};
