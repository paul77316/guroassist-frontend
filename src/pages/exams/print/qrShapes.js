// Turns a QR token into one SVG path inside the sheet's QR box.
// Only the module matrix of the "qrcode" package is used; drawing is done here,
// so printing does not depend on a canvas. Units are millimetres (sheet coordinates).
import QRCode from 'qrcode';

export const QUIET_MODULES = 4;      // blank border, in modules, as the QR standard asks
export const MIN_MODULE_MM = 0.6;    // smaller than this is hard to scan from a phone

const f = (n) => Number(n.toFixed(4));

// box: { x, y, size } in mm, quiet zone included.
export function qrPath(token, box) {
  const qr = QRCode.create(String(token), { errorCorrectionLevel: 'M' });
  const n = qr.modules.size;
  const module = box.size / (n + 2 * QUIET_MODULES);
  let d = '';
  for (let r = 0; r < n; r += 1) {
    let c = 0;
    while (c < n) {
      if (!qr.modules.get(r, c)) { c += 1; continue; }
      let end = c;
      while (end + 1 < n && qr.modules.get(r, end + 1)) end += 1;
      const x = box.x + (c + QUIET_MODULES) * module;
      const y = box.y + (r + QUIET_MODULES) * module;
      d += `M${f(x)} ${f(y)}h${f((end - c + 1) * module)}v${f(module)}h${f(-(end - c + 1) * module)}z`;
      c = end + 1;
    }
  }
  return { d, moduleSize: module, modules: n, tooSmall: module < MIN_MODULE_MM };
}