import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildQuizletPdfDefinition,
  createQuizletPdfFileName,
  createQuizletPdfQuestionBlock,
} from '../src/lib/quizlet-pdf-export.ts';
import { parseQuizletRows } from '../src/lib/quizlet-parser.ts';
import { prepareImportedQuestions } from '../src/lib/import-bank.ts';

const bank = {
  id: 'bank-test',
  name: 'Bộ đề UI/UX',
  createdAt: 1,
  questions: [
    {
      id: 42,
      question: 'How does Guidance help users?',
      options: [
        { key: 'A', text: 'By adding visual complexity' },
        { key: 'B', text: 'By providing clear instructions' },
        { key: 'C', text: 'By removing every cue' },
        { key: 'D', text: 'By focusing only on aesthetics' },
      ],
      answer: 'B',
      answerKey: 'B',
      answerKeys: ['B'],
      explanation: 'Guidance gives users cues and assistance.',
    },
  ],
};

test('creates Quizlet-compatible lines with the answer after the last option', () => {
  const block = createQuizletPdfQuestionBlock(bank.questions[0], 0);

  assert.equal(block.question, '1. How does Guidance help users?');
  assert.equal(block.options[3], 'D. By focusing only on aesthetics: B');
  assert.equal(block.explanation, 'Guidance gives users cues and assistance.');
});

test('exported question lines can be parsed back into the same answer', () => {
  const block = createQuizletPdfQuestionBlock(bank.questions[0], 0);
  const rows = [
    block.question,
    ...block.options,
    `( Giải thích: ${block.explanation} )`,
  ].map((text) => ({ parts: [{ x: 15, text }] }));

  const parsed = parseQuizletRows(rows);

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].question, bank.questions[0].question);
  assert.deepEqual(parsed[0].answerKeys, ['B']);
  assert.equal(parsed[0].options[3].text, bank.questions[0].options[3].text);
  assert.equal(parsed[0].explanation, bank.questions[0].explanation);
});

test('builds a paginated A4 PDF definition and safe file name', () => {
  const definition = buildQuizletPdfDefinition(bank);

  assert.equal(definition.pageSize, 'A4');
  assert.equal(definition.info?.creator, 'QB Learn');
  assert.ok(Array.isArray(definition.content));
  assert.equal(createQuizletPdfFileName(bank.name), 'Bo-de-UIUX-quizlet.pdf');
});

test('recovers a legacy answer sentence that matches an option', () => {
  const block = createQuizletPdfQuestionBlock({
    ...bank.questions[0],
    answer: 'By providing clear instructions',
    answerKey: undefined,
    answerKeys: undefined,
  }, 0);

  assert.equal(block.options[3], 'D. By focusing only on aesthetics: B');
});

test('exports and re-imports option E with multiple correct answers', () => {
  const question = {
    ...bank.questions[0],
    options: [
      ...bank.questions[0].options,
      { key: 'E', text: 'Another correct instruction' },
    ],
    answer: 'B',
    answerKey: 'B',
    answerKeys: ['B', 'E'],
  };
  const block = createQuizletPdfQuestionBlock(question, 0);
  const rows = [block.question, ...block.options]
    .map((text) => ({ parts: [{ x: 15, text }] }));

  assert.equal(block.options[4], 'E. Another correct instruction: B E');
  const parsed = parseQuizletRows(rows);
  assert.deepEqual(parsed[0].answerKeys, ['B', 'E']);
  assert.equal(parsed[0].options.length, 5);
});

test('keeps an attached question image in the exported PDF definition', () => {
  const imageDataUrl = 'data:image/png;base64,iVBORw0KGgo=';
  const definition = buildQuizletPdfDefinition({
    ...bank,
    questions: [{ ...bank.questions[0], imageDataUrl }],
  });

  assert.match(JSON.stringify(definition.content), /data:image\/png;base64/);
});

test('round-trips a 128-question bank including legacy text answers', () => {
  const questions = Array.from({ length: 128 }, (_, index) => ({
    id: index + 1,
    question: `Round-trip question ${index + 1}?`,
    options: [
      { key: 'A', text: `Wrong A ${index + 1}` },
      { key: 'B', text: `Correct B ${index + 1}` },
      { key: 'C', text: `Wrong C ${index + 1}` },
      { key: 'D', text: `Wrong D ${index + 1}` },
    ],
    answer: index % 5 === 0 ? `Correct B ${index + 1}` : 'B',
    answerKey: index % 5 === 0 ? undefined : 'B',
    answerKeys: index % 5 === 0 ? undefined : ['B'],
  }));
  const rows = questions.flatMap((question, index) => {
    const block = createQuizletPdfQuestionBlock(question, index);
    return [block.question, ...block.options]
      .map((text) => ({ parts: [{ x: 15, text }] }));
  });

  const parsed = parseQuizletRows(rows);
  const prepared = prepareImportedQuestions(parsed);

  assert.equal(parsed.length, 128);
  assert.equal(prepared.report.usableMultipleChoice, 128);
  assert.equal(prepared.questions.length, 128);
});
