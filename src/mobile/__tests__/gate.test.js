import { describe, expect, it } from 'vitest';
import { evaluateGate, isValidOperationRow, checkGate, STORAGE_BLOCK } from '../lib/gate';
import { closeAccountDb } from '../lib/db';

const row = (over = {}) => ({
  opId: 'op-1', seq: 1, key: '10|2030-03-10|1', classId: 10, studentId: 1, date: '2030-03-10',
  status: 'absent', baseVersion: 0, state: 'pending', ...over,
});

describe('new-session gate matrix', () => {
  it('opens only when the queue is empty', () => {
    expect(evaluateGate([])).toMatchObject({ ok: true, reason: null });
  });

  it.each([
    ['pending', 'pending'],
    ['inflight', 'inflight'],
    ['conflict', 'conflict'],
    ['rejected', 'rejected'],
  ])('blocks while a %s operation exists', (state, reason) => {
    const gate = evaluateGate([row({ state })]);
    expect(gate.ok).toBe(false);
    expect(gate.reason).toBe(reason);
    expect(gate.message.length).toBeGreaterThan(0);
  });

  it('blocks on one unconfirmed operation among many', () => {
    expect(evaluateGate([row(), row({ opId: 'b', seq: 2, state: 'inflight' })]).ok).toBe(false);
  });

  it('reports the most serious state first', () => {
    const gate = evaluateGate([row({ state: 'pending' }), row({ opId: 'b', seq: 2, state: 'conflict' })]);
    expect(gate.reason).toBe('conflict');
  });

  it.each([
    ['a missing id', { opId: undefined }],
    ['a bad status', { status: 'sleeping' }],
    ['a bad date', { date: 'yesterday' }],
    ['an unknown state', { state: 'done' }],
    ['a bad base version', { baseVersion: -3 }],
    ['a missing sequence', { seq: undefined }],
  ])('fails closed on a corrupt row with %s', (_label, over) => {
    expect(isValidOperationRow(row(over))).toBe(false);
    const gate = evaluateGate([row(over)]);
    expect(gate.ok).toBe(false);
    expect(gate.reason).toBe('storage_corrupt');
  });

  it('accepts a queued change that waits for a predecessor (null base)', () => {
    expect(isValidOperationRow(row({ baseVersion: null }))).toBe(true);
  });

  it('fails closed when local storage cannot be read', async () => {
    closeAccountDb();
    expect(await checkGate()).toEqual(STORAGE_BLOCK);
  });
});
