import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';

export type QuickLinkItem = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

type QuickLinksProps = {
  items: QuickLinkItem[];
  className?: string;
};

export function QuickLinks({ items, className }: QuickLinksProps) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            to={item.href}
            className="group flex items-start gap-3 rounded-xl border bg-card p-4 no-underline shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
          >
            <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
              <Icon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-none">{item.title}</p>
              <p className="text-muted-foreground mt-1.5 text-sm leading-snug">
                {item.description}
              </p>
            </div>
            <ArrowRight className="text-muted-foreground mt-0.5 size-4 shrink-0 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
          </Link>
        );
      })}
    </div>
  );
}
