import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
} from '@/services/lib/api-request';
import type {
  CourseRunResponse,
  CourseRunUpsertRequest,
} from '@/services/types/domain';

export const courseRunsApi = {
  getAll: (courseId?: string) =>
    apiGet<CourseRunResponse[]>(
      courseId
        ? `/api/v1/course-runs?courseId=${encodeURIComponent(courseId)}`
        : '/api/v1/course-runs',
    ),
  getById: (id: string) =>
    apiGet<CourseRunResponse>(`/api/v1/course-runs/${id}`),
  create: (payload: CourseRunUpsertRequest) =>
    apiPost<CourseRunResponse>('/api/v1/course-runs', payload),
  update: (id: string, payload: CourseRunUpsertRequest) =>
    apiPut<CourseRunResponse>(`/api/v1/course-runs/${id}`, payload),
  remove: (id: string) => apiDelete<string>(`/api/v1/course-runs/${id}`),
};
