import { apiGet } from '@/services/lib/api-request';
import type { MeetingTokenResponse } from '@/services/types/domain';

export const meetingsApi = {
  getJoinToken: (roomCode: string) =>
    apiGet<MeetingTokenResponse>(
      `/api/v1/meetings/token?roomCode=${encodeURIComponent(roomCode)}`,
    ),
};
