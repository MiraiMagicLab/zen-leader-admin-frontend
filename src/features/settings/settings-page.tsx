import { Monitor, Moon, Sun } from 'lucide-react';

import { AdminPageShell } from '@/components/admin/admin-page-shell';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Kbd } from '@/components/ui/kbd';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ADMIN_PAGE_META } from '@/lib/admin-page-meta';
import { BRAND } from '@/lib/brand/constants';
import { useAdminPageMeta } from '@/lib/page-meta';
import { useTheme } from '@/providers/theme-provider';
import { useAuthStore } from '@/stores/auth-store';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

export function SettingsPage() {
  useAdminPageMeta(ADMIN_PAGE_META.settings);

  const { theme, setTheme } = useTheme();
  const user = useAuthStore((state) => state.user);

  const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'Unavailable';
  const environment = import.meta.env.PROD ? 'Production' : 'Development';

  return (
    <AdminPageShell
      title="Settings"
      description="Personal preferences and environment details for the admin console."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Choose how the admin console looks on this device.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ToggleGroup
              type="single"
              variant="outline"
              value={theme}
              onValueChange={(value) => {
                if (value) setTheme(value as typeof theme);
              }}
            >
              {THEME_OPTIONS.map((option) => (
                <ToggleGroupItem key={option.value} value={option.value} className="gap-2 px-4">
                  <option.icon className="size-4" />
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="text-muted-foreground text-sm">
              Press <Kbd>D</Kbd> anywhere outside a text field to quickly toggle dark mode.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your profile</CardTitle>
            <CardDescription>Signed-in account for this admin session.</CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="flex items-center gap-4">
                <Avatar size="lg">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {user.name.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-medium">{user.name}</p>
                  <p className="text-muted-foreground truncate text-sm">{user.email}</p>
                  <Badge variant="secondary">{user.role}</Badge>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No profile information available.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Navigation</CardTitle>
            <CardDescription>Keyboard shortcuts available across the console.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
              <div>
                <p className="text-sm font-medium">Command palette</p>
                <p className="text-muted-foreground text-xs">Jump to any page instantly.</p>
              </div>
              <Kbd>⌘K</Kbd>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{BRAND.adminTitle}</CardTitle>
            <CardDescription>{BRAND.tagline}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Version
                </p>
                <p className="mt-1 font-semibold">{BRAND.version}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  Environment
                </p>
                <p className="mt-1 font-semibold">{environment}</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-muted-foreground text-sm font-medium">API base URL</p>
              <p className="mt-1 font-mono text-sm break-all">{apiBaseUrl}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminPageShell>
  );
}
