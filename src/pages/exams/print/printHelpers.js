// Small pure helpers for the print views. No React, so they can be tested with Node.
import { LETTERS } from './sheetLayout.js';

export const classText = (c) => {
  if (!c) return 'Class';
  const name = c.label ?? [c.grade_level, c.section].filter(Boolean).join(' - ');
  return `${name}${c.subject ? ` (${c.subject})` : ''}`;
};

// Shortens text for the fixed-width answer sheet header.
export function fit(text, max) {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, Math.max(0, max - 3)).trimEnd()}...` : s;
}

// Accepts an array of strings, an array of { text }, or an object keyed A, B, C.
// Always returns exactly `count` strings.
export function normalizeChoices(raw, count) {
  let list = [];
  if (Array.isArray(raw)) {
    list = raw.map((c) => (typeof c === 'string' ? c : c?.text ?? c?.body ?? ''));
  } else if (raw && typeof raw === 'object') {
    const keyed = LETTERS.slice(0, count).map((l) => raw[l] ?? raw[l.toLowerCase()]);
    list = keyed.some((v) => v !== undefined) ? keyed.map((v) => v ?? '') : Object.values(raw);
  }
  const out = list.slice(0, count).map((c) => String(c ?? ''));
  while (out.length < count) out.push('');
  return out;
}

export function hasEmptyChoice(questions, count) {
  return questions.some((q) => normalizeChoices(q.choices, count).some((c) => c.trim() === ''));
}

// The correct letter for the teacher key, or '?' if it is not a letter inside A..count.
export function answerLetter(value, count) {
  const v = String(value ?? '').trim().toUpperCase();
  return LETTERS.slice(0, count).includes(v) ? v : '?';
}
