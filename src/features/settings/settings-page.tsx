import { PageHeader } from '@/components/admin/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BRAND } from '@/lib/brand/constants';
import { ADMIN_PAGE_META } from '@/lib/admin-page-meta';
import { useAdminPageMeta } from '@/lib/page-meta';

export function SettingsPage() {
  useAdminPageMeta(ADMIN_PAGE_META.settings);

  const apiUrl = import.meta.env.VITE_API_URL ?? 'Unavailable';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Settings"
        description="Review environment details and service configuration."
      />
      <Card className="shadow-sm">
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
              <p className="mt-1 font-semibold">Development</p>
            </div>
          </div>
          <Separator />
          <div>
            <p className="text-muted-foreground text-sm font-medium">API endpoint</p>
            <p className="mt-1 font-mono text-sm">{apiUrl}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
