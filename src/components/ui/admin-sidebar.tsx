'use client';

import { memo } from 'react';
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
  LayoutDashboard,
  Users,
  BarChart3,
  FileText,
  Activity,
  Database,
  Shield,
  Zap,
  Bell,
  Settings,
} from 'lucide-react';

const menuItems = [
  { title: 'Dashboard', icon: LayoutDashboard, href: '#dashboard' },
  { title: 'Analytics', icon: BarChart3, href: '#analytics' },
  { title: 'Users', icon: Users, href: '#users' },
  { title: 'Content', icon: FileText, href: '#content' },
  { title: 'Activity', icon: Activity, href: '#activity' },
  { title: 'Database', icon: Database, href: '#database' },
  { title: 'Security', icon: Shield, href: '#security' },
  { title: 'Performance', icon: Zap, href: '#performance' },
  { title: 'Notifications', icon: Bell, href: '#notifications' },
  { title: 'Settings', icon: Settings, href: '#settings' },
];

export const AdminSidebar = memo(() => {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#dashboard">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Lucy Admin</span>
                  <span className="truncate text-xs">Admin Panel</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild>
                      <a href={item.href}>
                        <Icon />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
});

AdminSidebar.displayName = 'AdminSidebar';
