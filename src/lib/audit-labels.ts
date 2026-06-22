export const AUDIT_ACTION_OPTIONS = [
  { value: 'program.create', label: 'Tạo chương trình' },
  { value: 'program.update', label: 'Cập nhật chương trình' },
  { value: 'program.delete', label: 'Xóa chương trình' },
  { value: 'course.create', label: 'Tạo khóa học' },
  { value: 'course.update', label: 'Cập nhật khóa học' },
  { value: 'course.delete', label: 'Xóa khóa học' },
  { value: 'syllabus_section.create', label: 'Tạo chương giáo trình' },
  { value: 'syllabus_section.update', label: 'Cập nhật chương giáo trình' },
  { value: 'syllabus_section.delete', label: 'Xóa chương giáo trình' },
  { value: 'syllabus_item.create', label: 'Tạo bài học' },
  { value: 'syllabus_item.update', label: 'Cập nhật bài học' },
  { value: 'syllabus_item.delete', label: 'Xóa bài học' },
  { value: 'session.create', label: 'Tạo buổi học' },
  { value: 'session.update', label: 'Cập nhật buổi học' },
  { value: 'session.delete', label: 'Xóa buổi học' },
  { value: 'relationship.request', label: 'Gửi lời mời kết bạn' },
  { value: 'relationship.accept', label: 'Chấp nhận kết bạn' },
  { value: 'relationship.reject', label: 'Từ chối kết bạn' },
  { value: 'relationship.cancel', label: 'Huỷ lời mời kết bạn' },
  { value: 'relationship.unfriend', label: 'Huỷ kết bạn' },
] as const;

export const AUDIT_ENTITY_TYPE_OPTIONS = [
  { value: 'Program', label: 'Chương trình' },
  { value: 'Course', label: 'Khóa học' },
  { value: 'SyllabusSection', label: 'Chương giáo trình' },
  { value: 'SyllabusItem', label: 'Bài học' },
  { value: 'Session', label: 'Buổi học' },
  { value: 'Relationship', label: 'Quan hệ bạn bè' },
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
