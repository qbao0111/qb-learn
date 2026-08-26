import test from 'node:test';
import assert from 'node:assert/strict';
import { recordLearnMistake } from '../src/lib/learn-review.ts';

const question = {
  id: 7,
  question: 'Chọn hai đáp án đúng',
  options: [
    { key: 'A', text: 'Phương án A' },
    { key: 'B', text: 'Phương án B' },
    { key: 'C', text: 'Phương án C' },
  ],
  answer: 'AC',
  answerKeys: ['A', 'C'],
};

test('records the selected and correct answers for Learn review', () => {
  const mistakes = recordLearnMistake([], question, ['B']);

  assert.equal(mistakes.length, 1);
  assert.deepEqual(mistakes[0].selectedKeys, ['B']);
  assert.deepEqual(mistakes[0].correctKeys, ['A', 'C']);
});

test('keeps one review card per question and stores the latest wrong attempt', () => {
  const firstAttempt = recordLearnMistake([], question, ['B']);
  const secondAttempt = recordLearnMistake(firstAttempt, question, ['A', 'B']);

  assert.equal(secondAttempt.length, 1);
  assert.deepEqual(secondAttempt[0].selectedKeys, ['A', 'B']);
  assert.deepEqual(firstAttempt[0].selectedKeys, ['B']);
});
