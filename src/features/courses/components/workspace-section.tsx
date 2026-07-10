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
    <section id={`section-${id}`} className="scroll-mt-20 space-y-4 border-b pb-8 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <span className="text-muted-foreground">{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      <div className="mt-0">{children}</div>
    </section>
  );
}
