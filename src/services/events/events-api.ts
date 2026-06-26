import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
} from '@/services/lib/api-request';
import type {
  EventAdminFeedParams,
  CreateEventRequest,
  CommentResponse,
  EventResponse,
  UpdateEventRequest,
} from '@/services/types/domain';
import type { PagingResponse } from '@/services/types/pagination';

export const eventsApi = {
  getAll: (page = 0, size = 10, includeDrafts = true) =>
    apiGet<PagingResponse<EventResponse>>(
      `/api/v1/events/web/feed?page=${page}&size=${size}&includeDrafts=${includeDrafts}`,
    ),
  getAdminFeed: (params: EventAdminFeedParams) => {
    const searchParams = new URLSearchParams();
    searchParams.set('page', String(params.page));
    searchParams.set('pageSize', String(params.pageSize));
    if (params.keyword?.trim()) {
      searchParams.set('keyword', params.keyword.trim());
    }
    if (params.status?.trim()) {
      searchParams.set('status', params.status.trim());
    }
    if (typeof params.isOfficial === 'boolean') {
      searchParams.set('isOfficial', String(params.isOfficial));
    }
    if (params.authorKeyword?.trim()) {
      searchParams.set('authorKeyword', params.authorKeyword.trim());
    }
    return apiGet<PagingResponse<EventResponse>>(`/api/v1/events/admin/feed?${searchParams.toString()}`);
  },
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
  getComments: (eventId: string, page = 0, pageSize = 10) =>
    apiGet<import('@/services/types/pagination').PagingResponse<CommentResponse>>(
      `/api/v1/events/${eventId}/comments?page=${page}&pageSize=${pageSize}`,
    ),
  deleteComment: (commentId: string) =>
    apiDelete<string>(`/api/v1/events/comments/${commentId}`),
  updateComment: (commentId: string, content: string) =>
    apiPut<CommentResponse>(`/api/v1/events/comments/${commentId}`, { content }),
};
