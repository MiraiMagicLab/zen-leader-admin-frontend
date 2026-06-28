import { useState, type FormEvent } from 'react';
import { ArrowRight, BookOpenCheck, Lock, ShieldCheck, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { BrandLogo } from '@/components/brand/brand-logo';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getAuthMutationErrorMessage,
  useLoginMutation,
} from '@/hooks/use-auth-mutations';
import { ADMIN_PAGE_META } from '@/lib/admin-page-meta';
import { BRAND } from '@/lib/brand/constants';
import { useAdminPageMeta } from '@/lib/page-meta';
import { ROUTES } from '@/routes/paths';

const highlights = [
  {
    icon: ShieldCheck,
    title: 'Role-based access',
    description: 'Audit trails and verified admin sessions protect platform changes.',
  },
  {
    icon: BookOpenCheck,
    title: 'One place to operate',
    description:
      'Programs, course runs, live sessions, payments, and community activity in a single console.',
  },
] as const;

export function LoginPage() {
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();
  const [error, setError] = useState<string | null>(null);

  useAdminPageMeta(ADMIN_PAGE_META.login);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    loginMutation.mutate(
      { email, passwordHash: password },
      {
        onSuccess: () => navigate(ROUTES.home, { replace: true }),
        onError: (err) => setError(getAuthMutationErrorMessage(err)),
      },
    );
  };

  const isSubmitting = loginMutation.isPending;

  return (
    <div className="bg-background grid min-h-svh w-full lg:grid-cols-2">
      <aside className="bg-muted/30 hidden flex-col justify-between border-r p-10 lg:flex xl:p-14">
        <div>
          <BrandLogo
            className="mb-8 flex size-14 items-center justify-center overflow-hidden rounded-2xl bg-white ring-1 ring-black/5"
            imageClassName="h-10 w-10 object-contain"
            alt={`${BRAND.adminTitle} logo`}
          />
          <h1 className="text-3xl font-semibold tracking-tight">{BRAND.adminTitle}</h1>
          <p className="text-muted-foreground mt-3 max-w-md text-base leading-relaxed">
            {BRAND.tagline}
          </p>
        </div>

        <ul className="space-y-5">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.title} className="flex gap-4">
                <div className="bg-background flex size-10 shrink-0 items-center justify-center rounded-xl border">
                  <Icon className="text-primary size-5" />
                </div>
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-muted-foreground mt-0.5 text-sm">{item.description}</p>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="text-muted-foreground text-xs">
          © {new Date().getFullYear()} {BRAND.copyright}. {BRAND.adminSubtitle} {BRAND.version}
        </p>
      </aside>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandLogo
              className="flex size-12 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-black/5"
              imageClassName="h-9 w-9 object-contain"
              alt={`${BRAND.adminTitle} logo`}
            />
            <div>
              <p className="font-semibold">{BRAND.adminTitle}</p>
              <p className="text-muted-foreground text-xs">{BRAND.adminSubtitle}</p>
            </div>
          </div>

          <Card>
            <CardHeader className="space-y-1 pb-2">
              <CardTitle className="text-2xl font-semibold tracking-tight">
                Sign in
              </CardTitle>
              <CardDescription className="text-base">
                Use your authorized {BRAND.name} admin account.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form className="space-y-5" onSubmit={handleSubmit}>
                {error ? (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="email">Work email</Label>
                  <div className="relative">
                    <User className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="email"
                      name="email"
                      type="text"
                      placeholder="name@zenleader.global"
                      autoComplete="username"
                      required
                      disabled={isSubmitting}
                      className="h-11 pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="password">Password</Label>
                    <a
                      href="mailto:support@zenleader.global?subject=Zen%20Leader%20Admin%20Access%20Support"
                      className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                    >
                      Contact support
                    </a>
                  </div>
                  <div className="relative">
                    <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                      disabled={isSubmitting}
                      className="h-11 pl-10"
                    />
                  </div>
                </div>

                <Button type="submit" size="lg" disabled={isSubmitting} className="h-11 w-full gap-2">
                  {isSubmitting ? 'Signing in…' : 'Sign in'}
                  {!isSubmitting ? <ArrowRight className="size-4" /> : null}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
