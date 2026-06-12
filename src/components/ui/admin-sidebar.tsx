'use client';

import { memo, type ComponentType } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CalendarDays,
  CreditCard,
  ScrollText,
  Settings,
  Layers,
  Video,
  Bell,
  ShieldAlert,
} from 'lucide-react';
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
    label: 'Tổng quan',
    items: [
      { title: 'Dashboard', icon: LayoutDashboard, to: ROUTES.home, end: true },
    ],
  },
  {
    label: 'Nội dung học',
    items: [
      { title: 'Chương trình', icon: GraduationCap, to: ROUTES.programs },
      { title: 'Khóa học', icon: BookOpen, to: ROUTES.courses },
      { title: 'Lớp chạy', icon: Layers, to: ROUTES.courseRuns },
    ],
  },
  {
    label: 'Cộng đồng',
    items: [
      { title: 'Sự kiện', icon: CalendarDays, to: ROUTES.events },
      { title: 'Live sessions', icon: Video, to: ROUTES.liveSessions },
      { title: 'Thông báo', icon: Bell, to: ROUTES.notifications },
    ],
  },
  {
    label: 'Vận hành',
    items: [
      { title: 'Người dùng', icon: Users, to: ROUTES.users },
      { title: 'Thanh toán', icon: CreditCard, to: ROUTES.payments },
      { title: 'Kiểm duyệt', icon: ShieldAlert, to: ROUTES.moderation },
      { title: 'Audit log', icon: ScrollText, to: ROUTES.auditLogs },
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
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg shadow-sm shadow-primary/25">
                  <GraduationCap className="size-4" />
                </div>
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

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive(ROUTES.settings)}
              tooltip="Cài đặt"
            >
              <NavLink to={ROUTES.settings}>
                <Settings />
                <span>Cài đặt</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
});

AdminSidebar.displayName = 'AdminSidebar';
