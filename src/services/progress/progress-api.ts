import { apiGet } from '@/services/lib/api-request';
import type {
  CourseRunProgressSummaryResponse,
  LessonProgressResponse,
} from '@/services/types/domain';

export const progressApi = {
  getSummary: (userId: string, courseRunId: string) =>
    apiGet<CourseRunProgressSummaryResponse>(
      `/api/v1/admin/progress/users/${userId}/course-runs/${courseRunId}/summary`,
    ),
  getLessons: (userId: string, courseRunId: string) =>
    apiGet<LessonProgressResponse[]>(
      `/api/v1/admin/progress/users/${userId}/course-runs/${courseRunId}/lessons`,
    ),
};
