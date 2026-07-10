export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    login: () => [...queryKeys.auth.all, 'login'] as const,
    logout: () => [...queryKeys.auth.all, 'logout'] as const,
  },
  dashboard: {
    stats: () => ['dashboard', 'stats'] as const,
  },
  users: {
    all: ['users'] as const,
    list: (params: Record<string, unknown>) =>
      [...queryKeys.users.all, 'list', params] as const,
    detail: (id: string) => [...queryKeys.users.all, 'detail', id] as const,
  },
  programs: {
    all: ['programs'] as const,
    list: () => [...queryKeys.programs.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.programs.all, 'detail', id] as const,
  },
  courses: {
    all: ['courses'] as const,
    list: (programId?: string) =>
      [...queryKeys.courses.all, 'list', programId ?? 'all'] as const,
    detail: (id: string) => [...queryKeys.courses.all, 'detail', id] as const,
  },
  courseRuns: {
    all: ['course-runs'] as const,
    list: (courseId?: string) =>
      [...queryKeys.courseRuns.all, 'list', courseId ?? 'all'] as const,
    detail: (id: string) =>
      [...queryKeys.courseRuns.all, 'detail', id] as const,
  },
  syllabusSections: {
    all: ['syllabus-sections'] as const,
    list: (courseId: string) =>
      [...queryKeys.syllabusSections.all, 'list', courseId] as const,
    detail: (id: string) =>
      [...queryKeys.syllabusSections.all, 'detail', id] as const,
  },
  syllabusItems: {
    all: ['syllabus-items'] as const,
    list: (syllabusSectionId: string) =>
      [...queryKeys.syllabusItems.all, 'list', syllabusSectionId] as const,
    detail: (id: string) =>
      [...queryKeys.syllabusItems.all, 'detail', id] as const,
  },
  sessions: {
    all: ['sessions'] as const,
    list: (courseRunId: string) =>
      [...queryKeys.sessions.all, 'list', courseRunId] as const,
    detail: (id: string) => [...queryKeys.sessions.all, 'detail', id] as const,
  },
  progress: {
    all: ['progress'] as const,
    summary: (userId: string, courseRunId: string) =>
      [...queryKeys.progress.all, 'summary', userId, courseRunId] as const,
    syllabus: (userId: string, courseRunId: string) =>
      [...queryKeys.progress.all, 'syllabus', userId, courseRunId] as const,
    sessions: (userId: string, courseRunId: string) =>
      [...queryKeys.progress.all, 'sessions', userId, courseRunId] as const,
  },
  enrollments: {
    all: ['enrollments'] as const,
    byRun: (courseRunId: string) =>
      [...queryKeys.enrollments.all, 'by-run', courseRunId] as const,
    byUser: (userId: string) =>
      [...queryKeys.enrollments.all, 'by-user', userId] as const,
    filter: (courseRunId: string, page: number) =>
      [...queryKeys.enrollments.all, 'filter', courseRunId, page] as const,
    detail: (id: string) =>
      [...queryKeys.enrollments.all, 'detail', id] as const,
  },
  events: {
    all: ['events'] as const,
    list: (params: Record<string, unknown>) =>
      [...queryKeys.events.all, 'list', params] as const,
    detail: (id: string) => [...queryKeys.events.all, 'detail', id] as const,
    comments: (id: string, page: number) =>
      [...queryKeys.events.all, 'comments', id, page] as const,
  },
  payments: {
    all: ['payments'] as const,
    list: (page: number, status?: string, keyword?: string) =>
      [...queryKeys.payments.all, 'list', page, status ?? 'all', keyword ?? ''] as const,
  },
  safety: {
    all: ['safety'] as const,
    reports: (page: number, status?: string, keyword?: string) =>
      [...queryKeys.safety.all, 'reports', page, status ?? 'all', keyword ?? ''] as const,
  },
  liveSessions: {
    all: ['live-sessions'] as const,
    list: (page: number, status?: string) =>
      [...queryKeys.liveSessions.all, 'list', page, status ?? 'all'] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    byUser: (userId: string) =>
      [...queryKeys.notifications.all, 'user', userId] as const,
  },
  auditLogs: {
    all: ['audit-logs'] as const,
    list: (params: Record<string, unknown>) =>
      [...queryKeys.auditLogs.all, 'list', params] as const,
  },
} as const;
