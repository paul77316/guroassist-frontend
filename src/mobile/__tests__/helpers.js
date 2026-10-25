import { IDBFactory } from 'fake-indexeddb';
import mobileApi from '../lib/mobileApi';
import { openAccountDb } from '../lib/db';

export const CLASS_ID = 10;
export const DATE = '2030-03-10';

/** In-memory stand-in for the Laravel mobile endpoints: idempotent receipts, versions, conflicts. */
export class FakeServer {
  constructor() {
    this.att = new Map();      // `${student}` -> { status, version }
    this.receipts = new Map(); // operation_id -> stored result
    this.mode = 'ok';          // ok | down | timeout | 401 | 403 | 422
    this.syncCalls = [];
    this.parked = new Map();   // operation_id -> { op, server }
    this.beforeRespond = null; // hook run while a sync request is "in the network"
  }

  roster() {
    return [1, 2, 3].map((id) => ({
      student_id: id,
      full_name: `Student ${id}`,
      status: this.att.get(id)?.status ?? null,
      remarks: null,
      version: this.att.get(id)?.version ?? 0,
    }));
  }

  fail() {
    if (this.mode === 'down') throw { status: null, message: 'No connection to the server.' };
    if (this.mode === '401') throw { status: 401, message: 'Unauthenticated.' };
    if (this.mode === '403') throw { status: 403, code: 'device_revoked', message: 'Device removed.' };
  }

  async get(url) {
    this.fail();
    if (url === '/attendance') return { data: { data: { class_assignment_id: CLASS_ID, date: DATE, students: this.roster() } } };
    if (url.endsWith('/seating-layout')) return { data: { data: { version: 1, rows: 2, cols: 2, cells: [1, 2, 3, null], students: [] } } };
    if (url === '/attendance/sync/readiness') return { data: { data: { unresolved_conflicts: this.parked.size, server_ready: this.parked.size === 0 } } };
    if (url === '/classes') return { data: { data: [{ id: CLASS_ID, grade_level: 'Grade 8', section: 'Mabini', subject: 'Math', status: 'active' }] } };
    throw { status: 404, message: 'Not found' };
  }

  async post(url, body) {
    if (url === '/attendance/sync') return this.sync(body);
    const match = url.match(/^\/attendance\/sync\/(.+)\/resolve$/);
    if (match) return this.resolve(match[1], body.resolution);
    throw { status: 404, message: 'Not found' };
  }

  async sync(body) {
    this.syncCalls.push(body.operations);
    if (this.mode === '422') throw { status: 422, message: 'Invalid.' };
    this.fail();
    if (this.beforeRespond) await this.beforeRespond();

    const results = body.operations.map((op) => this.applyOne(op));
    if (this.mode === 'timeout') throw { status: null, message: 'timeout' }; // committed, answer lost

    return { data: { data: results } };
  }

  applyOne(op) {
    const out = (outcome, extra = {}) => ({ operation_id: op.operation_id, outcome, replayed: false, version: null, reason: null, server: null, ...extra });

    if (this.receipts.has(op.operation_id)) return { ...this.receipts.get(op.operation_id), replayed: true };
    if (op.student_id === 999) return out('rejected', { reason: 'not_enrolled' });

    const current = this.att.get(op.student_id) ?? { status: null, version: 0 };
    if (current.version !== op.base_version) {
      const server = { status: current.status, remarks: null, version: current.version };
      this.parked.set(op.operation_id, { op, server });
      const result = out('conflict', { version: current.version, reason: 'stale_version', server });
      this.receipts.set(op.operation_id, result);
      return result;
    }

    const next = { status: op.status, version: current.version + 1 };
    this.att.set(op.student_id, next);
    const result = out('applied', { version: next.version });
    this.receipts.set(op.operation_id, result);
    return result;
  }

  async resolve(opId, resolution) {
    this.fail();
    const parked = this.parked.get(opId);
    if (!parked) throw { status: 422, message: 'Nothing to resolve.' };
    this.parked.delete(opId);

    if (resolution === 'keep_local') {
      const next = { status: parked.op.status, version: parked.server.version + 1 };
      this.att.set(parked.op.student_id, next);
      return { data: { data: { operation_id: opId, outcome: 'applied', version: next.version, server: next } } };
    }

    return { data: { data: { operation_id: opId, outcome: 'discarded', version: parked.server.version, server: parked.server } } };
  }
}

let counter = 0;

/** Fresh device storage and a fresh fake server for each test. */
export async function freshDevice() {
  globalThis.indexedDB = new IDBFactory();
  counter += 1;
  await openAccountDb(counter);

  const server = new FakeServer();
  mobileApi.get.mockReset();
  mobileApi.post.mockReset();
  mobileApi.get.mockImplementation((url, cfg) => server.get(url, cfg));
  mobileApi.post.mockImplementation((url, body) => server.post(url, body));

  return { server, userId: counter };
}
