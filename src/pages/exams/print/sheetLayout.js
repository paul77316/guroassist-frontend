// GuroAssist answer sheet layout, version 1.
// One source of truth for every position on the answer sheet.
// The print page draws from it now; the scanner (piece 4) will read the same numbers.
// All units are millimetres, measured from the top-left corner of the sheet box.
// Pure JavaScript, no imports, so it can be tested with plain Node.

export const LAYOUT_VERSION = 1;

export const MIN_ITEMS = 1;
export const MAX_ITEMS = 50;
export const MIN_CHOICES = 3;
export const MAX_CHOICES = 5;
export const LETTERS = ['A', 'B', 'C', 'D', 'E'];

// The sheet box. It is centred on the paper, so it fits A4 and letter ("short bond").
export const SHEET = { width: 190, height: 260 };

// Four solid black squares, one in each corner of the sheet box.
export const MARKER_SIZE = 10;
export const MARKERS = [
  { id: 'tl', x: 0, y: 0, size: MARKER_SIZE },
  { id: 'tr', x: SHEET.width - MARKER_SIZE, y: 0, size: MARKER_SIZE },
  { id: 'bl', x: 0, y: SHEET.height - MARKER_SIZE, size: MARKER_SIZE },
  { id: 'br', x: SHEET.width - MARKER_SIZE, y: SHEET.height - MARKER_SIZE, size: MARKER_SIZE },
];

// Distance between the same edge of two neighbouring markers (what you measure with a ruler).
export const MARKER_SPACING = {
  horizontal: SHEET.width - MARKER_SIZE, // 180 mm, left edge to left edge
  vertical: SHEET.height - MARKER_SIZE,  // 250 mm, top edge to top edge
};

// QR box, quiet zone included. It holds the set token only.
export const QR_BOX = { x: 146, y: 12, size: 34 };

// Small print area, left of the QR box (exam title, set label, date, instructions).
export const HEADER_BOX = { x: 12, y: 12, width: 130, height: 34 };

// Small version line at the bottom, between the two lower markers.
export const FOOTER = { x: 95, y: 254.5, maxChars: 40 };

// Bubble grid. Items run down a column, then continue in the next column.
export const GRID = {
  columns: 4,
  rowsPerColumn: 13,
  columnWidth: 42,
  originX: 11,          // left edge of column 1
  numberRight: 8.5,     // right edge of the item number, from the column's left edge
  firstBubbleX: 12,     // centre of the first bubble, from the column's left edge
  bubblePitch: 6.5,     // distance between bubble centres in a row
  bubbleDiameter: 5,
  letterRowY: 56,       // centre line of the A B C row above each column
  firstRowY: 62,        // centre line of row 1
  rowPitch: 14.5,
};

function checkArgs(itemCount, choiceCount) {
  if (!Number.isInteger(itemCount) || itemCount < MIN_ITEMS || itemCount > MAX_ITEMS) {
    throw new RangeError(`itemCount must be a whole number from ${MIN_ITEMS} to ${MAX_ITEMS}`);
  }
  if (!Number.isInteger(choiceCount) || choiceCount < MIN_CHOICES || choiceCount > MAX_CHOICES) {
    throw new RangeError(`choiceCount must be ${MIN_CHOICES}, 4 or ${MAX_CHOICES}`);
  }
}

// item is 1-based, choiceIndex is 0-based (0 = A).
export function bubbleCenter(item, choiceIndex) {
  const col = Math.floor((item - 1) / GRID.rowsPerColumn);
  const row = (item - 1) % GRID.rowsPerColumn;
  const left = GRID.originX + col * GRID.columnWidth;
  return {
    cx: left + GRID.firstBubbleX + choiceIndex * GRID.bubblePitch,
    cy: GRID.firstRowY + row * GRID.rowPitch,
  };
}

export function layoutFor(itemCount, choiceCount) {
  checkArgs(itemCount, choiceCount);
  const r = GRID.bubbleDiameter / 2;
  const bubbles = [];
  const numbers = [];
  for (let item = 1; item <= itemCount; item += 1) {
    const col = Math.floor((item - 1) / GRID.rowsPerColumn);
    const row = (item - 1) % GRID.rowsPerColumn;
    numbers.push({
      item,
      x: GRID.originX + col * GRID.columnWidth + GRID.numberRight,
      y: GRID.firstRowY + row * GRID.rowPitch,
    });
    for (let c = 0; c < choiceCount; c += 1) {
      const { cx, cy } = bubbleCenter(item, c);
      bubbles.push({ item, choice: c, letter: LETTERS[c], cx, cy, r });
    }
  }
  const usedColumns = Math.ceil(itemCount / GRID.rowsPerColumn);
  const letterHeads = [];
  for (let col = 0; col < usedColumns; col += 1) {
    for (let c = 0; c < choiceCount; c += 1) {
      letterHeads.push({
        col,
        letter: LETTERS[c],
        x: GRID.originX + col * GRID.columnWidth + GRID.firstBubbleX + c * GRID.bubblePitch,
        y: GRID.letterRowY,
      });
    }
  }
  return {
    version: LAYOUT_VERSION,
    sheet: SHEET,
    markers: MARKERS,
    qr: QR_BOX,
    header: HEADER_BOX,
    itemCount,
    choiceCount,
    bubbles,
    numbers,
    letterHeads,
  };
}