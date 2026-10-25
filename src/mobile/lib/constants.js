export const STATUSES = ['present', 'absent', 'late', 'excused'];

export const STATUS_META = {
  present: { label: 'Present', letter: 'P' },
  absent: { label: 'Absent', letter: 'A' },
  late: { label: 'Late', letter: 'L' },
  excused: { label: 'Excused', letter: 'E' },
};

/** Lifecycle of a queued operation. It leaves the queue only when the server confirms it. */
export const OP_STATES = ['pending', 'inflight', 'conflict', 'rejected'];

export const SYNC_LOCK_NAME = 'guroassist-mobile-sync';

export class StorageError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'StorageError';
    this.cause = cause;
  }
}

export class SessionChangedError extends Error {
  constructor() {
    super('Another tab opened a different attendance session.');
    this.name = 'SessionChangedError';
  }
}

export class StudentBlockedError extends Error {
  constructor(state) {
    super(
      state === 'conflict'
        ? 'This student has a conflict. Resolve it before changing the mark.'
        : 'This student’s last change was rejected by the server. Review it before changing the mark.',
    );
    this.name = 'StudentBlockedError';
  }
}
