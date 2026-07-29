import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuizletRows } from '../src/lib/quizlet-parser.ts';
import {
  isUsableQuestion,
  normalizeQuestionAnswers,
  prepareImportedQuestions,
  suggestBankName,
} from '../src/lib/import-bank.ts';

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
  assert.equal(questions[0].explanation, '');
});

test('separates a repeated correct answer and its explanation from option D', () => {
  const rows = [
    { parts: [{ x: 15, text: '1. What does CrossFade do?' }] },
    { parts: [{ x: 15, text: 'A. Reset all parameters.' }] },
    { parts: [{ x: 15, text: 'B. Smoothly transition between states.' }] },
    { parts: [{ x: 15, text: 'C. Change playback speed.' }] },
    {
      parts: [
        { x: 15, text: 'D. Stop immediately.' },
        { x: 240, text: ':' },
        { x: 250, text: 'B. Smoothly' },
      ],
    },
    { parts: [{ x: 15, text: 'transition between states.' }] },
    { parts: [{ x: 15, text: '( Giải thích:' }] },
    { parts: [{ x: 15, text: 'CrossFade blends the two animation states.' }] },
    { parts: [{ x: 15, text: ')' }] },
    { parts: [{ x: 15, text: '2. Next question?' }] },
    { parts: [{ x: 15, text: 'A. One' }] },
    { parts: [{ x: 15, text: 'B. Two' }] },
    { parts: [{ x: 15, text: 'C. Three' }] },
    {
      parts: [
        { x: 15, text: 'D. Four' },
        { x: 100, text: ':' },
        { x: 110, text: 'A.' },
      ],
    },
  ];

  const questions = parseQuizletRows(rows);

  assert.equal(questions.length, 2);
  assert.equal(questions[0].answer, 'B');
  assert.deepEqual(questions[0].answerKeys, ['B']);
  assert.equal(questions[0].options[3].text, 'Stop immediately.');
  assert.equal(
    questions[0].explanation,
    'CrossFade blends the two animation states.',
  );
  assert.equal(questions[1].answer, 'A');
  assert.equal(questions[1].explanation, '');
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

test('normalizes a manually created answer for every study mode', () => {
  const question = normalizeQuestionAnswers({
    question: 'A manually created question',
    options: [
      { key: 'A', text: 'First option' },
      { key: 'B', text: 'Correct option' },
      { key: 'C', text: 'Third option' },
      { key: 'D', text: 'Fourth option' },
    ],
    answer: 'b',
  });

  assert.equal(question.answer, 'B');
  assert.equal(question.answerKey, 'B');
  assert.deepEqual(question.answerKeys, ['B']);
  assert.equal(isUsableQuestion({ ...question, id: 1 }), true);
});

test('keeps an already persisted manual question usable without requiring a re-save', () => {
  assert.equal(
    isUsableQuestion({
      id: 99,
      question: 'Question saved before answerKeys were added',
      options: [
        { key: 'A', text: 'First option' },
        { key: 'B', text: 'Correct option' },
      ],
      answer: 'B',
    }),
    true,
  );
});

test('parses options beyond D and preserves every correct answer', () => {
  const rows = [
    { parts: [{ x: 15, text: '1. Select every prime number.' }] },
    { parts: [{ x: 15, text: 'A. Four' }] },
    { parts: [{ x: 15, text: 'B. Two' }] },
    { parts: [{ x: 15, text: 'C. Six' }] },
    { parts: [{ x: 15, text: 'D. Eight' }] },
    {
      parts: [
        { x: 15, text: 'E. Five' },
        { x: 240, text: ':' },
        { x: 250, text: 'B E' },
      ],
    },
  ];

  const questions = parseQuizletRows(rows);

  assert.equal(questions.length, 1);
  assert.deepEqual(questions[0].options.map((option) => option.key), ['A', 'B', 'C', 'D', 'E']);
  assert.deepEqual(questions[0].answerKeys, ['B', 'E']);
  assert.equal(isUsableQuestion(questions[0]), true);
});

test('normalizes a compact multi-answer value against available options', () => {
  const question = normalizeQuestionAnswers({
    question: 'Choose two answers',
    options: ['A', 'B', 'C', 'D', 'E'].map((key) => ({ key, text: key })),
    answer: 'B,E',
  });

  assert.equal(question.answer, 'B');
  assert.equal(question.answerKey, 'B');
  assert.deepEqual(question.answerKeys, ['B', 'E']);
});

test('parses compact multi-answer keys printed after the last option', () => {
  const questions = parseQuizletRows([
    { parts: [{ x: 15, text: '1. Choose two answers.' }] },
    { parts: [{ x: 15, text: 'A. First' }] },
    { parts: [{ x: 15, text: 'B. Second' }] },
    { parts: [{ x: 15, text: 'C. Third' }] },
    { parts: [{ x: 15, text: 'D. Fourth' }] },
    {
      parts: [
        { x: 15, text: 'E. Fifth' },
        { x: 240, text: ':' },
        { x: 250, text: 'BE' },
      ],
    },
  ]);

  assert.deepEqual(questions[0].answerKeys, ['B', 'E']);
});

test('does not mistake a class name after a colon for compact answer keys', () => {
  const questions = parseQuizletRows([
    { parts: [{ x: 15, text: '1. What happens when health reaches zero?' }] },
    { parts: [{ x: 15, text: 'public class GameOverManager : MonoBehaviour' }] },
    { parts: [{ x: 15, text: 'A. Health resets' }] },
    { parts: [{ x: 15, text: 'B. Health increases' }] },
    { parts: [{ x: 15, text: 'C. The current scene reloads' }] },
    { parts: [{ x: 15, text: 'D. A new scene loads: C' }] },
  ]);

  assert.equal(questions.length, 1);
  assert.match(questions[0].question, /MonoBehaviour/);
  assert.equal(questions[0].options.length, 4);
  assert.deepEqual(questions[0].answerKeys, ['C']);
});
