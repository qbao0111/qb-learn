import test from 'node:test';
import assert from 'node:assert/strict';
import {
  areAnswerSetsEqual,
  getQuestionAnswerKeys,
} from '../src/lib/answer-utils.ts';

const multiAnswerQuestion = {
  options: ['A', 'B', 'C', 'D', 'E'].map((key) => ({ key, text: key })),
  answer: 'B',
  answerKeys: ['B', 'E'],
};

test('requires the exact set for a multiple-answer question', () => {
  const correctKeys = getQuestionAnswerKeys(multiAnswerQuestion);

  assert.equal(areAnswerSetsEqual(['B'], correctKeys), false);
  assert.equal(areAnswerSetsEqual(['E', 'B'], correctKeys), true);
  assert.equal(areAnswerSetsEqual(['B', 'E', 'A'], correctKeys), false);
});

test('does not interpret letters inside an answer sentence as keys', () => {
  assert.deepEqual(
    getQuestionAnswerKeys({
      options: multiAnswerQuestion.options,
      answer: 'By providing clear instructions',
    }),
    [],
  );
});

test('recovers a legacy answer stored as the full option text', () => {
  assert.deepEqual(
    getQuestionAnswerKeys({
      options: [
        { key: 'A', text: 'Wrong answer' },
        { key: 'B', text: 'By providing clear instructions.' },
      ],
      answer: 'By providing clear instructions',
    }),
    ['B'],
  );
});
