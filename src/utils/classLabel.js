export function classLabel(cls) {
  const name = cls?.label || [cls?.grade_level, cls?.section].filter(Boolean).join(' - ');
  const subject = cls?.subject;

  if (!name) return subject || 'Class';
  return subject ? `${name} (${subject})` : name;
}
