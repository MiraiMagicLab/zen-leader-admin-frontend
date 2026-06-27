import type { ReactNode } from 'react';

import type { CompletionAnchor } from '@/features/courses/lib/course-completion';

type WorkspaceSectionProps = {
  id: CompletionAnchor;
  icon: ReactNode;
  title: string;
  action?: ReactNode;
  children: ReactNode;
};

export function WorkspaceSection({ id, icon, title, action, children }: WorkspaceSectionProps) {
  return (
    <section id={`section-${id}`} className="bg-card scroll-mt-20 rounded-xl border p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <span className="text-muted-foreground">{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
