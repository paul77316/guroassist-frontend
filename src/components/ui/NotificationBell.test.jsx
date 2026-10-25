import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNotificationSummary } from '../../hooks/useNotifications';
import NotificationBell from './NotificationBell';

vi.mock('../../hooks/useNotifications', () => ({ useNotificationSummary: vi.fn() }));

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.mocked(useNotificationSummary).mockReturnValue({
      data: {
        enabled: true,
        badge_count: 2,
        follow_ups_due: { total: 0, interventions: 0, parent_contacts: 0, overdue: 0 },
        students_to_review: null,
        mobile_attendance_synced: 2,
      },
    });
  });

  it('shows the teacher the count of attendance marks synced from their mobile device', () => {
    render(<MemoryRouter><NotificationBell /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Reminders, 2 to look at' }));

    expect(screen.getByText('2 attendance marks synced from mobile today')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Attendance' })).toHaveAttribute('href', '/attendance');
  });
});
