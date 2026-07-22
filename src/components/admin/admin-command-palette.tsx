'use client';

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BookOpen,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  GraduationCap,
  Layers,
  LayoutDashboard,
  ScrollText,
  Search,
  Settings,
  ShieldAlert,
  Users,
} from 'lucide-react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@/components/ui/command';
import { ROUTES } from '@/routes/paths';

const NAV_COMMANDS = [
  { title: 'Dashboard', to: ROUTES.home, icon: LayoutDashboard, keywords: 'home overview' },
  { title: 'Programs', to: ROUTES.programs, icon: GraduationCap, keywords: 'learning' },
  { title: 'Courses', to: ROUTES.courses, icon: BookOpen, keywords: 'learning syllabus' },
  { title: 'Course Runs', to: ROUTES.courseRuns, icon: Layers, keywords: 'classes cohorts' },
  { title: 'Events', to: ROUTES.events, icon: CalendarDays, keywords: 'community' },
  { title: 'Revenue', to: ROUTES.revenue, icon: CircleDollarSign, keywords: 'finance analytics sales' },
  { title: 'Users', to: ROUTES.users, icon: Users, keywords: 'accounts roles ban' },
  { title: 'Payments', to: ROUTES.payments, icon: CreditCard, keywords: 'orders stripe paypal' },
  { title: 'Notifications', to: ROUTES.notifications, icon: Bell, keywords: 'broadcast push' },
  { title: 'Moderation', to: ROUTES.moderation, icon: ShieldAlert, keywords: 'reports ugc' },
  { title: 'Audit log', to: ROUTES.auditLogs, icon: ScrollText, keywords: 'history' },
  { title: 'Settings', to: ROUTES.settings, icon: Settings, keywords: 'theme profile' },
] as const;

/**
 * Global Cmd/Ctrl+K navigation palette with header trigger.
 */
export function AdminCommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground hidden h-9 w-52 items-center justify-between gap-2 rounded-md border border-border/70 bg-muted/35 px-3 text-sm transition-colors hover:bg-muted/55 md:flex"
        aria-label="Open command palette"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Search className="size-4 shrink-0 opacity-60" />
          <span className="truncate">Jump to page…</span>
        </span>
        <kbd className="bg-background text-muted-foreground hidden shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium lg:inline-block">
          ⌘K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Jump to"
        description="Navigate to an admin page"
      >
        <CommandInput placeholder="Search pages…" />
        <CommandList>
          <CommandEmpty>No matching page.</CommandEmpty>
          <CommandGroup heading="Navigate">
            {NAV_COMMANDS.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.to}
                  value={`${item.title} ${item.keywords}`}
                  onSelect={() => {
                    setOpen(false);
                    navigate(item.to);
                  }}
                >
                  <Icon className="size-4" />
                  <span>{item.title}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
        <div className="text-muted-foreground flex items-center justify-between border-t px-3 py-2 text-xs">
          <span>Navigate with ↑↓ · Enter to open</span>
          <CommandShortcut>Esc</CommandShortcut>
        </div>
      </CommandDialog>
    </>
  );
}
