import { humanizeEnumValue } from '@/lib/humanize';

export const AUDIT_ACTION_OPTIONS = [
  { value: 'program.create', label: 'Program created' },
  { value: 'program.update', label: 'Program updated' },
  { value: 'program.delete', label: 'Program deleted' },
  { value: 'course.create', label: 'Course created' },
  { value: 'course.update', label: 'Course updated' },
  { value: 'course.delete', label: 'Course deleted' },
  { value: 'course.publish', label: 'Course published' },
  { value: 'course.unpublish', label: 'Course unpublished' },
  { value: 'syllabus_section.create', label: 'Syllabus section created' },
  { value: 'syllabus_section.update', label: 'Syllabus section updated' },
  { value: 'syllabus_section.delete', label: 'Syllabus section deleted' },
  { value: 'syllabus_item.create', label: 'Lesson created' },
  { value: 'syllabus_item.update', label: 'Lesson updated' },
  { value: 'syllabus_item.delete', label: 'Lesson deleted' },
  { value: 'session.create', label: 'Session created' },
  { value: 'session.update', label: 'Session updated' },
  { value: 'session.delete', label: 'Session deleted' },
  { value: 'course_run.create', label: 'Course run created' },
  { value: 'course_run.update', label: 'Course run updated' },
  { value: 'course_run.delete', label: 'Course run deleted' },
  { value: 'event.create', label: 'Event created' },
  { value: 'event.update', label: 'Event updated' },
  { value: 'event.delete', label: 'Event deleted' },
  { value: 'event.publish', label: 'Event published' },
  { value: 'event.unpublish', label: 'Event unpublished' },
  { value: 'enrollment.create', label: 'Enrollment created' },
  { value: 'enrollment.update', label: 'Enrollment updated' },
  { value: 'enrollment.delete', label: 'Enrollment deleted' },
  { value: 'payment.create', label: 'Payment created' },
  { value: 'payment.update', label: 'Payment updated' },
  { value: 'user.create', label: 'User created' },
  { value: 'user.update', label: 'User updated' },
  { value: 'user.delete', label: 'User deleted' },
  { value: 'user.ban', label: 'User banned' },
  { value: 'user.unban', label: 'User unbanned' },
  { value: 'relationship.request', label: 'Friend request sent' },
  { value: 'relationship.accept', label: 'Friend request accepted' },
  { value: 'relationship.reject', label: 'Friend request rejected' },
  { value: 'relationship.cancel', label: 'Friend request cancelled' },
  { value: 'relationship.unfriend', label: 'Unfriended' },
  { value: 'notification.send', label: 'Notification sent' },
  { value: 'report.create', label: 'Report created' },
  { value: 'report.update', label: 'Report updated' },
] as const;

export const AUDIT_ENTITY_TYPE_OPTIONS = [
  { value: 'Program', label: 'Program' },
  { value: 'Course', label: 'Course' },
  { value: 'SyllabusSection', label: 'Syllabus Section' },
  { value: 'SyllabusItem', label: 'Lesson' },
  { value: 'Session', label: 'Session' },
  { value: 'CourseRun', label: 'Course Run' },
  { value: 'Event', label: 'Event' },
  { value: 'Comment', label: 'Comment' },
  { value: 'Enrollment', label: 'Enrollment' },
  { value: 'PaymentOrder', label: 'Payment Order' },
  { value: 'User', label: 'User' },
  { value: 'Notification', label: 'Notification' },
  { value: 'Report', label: 'Report' },
  { value: 'Relationship', label: 'Relationship' },
] as const;

const actionLabelMap = Object.fromEntries(
  AUDIT_ACTION_OPTIONS.map((option) => [option.value, option.label]),
);

const entityTypeLabelMap = Object.fromEntries(
  AUDIT_ENTITY_TYPE_OPTIONS.map((option) => [option.value, option.label]),
);

/** Human-readable label for an audit action enum. Falls back to humanized raw value. */
export function auditActionLabel(action: string | null | undefined): string {
  if (!action?.trim()) return '—';
  return actionLabelMap[action] ?? humanizeEnumValue(action);
}

/** Human-readable label for an audit entity type enum. Falls back to humanized raw value. */
export function auditEntityTypeLabel(entityType: string | null | undefined): string {
  if (!entityType?.trim()) return '—';
  return entityTypeLabelMap[entityType] ?? humanizeEnumValue(entityType);
}

/** Human-readable label for an audit actor type (SYSTEM, USER, etc.). */
export function auditActorTypeLabel(actorType: string | null | undefined): string {
  if (!actorType?.trim()) return '—';
  const map: Record<string, string> = {
    SYSTEM: 'System',
    USER: 'User',
    ADMIN: 'Admin',
    SCHEDULER: 'Scheduler',
  };
  return map[actorType.toUpperCase()] ?? humanizeEnumValue(actorType);
}
