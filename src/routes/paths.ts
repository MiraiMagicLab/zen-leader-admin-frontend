export const ROUTES = {
  login: '/login',
  home: '/',
  users: '/users',
  programs: '/programs',
  programCourses: (programId: string) => `/programs/${programId}/courses`,
  courses: '/courses',
  courseDetail: (courseId: string, tab?: 'syllabus' | 'runs', itemId?: string) => {
    const params = new URLSearchParams();
    if (tab) {
      params.set('tab', tab);
    }
    if (itemId) {
      params.set('itemId', itemId);
    }
    const query = params.toString();
    return query ? `/courses/${courseId}?${query}` : `/courses/${courseId}`;
  },
  courseRuns: '/course-runs',
  courseRunDetail: (runId: string) => `/course-runs/${runId}`,
  syllabusItemDetail: (itemId: string) => `/syllabus-items/${itemId}`,
  events: '/events',
  eventDetail: (eventId: string) => `/events/${eventId}`,
  liveSessions: '/live-sessions',
  payments: '/payments',
  notifications: '/notifications',
  moderation: '/moderation',
  auditLogs: '/audit-logs',
  settings: '/settings',
} as const;
