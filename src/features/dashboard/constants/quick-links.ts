import {
  BookOpen,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  ShieldAlert,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { ROUTES } from '@/routes/paths';

export type QuickLinkItem = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

export const DASHBOARD_QUICK_LINKS: QuickLinkItem[] = [
  {
    title: 'Manage users',
    description: 'Roles, account locks, and student profiles.',
    href: ROUTES.users,
    icon: Users,
  },
  {
    title: 'Create course',
    description: 'Add courses, syllabus, and course runs.',
    href: ROUTES.courses,
    icon: BookOpen,
  },
  {
    title: 'Manage events',
    description: 'Schedules, publishing status, and event details.',
    href: ROUTES.events,
    icon: CalendarDays,
  },
  {
    title: 'Review reports',
    description: 'Handle reports and community safety actions.',
    href: ROUTES.moderation,
    icon: ShieldAlert,
  },
  {
    title: 'Revenue analytics',
    description: 'Track collected revenue and top course runs.',
    href: ROUTES.revenue,
    icon: CircleDollarSign,
  },
  {
    title: 'Check payments',
    description: 'Review orders and resolve pending enrollments.',
    href: ROUTES.payments,
    icon: CreditCard,
  },
];
