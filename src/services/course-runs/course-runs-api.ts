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
import type { PagingResponse } from '@/services/types/pagination';

export const courseRunsApi = {
  getAll: (courseId?: string) =>
    apiGet<CourseRunResponse[]>(
      courseId
        ? `/api/v1/course-runs?courseId=${encodeURIComponent(courseId)}`
        : '/api/v1/course-runs',
    ),
  getPage: (page = 0, pageSize = 10, courseId?: string) =>
    apiGet<PagingResponse<CourseRunResponse>>(
      courseId
        ? `/api/v1/course-runs/paged?page=${page}&pageSize=${pageSize}&courseId=${encodeURIComponent(courseId)}`
        : `/api/v1/course-runs/paged?page=${page}&pageSize=${pageSize}`,
    ),
  getById: (id: string) =>
    apiGet<CourseRunResponse>(`/api/v1/course-runs/${id}`),
  create: (payload: CourseRunUpsertRequest) =>
    apiPost<CourseRunResponse>('/api/v1/course-runs', payload),
  update: (id: string, payload: CourseRunUpsertRequest) =>
    apiPut<CourseRunResponse>(`/api/v1/course-runs/${id}`, payload),
  remove: (id: string) => apiDelete<string>(`/api/v1/course-runs/${id}`),
};
