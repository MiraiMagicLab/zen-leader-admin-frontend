import { ROUTES } from '@/routes/paths';

const exactLabels: Record<string, string> = {
  [ROUTES.home]: 'Tổng quan',
  [ROUTES.users]: 'Người dùng',
  [ROUTES.programs]: 'Chương trình',
  [ROUTES.courses]: 'Khóa học',
  [ROUTES.courseRuns]: 'Lớp chạy',
  [ROUTES.events]: 'Sự kiện',
  [ROUTES.liveSessions]: 'Live sessions',
  [ROUTES.notifications]: 'Thông báo',
  [ROUTES.payments]: 'Thanh toán',
  [ROUTES.moderation]: 'Kiểm duyệt',
  [ROUTES.auditLogs]: 'Audit log',
  [ROUTES.settings]: 'Cài đặt',
};

const prefixLabels: { prefix: string; label: string }[] = [
  { prefix: '/users/', label: 'Chi tiết người dùng' },
  { prefix: '/programs/', label: 'Khóa học chương trình' },
  { prefix: '/courses/', label: 'Chi tiết khóa học' },
  { prefix: '/course-runs/', label: 'Chi tiết lớp chạy' },
  { prefix: '/syllabus-items/', label: 'Chi tiết mục giáo trình' },
  { prefix: '/events/', label: 'Chi tiết sự kiện' },
];

export function getRouteLabel(pathname: string): string {
  if (exactLabels[pathname]) {
    return exactLabels[pathname];
  }

  const prefix = prefixLabels.find((entry) => pathname.startsWith(entry.prefix));
  return prefix?.label ?? 'Zen Leader Admin';
}
