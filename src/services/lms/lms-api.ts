import {
  apiDelete,
  apiGet,
  apiPost,
  apiPostForm,
  apiPut,
  apiGetBlob,
} from '@/services/lib/api-request';
import type {
  ChapterResponse,
  ChapterUpsertRequest,
  EnrollmentImportResponse,
  EnrollmentResponse,
  EnrollmentUpdateRequest,
  LessonFileUploadResponse,
  LessonResponse,
  LessonUpsertRequest,
  ManualEnrollmentRequest,
} from '@/services/types/domain';
import type { PagingResponse } from '@/services/types/pagination';

export const chaptersApi = {
  getAll: (courseRunId?: string) =>
    apiGet<ChapterResponse[]>(
      courseRunId
        ? `/api/v1/chapters?courseRunId=${encodeURIComponent(courseRunId)}`
        : '/api/v1/chapters',
    ),
  getById: (id: string) => apiGet<ChapterResponse>(`/api/v1/chapters/${id}`),
  create: (payload: ChapterUpsertRequest) =>
    apiPost<ChapterResponse>('/api/v1/chapters', payload),
  update: (id: string, payload: ChapterUpsertRequest) =>
    apiPut<ChapterResponse>(`/api/v1/chapters/${id}`, payload),
  remove: (id: string) => apiDelete<string>(`/api/v1/chapters/${id}`),
};

export const lessonsApi = {
  getAll: (chapterId?: string) =>
    apiGet<LessonResponse[]>(
      chapterId
        ? `/api/v1/lessons?chapterId=${encodeURIComponent(chapterId)}`
        : '/api/v1/lessons',
    ),
  getById: (id: string) => apiGet<LessonResponse>(`/api/v1/lessons/${id}`),
  create: (payload: LessonUpsertRequest) =>
    apiPost<LessonResponse>('/api/v1/lessons', payload),
  update: (id: string, payload: LessonUpsertRequest) =>
    apiPut<LessonResponse>(`/api/v1/lessons/${id}`, payload),
  remove: (id: string) => apiDelete<string>(`/api/v1/lessons/${id}`),
  uploadFile: (lessonId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiPostForm<LessonFileUploadResponse>(
      `/api/v1/lessons/${lessonId}/files`,
      form,
    );
  },
};

export const enrollmentsApi = {
  getById: (enrollmentId: string) =>
    apiGet<EnrollmentResponse>(`/api/v1/enrollments/${enrollmentId}`),
  getByCourseRun: (courseRunId: string) =>
    apiGet<EnrollmentResponse[]>(
      `/api/v1/enrollments/by-course-run/${encodeURIComponent(courseRunId)}`,
    ),
  getByUser: (userId: string) =>
    apiGet<EnrollmentResponse[]>(
      `/api/v1/enrollments/by-user/${encodeURIComponent(userId)}`,
    ),
  manualEnroll: (payload: ManualEnrollmentRequest) =>
    apiPost<EnrollmentResponse>('/api/v1/enrollments/manual', payload),
  update: (enrollmentId: string, payload: EnrollmentUpdateRequest) =>
    apiPut<EnrollmentResponse>(
      `/api/v1/enrollments/${enrollmentId}`,
      payload,
    ),
  remove: (enrollmentId: string) =>
    apiDelete<string>(`/api/v1/enrollments/${enrollmentId}`),
  filter: (payload: {
    courseRunId: string;
    page?: number;
    pageSize?: number;
    conditions?: unknown[];
  }) =>
    apiPost<PagingResponse<EnrollmentResponse>>(
      '/api/v1/enrollments/filter',
      payload,
    ),
  importByExcel: async (courseRunId: string, file: File, dryRun = false) => {
    const form = new FormData();
    form.append('courseRunId', courseRunId);
    form.append('file', file);
    form.append('dryRun', String(dryRun));
    return apiPostForm<EnrollmentImportResponse>(
      '/api/v1/enrollments/import',
      form,
    );
  },
  downloadImportTemplate: () =>
    apiGetBlob('/api/v1/enrollments/import-template'),
};
