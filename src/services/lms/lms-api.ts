import {
  apiDelete,
  apiGet,
  apiPost,
  apiPostForm,
  apiPut,
  apiGetBlob,
} from '@/services/lib/api-request';
import type {
  SyllabusSectionResponse,
  SyllabusSectionUpsertRequest,
  EnrollmentImportResponse,
  EnrollmentResponse,
  EnrollmentUpdateRequest,
  BulkManualEnrollmentRequest,
  ManualEnrollmentBulkResponse,
  SyllabusItemFileUploadResponse,
  SyllabusItemResponse,
  SyllabusItemUpsertRequest,
  SessionResponse,
  SessionUpsertRequest,
  ManualEnrollmentRequest,
} from '@/services/types/domain';
import type { PagingResponse } from '@/services/types/pagination';

export const syllabusSectionsApi = {
  getAll: (courseId?: string) =>
    apiGet<SyllabusSectionResponse[]>(
      courseId
        ? `/api/v1/syllabus-sections?courseId=${encodeURIComponent(courseId)}`
        : '/api/v1/syllabus-sections',
    ),
  getPage: (page: number, pageSize: number, courseId?: string) =>
    apiGet<PagingResponse<SyllabusSectionResponse>>(
      courseId
        ? `/api/v1/syllabus-sections/paged?page=${page}&pageSize=${pageSize}&courseId=${encodeURIComponent(courseId)}`
        : `/api/v1/syllabus-sections/paged?page=${page}&pageSize=${pageSize}`,
    ),
  getById: (id: string) =>
    apiGet<SyllabusSectionResponse>(`/api/v1/syllabus-sections/${id}`),
  create: (payload: SyllabusSectionUpsertRequest) =>
    apiPost<SyllabusSectionResponse>('/api/v1/syllabus-sections', payload),
  update: (id: string, payload: SyllabusSectionUpsertRequest) =>
    apiPut<SyllabusSectionResponse>(`/api/v1/syllabus-sections/${id}`, payload),
  duplicate: (id: string) =>
    apiPost<SyllabusSectionResponse>(`/api/v1/syllabus-sections/${id}/duplicate`),
  remove: (id: string) =>
    apiDelete<string>(`/api/v1/syllabus-sections/${id}`),
  reorder: (sectionIds: string[]) =>
    apiPut<string>('/api/v1/syllabus-sections/reorder', { sectionIds }),
};

export const syllabusItemsApi = {
  getAll: (syllabusSectionId?: string) =>
    apiGet<SyllabusItemResponse[]>(
      syllabusSectionId
        ? `/api/v1/syllabus-items?syllabusSectionId=${encodeURIComponent(syllabusSectionId)}`
        : '/api/v1/syllabus-items',
    ),
  getPage: (page: number, pageSize: number, syllabusSectionId?: string) =>
    apiGet<PagingResponse<SyllabusItemResponse>>(
      syllabusSectionId
        ? `/api/v1/syllabus-items/paged?page=${page}&pageSize=${pageSize}&syllabusSectionId=${encodeURIComponent(syllabusSectionId)}`
        : `/api/v1/syllabus-items/paged?page=${page}&pageSize=${pageSize}`,
    ),
  getById: (id: string) =>
    apiGet<SyllabusItemResponse>(`/api/v1/syllabus-items/${id}`),
  create: (payload: SyllabusItemUpsertRequest) =>
    apiPost<SyllabusItemResponse>('/api/v1/syllabus-items', payload),
  update: (id: string, payload: SyllabusItemUpsertRequest) =>
    apiPut<SyllabusItemResponse>(`/api/v1/syllabus-items/${id}`, payload),
  duplicate: (id: string) =>
    apiPost<SyllabusItemResponse>(`/api/v1/syllabus-items/${id}/duplicate`),
  remove: (id: string) =>
    apiDelete<string>(`/api/v1/syllabus-items/${id}`),
  reorder: (itemIds: string[]) =>
    apiPut<string>('/api/v1/syllabus-items/reorder', { itemIds }),
  uploadFile: (syllabusItemId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiPostForm<SyllabusItemFileUploadResponse>(
      `/api/v1/syllabus-items/${syllabusItemId}/files`,
      form,
    );
  },
};

export const sessionsApi = {
  getAll: (courseRunId?: string) =>
    apiGet<SessionResponse[]>(
      courseRunId
        ? `/api/v1/sessions?courseRunId=${encodeURIComponent(courseRunId)}`
        : '/api/v1/sessions',
    ),
  getPage: (page: number, pageSize: number, courseRunId?: string) =>
    apiGet<PagingResponse<SessionResponse>>(
      courseRunId
        ? `/api/v1/sessions/paged?page=${page}&pageSize=${pageSize}&courseRunId=${encodeURIComponent(courseRunId)}`
        : `/api/v1/sessions/paged?page=${page}&pageSize=${pageSize}`,
    ),
  getById: (id: string) =>
    apiGet<SessionResponse>(`/api/v1/sessions/${id}`),
  create: (payload: SessionUpsertRequest) =>
    apiPost<SessionResponse>('/api/v1/sessions', payload),
  update: (id: string, payload: SessionUpsertRequest) =>
    apiPut<SessionResponse>(`/api/v1/sessions/${id}`, payload),
  remove: (id: string) =>
    apiDelete<string>(`/api/v1/sessions/${id}`),
};

export const enrollmentsApi = {
  getById: (enrollmentId: string) =>
    apiGet<EnrollmentResponse>(`/api/v1/admin/enrollments/${enrollmentId}`),
  getByCourseRun: (courseRunId: string) =>
    apiGet<EnrollmentResponse[]>(
      `/api/v1/admin/enrollments/by-course-run/${encodeURIComponent(courseRunId)}`,
    ),
  getByUser: (userId: string) =>
    apiGet<EnrollmentResponse[]>(
      `/api/v1/admin/enrollments/by-user/${encodeURIComponent(userId)}`,
    ),
  manualEnroll: (payload: ManualEnrollmentRequest) =>
    apiPost<EnrollmentResponse>('/api/v1/admin/enrollments/manual', payload),
  /** Bulk manual enrollment — backed by the server-side `/manual/bulk` endpoint. */
  manualEnrollMany: (payload: BulkManualEnrollmentRequest) =>
    apiPost<ManualEnrollmentBulkResponse>(
      '/api/v1/admin/enrollments/manual/bulk',
      payload,
    ),
  update: (enrollmentId: string, payload: EnrollmentUpdateRequest) =>
    apiPut<EnrollmentResponse>(
      `/api/v1/admin/enrollments/${enrollmentId}`,
      payload,
    ),
  remove: (enrollmentId: string) =>
    apiDelete<string>(`/api/v1/admin/enrollments/${enrollmentId}`),
  filter: (payload: {
    courseRunId: string;
    page?: number;
    pageSize?: number;
    conditions?: unknown[];
  }) =>
    apiPost<PagingResponse<EnrollmentResponse>>(
      '/api/v1/admin/enrollments/filter',
      payload,
    ),
  importByExcel: async (courseRunId: string, file: File, dryRun = false) => {
    const form = new FormData();
    form.append('courseRunId', courseRunId);
    form.append('file', file);
    form.append('dryRun', String(dryRun));
    return apiPostForm<EnrollmentImportResponse>(
      '/api/v1/admin/enrollments/import',
      form,
    );
  },
  downloadImportTemplate: () =>
    apiGetBlob('/api/v1/admin/enrollments/import-template'),
};
