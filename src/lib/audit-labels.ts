export const AUDIT_ACTION_OPTIONS = [
  { value: 'program.create', label: 'Create program' },
  { value: 'program.update', label: 'Update program' },
  { value: 'program.delete', label: 'Delete program' },
  { value: 'course.create', label: 'Create course' },
  { value: 'course.update', label: 'Update course' },
  { value: 'course.delete', label: 'Delete course' },
  { value: 'syllabus_section.create', label: 'Create syllabus section' },
  { value: 'syllabus_section.update', label: 'Update syllabus section' },
  { value: 'syllabus_section.delete', label: 'Delete syllabus section' },
  { value: 'syllabus_item.create', label: 'Create lesson' },
  { value: 'syllabus_item.update', label: 'Update lesson' },
  { value: 'syllabus_item.delete', label: 'Delete lesson' },
  { value: 'session.create', label: 'Create session' },
  { value: 'session.update', label: 'Update session' },
  { value: 'session.delete', label: 'Delete session' },
  { value: 'relationship.request', label: 'Send friend request' },
  { value: 'relationship.accept', label: 'Accept friend request' },
  { value: 'relationship.reject', label: 'Reject friend request' },
  { value: 'relationship.cancel', label: 'Cancel friend request' },
  { value: 'relationship.unfriend', label: 'Unfriend' },
] as const;

export const AUDIT_ENTITY_TYPE_OPTIONS = [
  { value: 'Program', label: 'Program' },
  { value: 'Course', label: 'Course' },
  { value: 'SyllabusSection', label: 'Syllabus Section' },
  { value: 'SyllabusItem', label: 'Lesson' },
  { value: 'Session', label: 'Session' },
  { value: 'Relationship', label: 'Relationship' },
] as const;

const actionLabelMap = Object.fromEntries(
  AUDIT_ACTION_OPTIONS.map((option) => [option.value, option.label]),
);

const entityTypeLabelMap = Object.fromEntries(
  AUDIT_ENTITY_TYPE_OPTIONS.map((option) => [option.value, option.label]),
);

export function auditActionLabel(action: string | null | undefined): string {
  if (!action?.trim()) {
    return '—';
  }
  return actionLabelMap[action] ?? action;
}

export function auditEntityTypeLabel(entityType: string | null | undefined): string {
  if (!entityType?.trim()) {
    return '—';
  }
  return entityTypeLabelMap[entityType] ?? entityType;
}
