import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
} from '@/services/lib/api-request';
import type {
  CreateEventRequest,
  CommentResponse,
  EventResponse,
  UpdateEventRequest,
} from '@/services/types/domain';
import type { SpringPage } from '@/services/types/pagination';

export const eventsApi = {
  getAll: (page = 0, size = 10, includeDrafts = true) =>
    apiGet<SpringPage<EventResponse>>(
      `/api/v1/events?page=${page}&size=${size}&includeDrafts=${includeDrafts}`,
    ),
  getById: (id: string) => apiGet<EventResponse>(`/api/v1/events/${id}`),
  create: (payload: CreateEventRequest) =>
    apiPost<EventResponse>('/api/v1/events', payload),
  update: (id: string, payload: UpdateEventRequest) =>
    apiPut<EventResponse>(`/api/v1/events/${id}`, payload),
  remove: (id: string) => apiDelete<string>(`/api/v1/events/${id}`),
  publish: (id: string) =>
    apiPatch<EventResponse>(`/api/v1/events/${id}/publish`),
  unpublish: (id: string) =>
    apiPatch<EventResponse>(`/api/v1/events/${id}/unpublish`),
  getComments: (eventId: string, page = 0, pageSize = 20) =>
    apiGet<import('@/services/types/pagination').PagingResponse<CommentResponse>>(
      `/api/v1/events/${eventId}/comments?page=${page}&pageSize=${pageSize}`,
    ),
  deleteComment: (commentId: string) =>
    apiDelete<string>(`/api/v1/events/comments/${commentId}`),
  updateComment: (commentId: string, content: string) =>
    apiPut<CommentResponse>(`/api/v1/events/comments/${commentId}`, { content }),
};
