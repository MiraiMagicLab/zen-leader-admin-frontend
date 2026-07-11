'use client';

import { memo, type ComponentType } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  Bell,
  BookOpen,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Radio,
  ScrollText,
  Settings,
  ShieldAlert,
  Users,
} from 'lucide-react';
import { BrandLogo } from '@/components/brand/brand-logo';
import { BRAND } from '@/lib/brand/constants';
import { ROUTES } from '@/routes/paths';

type MenuItem = {
  title: string;
  icon: ComponentType<{ className?: string }>;
  to: string;
  end?: boolean;
};

type MenuGroup = {
  label: string;
  items: MenuItem[];
};

const menuGroups: MenuGroup[] = [
  {
    label: 'Overview',
    items: [
      { title: 'Dashboard', icon: LayoutDashboard, to: ROUTES.home, end: true },
    ],
  },
  {
    label: 'Learning',
    items: [
      { title: 'Programs', icon: GraduationCap, to: ROUTES.programs },
      { title: 'Courses', icon: BookOpen, to: ROUTES.courses },
      { title: 'Course Runs', icon: Layers, to: ROUTES.courseRuns },
    ],
  },
  {
    label: 'Community',
    items: [
      { title: 'Events', icon: CalendarDays, to: ROUTES.events },
      { title: 'Live Sessions', icon: Radio, to: ROUTES.liveSessions },
    ],
  },
  {
    label: 'Finance',
    items: [
      { title: 'Revenue', icon: CircleDollarSign, to: ROUTES.revenue },
      { title: 'Payments', icon: CreditCard, to: ROUTES.payments },
    ],
  },
  {
    label: 'Operations',
    items: [
      { title: 'Users', icon: Users, to: ROUTES.users },
      { title: 'Notifications', icon: Bell, to: ROUTES.notifications },
      { title: 'Moderation', icon: ShieldAlert, to: ROUTES.moderation },
      { title: 'Audit log', icon: ScrollText, to: ROUTES.auditLogs },
      { title: 'Settings', icon: Settings, to: ROUTES.settings },
    ],
  },
];

export const AdminSidebar = memo(() => {
  const location = useLocation();

  const isActive = (to: string, end?: boolean) => {
    if (end) {
      return location.pathname === to;
    }
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink to={ROUTES.home}>
                <BrandLogo
                  className="flex size-10 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5"
                  imageClassName="h-8 w-8 object-contain"
                  alt={`${BRAND.adminTitle} logo`}
                />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{BRAND.adminTitle}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {BRAND.adminSubtitle}
                  </span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.to, item.end);
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <NavLink to={item.to} end={item.end}>
                          <Icon />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
});

AdminSidebar.displayName = 'AdminSidebar';
