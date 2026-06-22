import { ROUTES } from '@/routes/paths';

const exactLabels: Record<string, string> = {
  [ROUTES.home]: 'Tổng quan',
  [ROUTES.users]: 'Users',
  [ROUTES.programs]: 'Programs',
  [ROUTES.courses]: 'Courses',
  [ROUTES.courseRuns]: 'Course Runs',
  [ROUTES.events]: 'Events',
  [ROUTES.payments]: 'Payments',
  [ROUTES.moderation]: 'Moderation',
  [ROUTES.auditLogs]: 'Audit log',
};

const prefixLabels: { prefix: string; label: string }[] = [
  { prefix: '/users/', label: 'User Details' },
  { prefix: '/programs/', label: 'Program Courses' },
  { prefix: '/courses/', label: 'Course Details' },
  { prefix: '/course-runs/', label: 'Course Run Details' },
  { prefix: '/syllabus-items/', label: 'Syllabus Item Details' },
  { prefix: '/events/', label: 'Event Details' },
];

export function getRouteLabel(pathname: string): string {
  if (exactLabels[pathname]) {
    return exactLabels[pathname];
  }

  const prefix = prefixLabels.find((entry) => pathname.startsWith(entry.prefix));
  return prefix?.label ?? 'Zen Leader Admin';
}
