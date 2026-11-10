import { layoutFor, QR_BOX, SHEET } from '../../pages/exams/print/sheetLayout.js';
import { classifyDarkness } from '../screens/scannerCore.js';

let cvPromise;

async function openCv() {
  if (!cvPromise) {
    cvPromise = import('@techstark/opencv-js').then(async (module) => {
      let cv = module.default ?? module;
      if (cv && typeof cv.then === 'function') cv = await cv;
      if (!cv?.Mat) throw new Error('OpenCV did not finish loading.');
      return cv;
    }).catch((error) => {
      cvPromise = null;
      throw error;
    });
  }
  return cvPromise;
}

function imageMat(cv, file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      if (image.width < 900 || image.height < 1200) {
        reject(new Error('Use a clear photo with the full answer sheet in frame.'));
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      canvas.getContext('2d', { willReadFrequently: true }).drawImage(image, 0, 0);
      try {
        resolve(cv.imread(canvas));
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('The image could not be opened.'));
    };
    image.src = url;
  });
}

function qrText(cv, source) {
  const detector = new cv.QRCodeDetector();
  try {
    const result = detector.detectAndDecode(source);
    return typeof result === 'string' ? result : result?.decodedText ?? '';
  } finally {
    detector.delete();
  }
}

function markerCenters(cv, source) {
  const gray = new cv.Mat();
  const binary = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  const candidates = [];
  try {
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY);
    cv.threshold(gray, binary, 75, 255, cv.THRESH_BINARY_INV);
    cv.findContours(binary, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    const imageArea = source.rows * source.cols;
    for (let i = 0; i < contours.size(); i += 1) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);
      if (area < imageArea * 0.00015 || area > imageArea * 0.025) { contour.delete(); continue; }
      const perimeter = cv.arcLength(contour, true);
      const polygon = new cv.Mat();
      cv.approxPolyDP(contour, polygon, perimeter * 0.045, true);
      const rect = cv.boundingRect(contour);
      if (polygon.rows === 4 && rect.width > 8 && rect.height > 8 && rect.width / rect.height > 0.65 && rect.width / rect.height < 1.5) {
        const moment = cv.moments(contour);
        candidates.push({ x: moment.m10 / moment.m00, y: moment.m01 / moment.m00, area, width: rect.width, height: rect.height });
      }
      polygon.delete();
      contour.delete();
    }
  } finally {
    gray.delete(); binary.delete(); contours.delete(); hierarchy.delete();
  }
  if (candidates.length < 4) throw new Error('Could not find the four black corner markers. Keep the whole page visible and try again.');
  const w = source.cols;
  const h = source.rows;
  const pick = (test, score) => candidates.filter(test).sort((a, b) => score(a) - score(b))[0];
  const tl = pick((p) => p.x < w * 0.46 && p.y < h * 0.46, (p) => p.x + p.y);
  const tr = pick((p) => p.x > w * 0.54 && p.y < h * 0.46, (p) => (w - p.x) + p.y);
  const bl = pick((p) => p.x < w * 0.46 && p.y > h * 0.54, (p) => p.x + (h - p.y));
  const br = pick((p) => p.x > w * 0.54 && p.y > h * 0.54, (p) => (w - p.x) + (h - p.y));
  if ([tl, tr, bl, br].some((point) => !point)) throw new Error('Could not locate all four sheet corners. Retake the photo from above.');
  return [tl, tr, bl, br];
}

function rectify(cv, source, points) {
  const src = cv.matFromArray(4, 1, cv.CV_32FC2, points.flatMap((point) => [point.x, point.y]));
  const target = cv.matFromArray(4, 1, cv.CV_32FC2, [50, 50, 1850, 50, 50, 2550, 1850, 2550]);
  const transform = cv.getPerspectiveTransform(src, target);
  const output = new cv.Mat();
  try {
    cv.warpPerspective(source, output, transform, new cv.Size(1900, 2600), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255, 255));
    return output;
  } finally {
    src.delete(); target.delete(); transform.delete();
  }
}

function sampleDarkness(cv, gray, xMm, yMm) {
  const centerX = Math.round(xMm * 10);
  const centerY = Math.round(yMm * 10);
  const radius = 15;
  const roi = gray.roi(new cv.Rect(centerX - radius, centerY - radius, radius * 2 + 1, radius * 2 + 1));
  try {
    const pixels = roi.data;
    let dark = 0;
    for (let i = 0; i < pixels.length; i += 1) if (pixels[i] < 105) dark += 1;
    return dark / pixels.length;
  } finally {
    roi.delete();
  }
}

export async function scanAnswerSheet(file, choiceCount, questions) {
  const cv = await openCv();
  const source = await imageMat(cv, file);
  let warped;
  let gray;
  try {
    const token = qrText(cv, source);
    if (!/^[A-Za-z0-9_-]{32,80}$/.test(token)) throw new Error('Could not read the set QR code. Retake the photo with the QR fully visible.');
    warped = rectify(cv, source, markerCenters(cv, source));
    gray = new cv.Mat();
    cv.cvtColor(warped, gray, cv.COLOR_RGBA2GRAY);
    const layout = layoutFor(questions.length, choiceCount);
    const answers = questions.map((question, index) => {
      const bubbles = layout.bubbles.filter((bubble) => bubble.item === index + 1);
      const ratios = bubbles.map((bubble) => sampleDarkness(cv, gray, bubble.cx, bubble.cy));
      return { question_id: question.question_id, ...classifyDarkness(ratios, choiceCount), ratios };
    });
    return { token, answers };
  } finally {
    source.delete();
    warped?.delete();
    gray?.delete();
  }
}

export async function readSheetToken(file) {
  const cv = await openCv();
  const source = await imageMat(cv, file);
  try {
    const token = qrText(cv, source);
    if (!/^[A-Za-z0-9_-]{32,80}$/.test(token)) throw new Error('Could not read the set QR code. Retake the photo with the QR fully visible.');
    return token;
  } finally {
    source.delete();
  }
}
