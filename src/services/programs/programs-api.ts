import {
  apiDelete,
  apiGet,
  apiPost,
  apiPut,
} from '@/services/lib/api-request';
import type {
  ProgramResponse,
  ProgramUpsertRequest,
} from '@/services/types/domain';
import type { PagingResponse } from '@/services/types/pagination';

export const programsApi = {
  getAll: () => apiGet<ProgramResponse[]>('/api/v1/programs'),
  getPage: (page = 0, pageSize = 20) =>
    apiGet<PagingResponse<ProgramResponse>>(
      `/api/v1/programs/paged?page=${page}&pageSize=${pageSize}`,
    ),
  getById: (id: string) => apiGet<ProgramResponse>(`/api/v1/programs/${id}`),
  create: (payload: ProgramUpsertRequest) =>
    apiPost<ProgramResponse>('/api/v1/programs', payload),
  update: (id: string, payload: ProgramUpsertRequest) =>
    apiPut<ProgramResponse>(`/api/v1/programs/${id}`, payload),
  remove: (id: string) => apiDelete<string>(`/api/v1/programs/${id}`),
};
