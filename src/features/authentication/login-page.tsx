import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  GraduationCap,
  Lock,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
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
import { BRAND } from '@/lib/brand/constants';
import { ROUTES } from '@/routes/paths';
import { cn } from '@/lib/utils';

const highlights = [
  {
    icon: ShieldCheck,
    title: 'Bảo mật đa lớp',
    description: 'Phân quyền admin, audit log và kiểm soát truy cập theo thời gian thực.',
  },
  {
    icon: Sparkles,
    title: 'Quản trị LMS',
    description: 'Theo dõi học viên, khóa học, đợt học và hoạt động nền tảng.',
  },
];

export function LoginPage() {
  const navigate = useNavigate();
  const loginMutation = useLoginMutation();
  const [error, setError] = useState<string | null>(null);

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
    <div className="bg-background relative flex min-h-svh overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-primary/5"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-32 size-80 rounded-full bg-primary/5 blur-3xl"
      />

      <div className="relative z-10 grid w-full lg:grid-cols-2">
        <motion.aside
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative hidden flex-col justify-between overflow-hidden border-r border-border/60 bg-muted/30 p-10 lg:flex xl:p-14"
        >
          <div
            aria-hidden
            className="absolute inset-0 bg-primary/5"
          />
          <div
            aria-hidden
            className="absolute top-1/2 left-1/2 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10 bg-primary/[0.04]"
          />

          <div className="relative">
            <div className="bg-primary text-primary-foreground mb-8 flex size-12 items-center justify-center rounded-2xl shadow-lg shadow-primary/25">
              <GraduationCap className="size-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight xl:text-4xl">
              {BRAND.adminTitle}
            </h1>
            <p className="text-muted-foreground mt-3 max-w-md text-base leading-relaxed">
              {BRAND.tagline}
            </p>
          </div>

          <ul className="relative space-y-5">
            {highlights.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.li
                  key={item.title}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + index * 0.1, duration: 0.4 }}
                  className="flex gap-4"
                >
                  <div className="bg-background/80 flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/80 shadow-sm backdrop-blur-sm">
                    <Icon className="text-primary size-5" />
                  </div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-muted-foreground mt-0.5 text-sm">
                      {item.description}
                    </p>
                  </div>
                </motion.li>
              );
            })}
          </ul>

          <p className="text-muted-foreground relative text-xs">
            © {new Date().getFullYear()} {BRAND.copyright}. {BRAND.adminSubtitle}{' '}
            {BRAND.version}
          </p>
        </motion.aside>

        <div className="flex items-center justify-center p-6 sm:p-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut', delay: 0.05 }}
            className="w-full max-w-[420px]"
          >
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-xl shadow-md shadow-primary/20">
                <GraduationCap className="size-5" />
              </div>
              <div>
                <p className="font-semibold">{BRAND.adminTitle}</p>
                <p className="text-muted-foreground text-xs">{BRAND.adminSubtitle}</p>
              </div>
            </div>

            <Card className="border-border/70 bg-card/80 shadow-xl shadow-black/5 backdrop-blur-xl dark:shadow-black/20">
              <CardHeader className="space-y-1 pb-2">
                <Badge
                  variant="secondary"
                  className="mb-2 w-fit border-primary/20 bg-primary/10 text-primary"
                >
                  Truy cập bảo mật
                </Badge>
                <CardTitle className="text-2xl font-bold tracking-tight">
                  Chào mừng trở lại
                </CardTitle>
                <CardDescription className="text-base">
                  Đăng nhập để truy cập bảng điều khiển {BRAND.name}.
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
                    <Label htmlFor="email">Email / tài khoản</Label>
                    <div className="relative">
                      <User className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                      <Input
                        id="email"
                        name="email"
                        type="text"
                        placeholder="admin@example.com"
                        autoComplete="username"
                        required
                        disabled={isSubmitting}
                        className="h-11 bg-background/60 pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="password">Mật khẩu</Label>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="••••••"
                        autoComplete="current-password"
                        required
                        disabled={isSubmitting}
                        className="h-11 bg-background/60 pl-10"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className={cn(
                      'h-11 w-full gap-2 font-medium shadow-md shadow-primary/20',
                      isSubmitting && 'opacity-80',
                    )}
                  >
                    {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
                    {!isSubmitting ? (
                      <ArrowRight className="size-4" />
                    ) : null}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
