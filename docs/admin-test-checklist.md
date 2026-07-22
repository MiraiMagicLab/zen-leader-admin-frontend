# Admin Frontend — Manual Test Checklist

Use after each deploy or major UI change. Auth: admin account only.

## Shell
- [ ] Login with admin succeeds; non-admin rejected
- [ ] ⌘K / Ctrl+K opens command palette and navigates
- [ ] Theme toggle in header user menu works (light/dark/system)
- [ ] Breadcrumb updates per route

## List pages
- [ ] Users: search, role/status filters, inspector, soft delete, ban/lock, bulk lock
- [ ] Programs / Courses / Course Runs: server pagination (course runs: filter by course), create/edit/delete Sheets, error retry
- [ ] Events: server filters, create, publish/unpublish (no misleading stat cards)
- [ ] Payments: status filter, retry enrollment, order inspector (no misleading stat cards)
- [ ] Moderation: resolve/dismiss, target deep-link for EVENT
- [ ] Audit log: filters, metadata inspector

## Detail / workspace
- [ ] Course detail: info, syllabus, runs sections (no reviews/checklist gamification)
- [ ] Course run detail: sessions, enrollment, progress inspector on enrollment row
- [ ] Event detail: edit, comments moderation
- [ ] `/syllabus-items/:id` redirects into course workspace

## Operations
- [ ] Dashboard: stats, chart, needs-attention panels
- [ ] Notifications: broadcast + per-user history
- [ ] Settings: theme, profile, API URL, ⌘K hint

## Cross-cutting
- [ ] Failed list query shows AdminQueryError + Retry
- [ ] Empty tables show empty state copy
- [ ] Destructive actions use ConfirmDialog / AlertDialog
- [ ] Reduced motion preference does not break layout
