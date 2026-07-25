import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuizletRows } from '../src/lib/quizlet-parser.ts';
import { prepareImportedQuestions, suggestBankName } from '../src/lib/import-bank.ts';

test('parses question numbers split into separate PDF.js 3 text items', () => {
  const rows = [
    {
      parts: [
        { x: 15, text: '1' },
        { x: 21, text: '.' },
        { x: 27, text: 'What is inheritance?' },
      ],
    },
    { parts: [{ x: 15, text: 'A. First option' }] },
    { parts: [{ x: 15, text: 'B. Correct option' }] },
    { parts: [{ x: 15, text: 'C. Third option' }] },
    {
      parts: [
        { x: 15, text: 'D. Fourth option' },
        { x: 405, text: ':' },
        { x: 414, text: 'B' },
      ],
    },
  ];

  const questions = parseQuizletRows(rows);

  assert.equal(questions.length, 1);
  assert.equal(questions[0].id, 1);
  assert.equal(questions[0].answerKey, 'B');
  assert.deepEqual(questions[0].answerKeys, ['B']);
});

test('restores old import behavior: deduplicate and report usable questions', () => {
  const question = {
    id: 1,
    question: 'What is inheritance?',
    options: [
      { key: 'A', text: 'First option' },
      { key: 'B', text: 'Correct option' },
    ],
    answer: 'B',
    answerKeys: ['B'],
  };

  const prepared = prepareImportedQuestions([
    question,
    { ...question, id: 2, question: '  WHAT   is inheritance?  ' },
  ]);

  assert.equal(prepared.questions.length, 1);
  assert.equal(prepared.report.extracted, 2);
  assert.equal(prepared.report.usableMultipleChoice, 1);
  assert.equal(prepared.report.duplicatesRemoved, 1);
  assert.equal(suggestBankName('4343982f-9c95-4611-b59d-ec69eec737ae.pdf'), 'Bộ đề chưa đặt tên');
});
