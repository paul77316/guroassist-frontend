// Run from the frontend folder:  node src/pages/exams/print/sheetLayout.check.mjs
import assert from 'node:assert/strict';
import {
  layoutFor, bubbleCenter, SHEET, MARKERS, QR_BOX, HEADER_BOX, GRID,
  MARKER_SPACING, MAX_ITEMS, FOOTER,
} from './sheetLayout.js';

let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks += 1; };

const rectsOverlap = (a, b) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const bubbleRect = (b, pad = 0) => ({ x: b.cx - b.r - pad, y: b.cy - b.r - pad, w: 2 * (b.r + pad), h: 2 * (b.r + pad) });
const toRect = (o) => ({ x: o.x, y: o.y, w: o.size ?? o.width, h: o.size ?? o.height });

// Fixed sheet geometry.
ok(MARKER_SPACING.horizontal === 180 && MARKER_SPACING.vertical === 250, 'marker spacing');
ok(MARKERS.length === 4, 'four markers');
for (const a of MARKERS) for (const b of MARKERS) {
  if (a !== b) ok(!rectsOverlap(toRect(a), toRect(b)), 'markers do not overlap');
}
ok(!rectsOverlap(toRect(QR_BOX), toRect(HEADER_BOX)), 'QR and header do not overlap');
for (const m of MARKERS) {
  ok(!rectsOverlap(toRect(m), toRect(QR_BOX)), 'QR clear of markers');
  ok(!rectsOverlap(toRect(m), toRect(HEADER_BOX)), 'header clear of markers');
}

for (const choices of [3, 4, 5]) {
  for (const items of [1, 12, 13, 14, 26, 27, 39, 40, 49, 50]) {
    const L = layoutFor(items, choices);
    const tag = `${items} items x ${choices} choices`;

    ok(L.bubbles.length === items * choices, `bubble count, ${tag}`);
    ok(L.numbers.length === items, `number count, ${tag}`);

    for (const b of L.bubbles) {
      ok(b.cx - b.r >= 0 && b.cx + b.r <= SHEET.width, `inside width, ${tag}`);
      ok(b.cy - b.r >= 0 && b.cy + b.r <= SHEET.height, `inside height, ${tag}`);
      for (const m of MARKERS) ok(!rectsOverlap(bubbleRect(b, 2), toRect(m)), `clear of marker (2 mm), ${tag}`);
      ok(!rectsOverlap(bubbleRect(b), toRect(QR_BOX)), `clear of QR, ${tag}`);
      ok(!rectsOverlap(bubbleRect(b), toRect(HEADER_BOX)), `clear of header, ${tag}`);
    }

    // No two bubbles closer than 1.2 mm edge to edge.
    for (let i = 0; i < L.bubbles.length; i += 1) {
      for (let j = i + 1; j < L.bubbles.length; j += 1) {
        const a = L.bubbles[i]; const c = L.bubbles[j];
        const d = Math.hypot(a.cx - c.cx, a.cy - c.cy);
        ok(d >= a.r + c.r + 1.2, `bubble gap, ${tag}`);
      }
    }

    // Letter row sits above the first row and clear of the QR box.
    for (const h of L.letterHeads) {
      ok(h.y + 2 < GRID.firstRowY - GRID.bubbleDiameter / 2, `letters above bubbles, ${tag}`);
      ok(!rectsOverlap({ x: h.x - 2, y: h.y - 2, w: 4, h: 4 }, toRect(QR_BOX)), `letters clear of QR, ${tag}`);
    }
    ok(L.letterHeads.length === Math.ceil(items / GRID.rowsPerColumn) * choices, `letter heads, ${tag}`);
  }
}

// The footer line sits below the last bubble row and between the lower markers.
ok(FOOTER.y - 3 > bubbleCenter(13, 0).cy + GRID.bubbleDiameter / 2, 'footer below grid');
ok(FOOTER.x - 25 > MARKERS[2].x + MARKERS[2].size && FOOTER.x + 25 < MARKERS[3].x, 'footer between markers');

// Order: items run down a column, then continue in the next column.
ok(bubbleCenter(1, 0).cy === GRID.firstRowY, 'item 1 in first row');
ok(bubbleCenter(13, 0).cy > bubbleCenter(12, 0).cy, 'item 13 is below item 12');
ok(bubbleCenter(14, 0).cx > bubbleCenter(13, 0).cx, 'item 14 starts column 2');
ok(bubbleCenter(14, 0).cy === GRID.firstRowY, 'item 14 is in the first row');
ok(bubbleCenter(50, 4).cx + GRID.bubbleDiameter / 2 <= SHEET.width - 10, 'item 50 choice E inside right marker line');

// Number label of a column must clear the last bubble of the previous column.
const prevRight = bubbleCenter(1, 4).cx + GRID.bubbleDiameter / 2;
const nextNumberLeft = GRID.originX + GRID.columnWidth + GRID.numberRight - 5; // about 5 mm wide for two digits
ok(nextNumberLeft - prevRight >= 1, 'number label clear of previous column');

// Bad input is refused.
for (const [i, c] of [[0, 4], [51, 4], [10, 2], [10, 6], [1.5, 4], ['10', 4]]) {
  assert.throws(() => layoutFor(i, c), RangeError);
  checks += 1;
}
ok(MAX_ITEMS === 50, 'max items');

console.log(`sheetLayout: all ${checks} checks passed`);
