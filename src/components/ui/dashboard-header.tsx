'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/providers/theme-provider';
import {
  Avatar,
  AvatarFallback,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from '@/components/ui/breadcrumb';
import { useLogoutMutation } from '@/hooks/use-auth-mutations';
import { ROUTES } from '@/routes';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import {
  Bell,
  Search,
  Filter,
  Download,
  RefreshCw,
  MoreHorizontal,
  Moon,
  Sun,
  Settings,
  LogOut,
  User,
  ChevronDown,
} from 'lucide-react';

interface DashboardHeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onExport: () => void;
  isRefreshing: boolean;
}

export const DashboardHeader = memo(
  ({
    searchQuery,
    onSearchChange,
    onRefresh,
    onExport,
    isRefreshing,
  }: DashboardHeaderProps) => {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const logoutMutation = useLogoutMutation();
    const { theme, setTheme } = useTheme();

    const isDark =
      theme === 'dark' ||
      (theme === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    const toggleTheme = () => {
      setTheme(isDark ? 'light' : 'dark');
    };

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
          'bg-background/95 sticky top-0 z-50 flex h-16 w-full shrink-0 items-center gap-2 border-b backdrop-blur transition-[width,height] ease-linear',
          'group-has-data-[collapsible=icon]/sidebar-wrapper:h-12',
        )}
      >
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="#">Home</BreadcrumbLink>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="ml-auto flex items-center gap-2 px-4">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="relative hidden md:block">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-64 pl-10"
              />
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>

              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild className="md:hidden">
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onSearchChange('')}>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onRefresh}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="icon" className="relative">
              <Bell className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="hover:bg-accent data-[state=open]:bg-accent flex items-center gap-2 rounded-full border border-transparent py-1 pr-1 pl-1 transition-colors hover:border-border/60 md:pr-3"
                >
                  <Avatar size="sm">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left md:block">
                    <p className="max-w-[120px] truncate text-sm leading-none font-medium">
                      {user?.name ?? 'Admin'}
                    </p>
                    <p className="text-muted-foreground mt-0.5 max-w-[120px] truncate text-xs capitalize">
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
                    <p className="text-muted-foreground text-xs">
                      @{user?.username ?? 'admin'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Hồ sơ
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  Cài đặt
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleTheme}>
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
          </motion.div>
        </div>
      </header>
    );
  },
);

DashboardHeader.displayName = 'DashboardHeader';
