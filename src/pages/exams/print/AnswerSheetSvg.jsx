import { FOOTER, HEADER_BOX, QR_BOX, SHEET } from './sheetLayout';
import { fit } from './printHelpers';

const FONT = 'Arial, Helvetica, sans-serif';

/**
 * The answer sheet, drawn as one SVG. One SVG unit is one millimetre.
 * Every position comes from layout (sheetLayout.js); nothing is placed by hand here.
 * qr: { d } from qrShapes.qrPath, drawn in sheet coordinates.
 */
export default function AnswerSheetSvg({ layout, qr, title, setLabel, classLabel, dateText }) {
  const { markers, bubbles, numbers, letterHeads } = layout;
  const hx = HEADER_BOX.x;
  const hy = HEADER_BOX.y;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${SHEET.width} ${SHEET.height}`}
      width={`${SHEET.width}mm`}
      height={`${SHEET.height}mm`}
      style={{ display: 'block', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
      role="img"
      aria-label={`Answer sheet, Set ${setLabel}`}
    >
      <rect x="0" y="0" width={SHEET.width} height={SHEET.height} fill="#fff" />

      {markers.map((m) => (
        <rect key={m.id} x={m.x} y={m.y} width={m.size} height={m.size} fill="#000" />
      ))}

      <rect x={QR_BOX.x} y={QR_BOX.y} width={QR_BOX.size} height={QR_BOX.size} fill="#fff" />
      <path d={qr.d} fill="#000" shapeRendering="crispEdges" />

      <g fontFamily={FONT} fill="#000">
        <text x={hx} y={hy + 5.5} fontSize="4.2" fontWeight="bold">{fit(title, 48)}</text>
        <text x={hx} y={hy + 11.5} fontSize="3.2">{fit(`Set ${setLabel} - ${classLabel} - ${dateText}`, 70)}</text>
        <text x={hx} y={hy + 18} fontSize="3">Shade one circle for each number.</text>
        <text x={hx} y={hy + 22} fontSize="3">Use a dark pen or pencil and fill the circle completely.</text>
        <text x={hx} y={hy + 26} fontSize="3">If you change an answer, erase it cleanly.</text>
        <text x={hx} y={hy + 30} fontSize="3">Do not fold the sheet or write outside the circles.</text>

        {letterHeads.map((h) => (
          <text key={`${h.col}-${h.letter}`} x={h.x} y={h.y} fontSize="3.6" fontWeight="bold" textAnchor="middle" dy="0.35em">
            {h.letter}
          </text>
        ))}

        {numbers.map((n) => (
          <text key={n.item} x={n.x} y={n.y} fontSize="3.8" textAnchor="end" dy="0.35em">{n.item}</text>
        ))}
      </g>

      {bubbles.map((b) => (
        <circle key={`${b.item}-${b.choice}`} cx={b.cx} cy={b.cy} r={b.r} fill="#fff" stroke="#000" strokeWidth="0.35" />
      ))}

      <text x={FOOTER.x} y={FOOTER.y} fontSize="2.4" textAnchor="middle" fontFamily={FONT} fill="#555">
        {fit(`GuroAssist answer sheet v${layout.version}`, FOOTER.maxChars)}
      </text>
    </svg>
  );
}