import { apiGet } from '@/services/lib/api-request';
import type {
  CourseRunProgressSummaryResponse,
  SyllabusProgressResponse,
  SessionAttendanceResponse,
} from '@/services/types/domain';

export const progressApi = {
  getSummary: (userId: string, courseRunId: string) =>
    apiGet<CourseRunProgressSummaryResponse>(
      `/api/v1/admin/progress/users/${userId}/course-runs/${courseRunId}/summary`,
    ),
  getSyllabus: (userId: string, courseRunId: string) =>
    apiGet<SyllabusProgressResponse[]>(
      `/api/v1/admin/progress/users/${userId}/course-runs/${courseRunId}/syllabus`,
    ),
  getSessions: (userId: string, courseRunId: string) =>
    apiGet<SessionAttendanceResponse[]>(
      `/api/v1/admin/progress/users/${userId}/course-runs/${courseRunId}/sessions`,
    ),
};
