import Badge from '../../components/ui/Badge';

export const SETUP = {
  'academic-years': {
    title: 'Academic Years',
    singular: 'academic year',
    addLabel: 'Add Academic Year',
    description: 'School years that sections, classes and terms belong to. Only one year can be active.',
    fields: [
      { name: 'name', label: 'Name', placeholder: 'e.g. 2027-2028', required: true },
      { name: 'start_date', label: 'Start date', type: 'date', required: true },
      { name: 'end_date', label: 'End date', type: 'date', required: true },
      { name: 'is_active', label: 'Set as the active academic year', type: 'checkbox',
        hint: 'Other years are switched off automatically.' },
    ],
    columns: [
      { header: 'Name', cell: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
      { header: 'Dates', cell: (r) => `${r.start_date} → ${r.end_date}` },
      { header: 'Status', cell: (r) => (r.is_active ? <Badge kind="active">Active</Badge> : <span className="text-gray-400">—</span>) },
    ],
  },
  'grade-levels': {
    title: 'Grade Levels',
    singular: 'grade level',
    addLabel: 'Add Grade Level',
    description: 'Grade levels shown in class and student forms, sorted by their order number.',
    fields: [
      { name: 'name', label: 'Name', placeholder: 'e.g. Grade 7', required: true },
      { name: 'order', label: 'Order', type: 'number', required: true, hint: 'The grade number (7, 8, 9, 10) controls sorting.' },
    ],
    columns: [
      { header: 'Order', cell: (r) => r.order },
      { header: 'Name', cell: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
    ],
  },
  subjects: {
    title: 'Subjects',
    singular: 'subject',
    addLabel: 'Add Subject',
    description: 'Subjects teachers can assign to their classes.',
    fields: [
      { name: 'name', label: 'Name', placeholder: 'e.g. Science', required: true },
      { name: 'code', label: 'Code', placeholder: 'e.g. SCI', required: true, hint: 'Short and unique. Letters, numbers, dashes.' },
    ],
    columns: [
      { header: 'Code', cell: (r) => r.code },
      { header: 'Name', cell: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
    ],
  },
};