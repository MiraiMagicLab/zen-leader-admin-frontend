import { ROUTES } from '@/routes/paths';

const exactLabels: Record<string, string> = {
  [ROUTES.home]: 'Overview',
  [ROUTES.users]: 'Users',
  [ROUTES.programs]: 'Programs',
  [ROUTES.courses]: 'Courses',
  [ROUTES.courseRuns]: 'Course Runs',
  [ROUTES.events]: 'Events',
  [ROUTES.liveSessions]: 'Live Sessions',
  [ROUTES.payments]: 'Payments',
  [ROUTES.notifications]: 'Notifications',
  [ROUTES.moderation]: 'Moderation',
  [ROUTES.auditLogs]: 'Audit log',
  [ROUTES.settings]: 'Settings',
};

const prefixLabels: { prefix: string; label: string }[] = [
  { prefix: '/users/', label: 'User Details' },
  { prefix: '/programs/', label: 'Program Courses' },
  { prefix: '/courses/', label: 'Course Details' },
  { prefix: '/course-runs/', label: 'Course Run Details' },
  { prefix: '/syllabus-items/', label: 'Lesson Details' },
  { prefix: '/events/', label: 'Event Details' },
];

export function getRouteLabel(pathname: string): string {
  if (exactLabels[pathname]) {
    return exactLabels[pathname];
  }

  const prefix = prefixLabels.find((entry) => pathname.startsWith(entry.prefix));
  return prefix?.label ?? 'Zen Leader Admin';
}
