import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTextBank } from '../src/lib/text-bank-import.ts';

test('imports Quizlet-style tab separated questions and answer keys', () => {
  const parsed = parseTextBank([
    'What is inheritance? A. Copying data B. Reusing code C. Hiding data D. Deleting code\tB',
    'Choose the prime numbers. A. Two B. Four C. Five D. Eight\tAC',
  ].join('\n'));

  assert.equal(parsed.rowCount, 2);
  assert.equal(parsed.issues.length, 0);
  assert.equal(parsed.questions.length, 2);
  assert.equal(parsed.questions[0].answerKey, 'B');
  assert.deepEqual(parsed.questions[1].answerKeys, ['A', 'C']);
});

test('accepts the full correct option text in the definition column', () => {
  const parsed = parseTextBank(
    'Capital of Vietnam? A. Hanoi B. Hue C. Da Nang D. Can Tho\tHanoi',
  );

  assert.equal(parsed.issues.length, 0);
  assert.equal(parsed.questions[0].answerKey, 'A');
  assert.equal(parsed.questions[0].explanation, '');
});

test('keeps an explanation after a prefixed correct answer', () => {
  const parsed = parseTextBank(
    'Capital of Vietnam? A. Hanoi B. Hue C. Da Nang D. Can Tho\tA. Hanoi - Hanoi is the capital city.',
  );

  assert.equal(parsed.questions[0].answerKey, 'A');
  assert.equal(parsed.questions[0].explanation, 'Hanoi is the capital city.');
});

test('supports quoted TSV fields containing tabs and newlines', () => {
  const parsed = parseTextBank(
    '"A question with\ta tab? A. One B. Two C. Three D. Four"\t"B"\n' +
      '"A second\nquestion? A. Alpha B. Beta"\t"A"',
  );

  assert.equal(parsed.questions.length, 2);
  assert.equal(parsed.issues.length, 0);
  assert.match(parsed.questions[0].question, /with a tab/);
  assert.match(parsed.questions[1].question, /second question/);
});

test('reports malformed rows without rejecting valid rows', () => {
  const parsed = parseTextBank([
    'This row has no separator',
    'Valid? A. Yes B. No\tA',
    'Missing options\tB',
  ].join('\n'));

  assert.equal(parsed.questions.length, 1);
  assert.equal(parsed.issues.length, 2);
  assert.deepEqual(parsed.issues.map((issue) => issue.row), [1, 3]);
});

test('supports custom column and row separators', () => {
  const parsed = parseTextBank(
    'First? A. Yes B. No|A---Second? A. One B. Two|B',
    { termSeparator: '|', rowSeparator: '---' },
  );

  assert.equal(parsed.questions.length, 2);
  assert.deepEqual(parsed.questions.map((question) => question.answerKey), ['A', 'B']);
});
