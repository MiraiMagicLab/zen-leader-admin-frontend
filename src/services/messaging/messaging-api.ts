import { apiDelete, apiGet } from '@/services/lib/api-request';
import type { ChatMessageResponse, ConversationResponse } from '@/services/types/domain';
import type { PagingResponse } from '@/services/types/pagination';

export const messagingApi = {
  getCourseRunConversation: (courseRunId: string) =>
    apiGet<ConversationResponse>(
      `/api/v1/admin/messaging/course-runs/${courseRunId}/conversation`,
    ),
  getMessages: (conversationId: string, page = 1, pageSize = 50) =>
    apiGet<PagingResponse<ChatMessageResponse>>(
      `/api/v1/admin/messaging/conversations/${conversationId}/messages?page=${page}&pageSize=${pageSize}`,
    ),
  deleteMessage: (messageId: string) =>
    apiDelete<string>(`/api/v1/admin/messaging/messages/${messageId}`),
};
