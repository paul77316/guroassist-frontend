import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMarkAttendanceSyncRead, useNotificationSummary } from '../../hooks/useNotifications';
import NotificationBell from './NotificationBell';

vi.mock('../../hooks/useNotifications', () => ({ useNotificationSummary: vi.fn(), useMarkAttendanceSyncRead: vi.fn() }));

describe('NotificationBell', () => {
  const markRead = vi.fn();

  beforeEach(() => {
    cleanup();
    markRead.mockReset();
    vi.mocked(useMarkAttendanceSyncRead).mockReturnValue({ mutate: markRead, isPending: false });
    vi.mocked(useNotificationSummary).mockReturnValue({
      data: {
        enabled: true,
        badge_count: 2,
        follow_ups_due: { total: 0, interventions: 0, parent_contacts: 0, overdue: 0 },
        students_to_review: null,
        mobile_attendance_synced: 2,
        mobile_attendance_syncs: [
          { class_assignment_id: 14, class: 'Grade 8 - Mabini (Mathematics)', attendance_date: '2030-03-10', marks_count: 2 },
        ],
      },
    });
  });

  it('shows attendance syncs grouped by class and attendance date', () => {
    render(<MemoryRouter><NotificationBell /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Reminders, 2 to look at' }));

    expect(screen.getByText('Attendance synced for Grade 8 - Mabini (Mathematics)')).toBeInTheDocument();
    expect(screen.getByText('Mar 10, 2030 · 2 marks')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Attendance' })).toHaveAttribute('href', '/attendance');
  });

  it('marks a class and attendance date sync group as read', () => {
    render(<MemoryRouter><NotificationBell /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Reminders, 2 to look at' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mark as read' }));

    expect(markRead).toHaveBeenCalledWith(
      { class_assignment_id: 14, attendance_date: '2030-03-10' },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });
});
