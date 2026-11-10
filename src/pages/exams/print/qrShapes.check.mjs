// Run from the frontend folder (after npm install qrcode):
//   node src/pages/exams/print/qrShapes.check.mjs
import assert from 'node:assert/strict';
import { qrPath, MIN_MODULE_MM } from './qrShapes.js';
import { QR_BOX } from './sheetLayout.js';

for (const len of [32, 40, 64]) {
  const token = 'aB3'.repeat(Math.ceil(len / 3)).slice(0, len);
  const { d, moduleSize, modules } = qrPath(token, QR_BOX);
  assert.ok(d.startsWith('M'), `path for ${len} chars`);
  assert.ok(moduleSize >= MIN_MODULE_MM, `module size for ${len} chars is ${moduleSize.toFixed(2)} mm`);
  const nums = d.match(/M([\d.]+) ([\d.]+)/g).map((m) => m.slice(1).split(' ').map(Number));
  for (const [x, y] of nums) {
    assert.ok(x >= QR_BOX.x && x <= QR_BOX.x + QR_BOX.size && y >= QR_BOX.y && y <= QR_BOX.y + QR_BOX.size, 'inside box');
  }
  console.log(`${len} chars: ${modules} modules, ${moduleSize.toFixed(2)} mm per module`);
}
console.log('qrShapes: all checks passed');
