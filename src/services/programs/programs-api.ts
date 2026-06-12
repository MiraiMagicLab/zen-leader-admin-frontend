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

export const programsApi = {
  getAll: () => apiGet<ProgramResponse[]>('/api/v1/programs'),
  getById: (id: string) => apiGet<ProgramResponse>(`/api/v1/programs/${id}`),
  create: (payload: ProgramUpsertRequest) =>
    apiPost<ProgramResponse>('/api/v1/programs', payload),
  update: (id: string, payload: ProgramUpsertRequest) =>
    apiPut<ProgramResponse>(`/api/v1/programs/${id}`, payload),
  remove: (id: string) => apiDelete<string>(`/api/v1/programs/${id}`),
};
