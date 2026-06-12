'use client';

import { memo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '@/providers/theme-provider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { useLogoutMutation } from '@/hooks/use-auth-mutations';
import { getRouteLabel } from '@/lib/route-labels';
import { ROUTES } from '@/routes/paths';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { Moon, Sun, LogOut, ChevronDown } from 'lucide-react';

export const DashboardHeader = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logoutMutation = useLogoutMutation();
  const { theme, setTheme } = useTheme();

  const pageLabel = getRouteLabel(location.pathname);
  const isHome = location.pathname === ROUTES.home;

  const isDark =
    theme === 'dark' ||
    (theme === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

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
      <div className="flex items-center gap-2 px-4">
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="hover:bg-accent data-[state=open]:bg-accent flex items-center gap-2 rounded-full border border-border/60 bg-card/50 py-1 pr-1 pl-1 shadow-sm transition-colors md:pr-3"
            >
              <Avatar size="sm">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <p className="max-w-[140px] truncate text-sm leading-none font-medium">
                  {user?.name ?? 'Admin'}
                </p>
                <p className="text-muted-foreground mt-0.5 max-w-[140px] truncate text-xs capitalize">
                  {user?.role ?? 'admin'}
                </p>
              </div>
              <ChevronDown className="text-muted-foreground hidden size-4 md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <p className="text-sm leading-none font-medium">
                  {user?.name ?? 'Admin'}
                </p>
                <p className="text-muted-foreground text-xs">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setTheme(isDark ? 'light' : 'dark')}>
              {isDark ? (
                <Sun className="mr-2 h-4 w-4" />
              ) : (
                <Moon className="mr-2 h-4 w-4" />
              )}
              {isDark ? 'Chế độ sáng' : 'Chế độ tối'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
});

DashboardHeader.displayName = 'DashboardHeader';
