// Run from the frontend folder:  node src/pages/exams/print/printHelpers.check.mjs
import assert from 'node:assert/strict';
import { classText, fit, normalizeChoices, hasEmptyChoice, answerLetter } from './printHelpers.js';

assert.equal(classText({ label: 'Grade 8 - Rizal', subject: 'Math' }), 'Grade 8 - Rizal (Math)');
assert.equal(classText({ grade_level: 'Grade 8', section: 'Rizal' }), 'Grade 8 - Rizal');
assert.equal(classText(null), 'Class');
assert.equal(fit('  a   b  ', 10), 'a b');
assert.equal(fit('abcdefghij', 8), 'abcde...');
assert.deepEqual(normalizeChoices(['x', 'y', 'z', 'w'], 3), ['x', 'y', 'z']);
assert.deepEqual(normalizeChoices([{ text: 'x' }, { text: 'y' }], 3), ['x', 'y', '']);
assert.deepEqual(normalizeChoices({ A: '1', B: '2', C: '3', D: '4' }, 4), ['1', '2', '3', '4']);
assert.deepEqual(normalizeChoices({ a: '1', b: '2' }, 3), ['1', '2', '']);
assert.deepEqual(normalizeChoices(null, 3), ['', '', '']);
assert.equal(hasEmptyChoice([{ choices: ['a', 'b', 'c'] }], 3), false);
assert.equal(hasEmptyChoice([{ choices: ['a', 'b', ' '] }], 3), true);
assert.equal(answerLetter('b', 4), 'B');
assert.equal(answerLetter('E', 4), '?');
assert.equal(answerLetter(2, 4), '?');
console.log('printHelpers: all checks passed');
