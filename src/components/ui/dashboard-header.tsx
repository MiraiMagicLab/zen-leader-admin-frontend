'use client';

import { memo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Monitor, Moon, Sun } from 'lucide-react';

import { AdminCommandPalette } from '@/components/admin/admin-command-palette';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useLogoutMutation } from '@/hooks/use-auth-mutations';
import { getRouteLabel } from '@/lib/route-labels';
import { useTheme } from '@/providers/theme-provider';
import { ROUTES } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

export const DashboardHeader = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogoutMutation();
  const { theme, setTheme } = useTheme();

  const pageLabel = getRouteLabel(location.pathname);
  const isHome = location.pathname === ROUTES.home;

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSettled: () => navigate(ROUTES.login, { replace: true }),
    });
  };

  const userInitials =
    user?.name
      ?.split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? 'AD';

  return (
    <header
      className={cn(
        'bg-background/80 sticky top-0 z-50 flex h-14 w-full shrink-0 items-center gap-2 border-b backdrop-blur-md',
        'group-has-data-[collapsible=icon]/sidebar-wrapper:h-12',
      )}
    >
      <div className="flex min-w-0 items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink asChild>
                <Link to={ROUTES.home}>Zen Leader Admin</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {!isHome ? (
              <>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>{pageLabel}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : null}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="ml-auto flex items-center gap-2 px-4">
        <AdminCommandPalette />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="hover:bg-muted data-[state=open]:bg-muted flex items-center gap-2 rounded-lg border bg-card py-1 pr-2 pl-1 transition-colors"
            >
              <Avatar size="sm">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left leading-tight md:block">
                <p className="max-w-[140px] truncate text-sm font-medium">
                  {user?.name ?? 'Admin'}
                </p>
                <p className="text-muted-foreground max-w-[140px] truncate text-xs capitalize">
                  {user?.role ?? 'admin'}
                </p>
              </div>
              <ChevronDown className="text-muted-foreground hidden size-4 md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 p-0">
            <div className="flex items-center gap-3 p-3">
              <Avatar size="default">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user?.name ?? 'Admin'}</p>
                <p className="text-muted-foreground truncate text-xs">{user?.email}</p>
              </div>
            </div>

            <DropdownMenuSeparator className="m-0" />

            <div className="p-2">
              <p className="text-muted-foreground mb-1.5 px-1 text-xs font-medium">Appearance</p>
              <div className="bg-muted/60 grid grid-cols-3 gap-1 rounded-lg p-1">
                {THEME_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const active = theme === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setTheme(option.value)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-md py-1.5 text-xs font-medium transition-colors',
                        active
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <Icon className="size-4" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <DropdownMenuSeparator className="m-0" />

            <div className="p-1">
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 size-4" />
                Sign out
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
});

DashboardHeader.displayName = 'DashboardHeader';
