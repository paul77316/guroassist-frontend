import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import { useAttendance } from './useAttendance';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(),
}));

describe('useAttendance', () => {
  beforeEach(() => vi.clearAllMocks());

  it('polls only when the caller enables polling and only while visible', () => {
    useAttendance(12, '2030-03-10', { poll: true });

    expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({
      queryKey: ['attendance', 12, '2030-03-10'],
      enabled: true,
      refetchInterval: 30_000,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    }));

    useAttendance(12, '2030-03-10');
    expect(useQuery).toHaveBeenLastCalledWith(expect.objectContaining({ refetchInterval: false }));
  });
});
