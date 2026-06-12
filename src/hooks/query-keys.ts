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
  chapters: {
    all: ['chapters'] as const,
    list: (courseRunId: string) =>
      [...queryKeys.chapters.all, 'list', courseRunId] as const,
  },
  lessons: {
    all: ['lessons'] as const,
    list: (chapterId: string) =>
      [...queryKeys.lessons.all, 'list', chapterId] as const,
    detail: (id: string) => [...queryKeys.lessons.all, 'detail', id] as const,
  },
  progress: {
    all: ['progress'] as const,
    summary: (userId: string, courseRunId: string) =>
      [...queryKeys.progress.all, 'summary', userId, courseRunId] as const,
    lessons: (userId: string, courseRunId: string) =>
      [...queryKeys.progress.all, 'lessons', userId, courseRunId] as const,
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
    list: (page: number, size: number) =>
      [...queryKeys.events.all, 'list', page, size] as const,
    detail: (id: string) => [...queryKeys.events.all, 'detail', id] as const,
    comments: (id: string, page: number) =>
      [...queryKeys.events.all, 'comments', id, page] as const,
  },
  payments: {
    all: ['payments'] as const,
    list: (page: number, status?: string) =>
      [...queryKeys.payments.all, 'list', page, status ?? 'all'] as const,
  },
  safety: {
    all: ['safety'] as const,
    reports: (page: number, status?: string) =>
      [...queryKeys.safety.all, 'reports', page, status ?? 'all'] as const,
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
  streaks: {
    all: ['streaks'] as const,
    summary: (userId: string) =>
      [...queryKeys.streaks.all, 'summary', userId] as const,
  },
  relationships: {
    all: ['relationships'] as const,
    friends: (userId: string) =>
      [...queryKeys.relationships.all, 'friends', userId] as const,
    requests: (userId: string) =>
      [...queryKeys.relationships.all, 'requests', userId] as const,
  },
  messaging: {
    all: ['messaging'] as const,
    conversation: (courseRunId: string) =>
      [...queryKeys.messaging.all, 'conversation', courseRunId] as const,
    messages: (conversationId: string, page: number) =>
      [...queryKeys.messaging.all, 'messages', conversationId, page] as const,
  },
  auditLogs: {
    all: ['audit-logs'] as const,
    list: (params: Record<string, unknown>) =>
      [...queryKeys.auditLogs.all, 'list', params] as const,
  },
} as const;
