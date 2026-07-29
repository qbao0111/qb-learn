import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuestionImageText } from '../src/lib/question-image-parser.ts';

test('parses a question and four choices from OCR text', () => {
  const parsed = parseQuestionImageText(`
    How does the principle of Guidance help users in UI design?
    A. By making the interface visually complex within the interface
    B. By providing clear instructions, cues, or assistance within the interface
    C. By allowing users to customize the interface extensively
    D. By focusing solely on aesthetic appeal within the interface
  `);

  assert.equal(
    parsed.question,
    'How does the principle of Guidance help users in UI design?',
  );
  assert.deepEqual(
    parsed.options.map((option) => option.key),
    ['A', 'B', 'C', 'D'],
  );
  assert.match(parsed.options[1].text, /clear instructions/);
  assert.deepEqual(parsed.warnings, []);
});

test('keeps wrapped option text and accepts common option separators', () => {
  const parsed = parseQuestionImageText(`
    12) Which statement is correct?
    A) The first answer wraps
    onto another OCR line.
    B: The second answer
    C - The third answer
    D. The fourth answer
  `);

  assert.equal(parsed.question, 'Which statement is correct?');
  assert.equal(parsed.options[0].text, 'The first answer wraps onto another OCR line.');
  assert.equal(parsed.options[3].text, 'The fourth answer');
});

test('accepts an option marker when OCR drops its punctuation', () => {
  const parsed = parseQuestionImageText(`
    How does Guidance help users?
    A By making the interface visually complex
    B. By providing clear instructions
    C. By allowing extensive customization
    D. By focusing solely on aesthetics
  `);

  assert.equal(parsed.question, 'How does Guidance help users?');
  assert.equal(parsed.options[0].key, 'A');
  assert.equal(parsed.options[0].text, 'By making the interface visually complex');
  assert.equal(parsed.options.length, 4);
});

test('does not treat a question beginning with A as the first option', () => {
  const parsed = parseQuestionImageText(`
    A rollback is used for which purpose?
    A. To restore a previous state
    B. To delete every backup
    C. To create an account
    D. To change a password
  `);

  assert.equal(parsed.question, 'A rollback is used for which purpose?');
  assert.equal(parsed.options[0].text, 'To restore a previous state');
});

test('returns a warning when OCR misses choices', () => {
  const parsed = parseQuestionImageText(`
    What is visible in the image?
    A. First answer
  `);

  assert.equal(parsed.question, 'What is visible in the image?');
  assert.equal(parsed.options.length, 1);
  assert.match(parsed.warnings.join(' '), /Không nhận diện đủ/);
});

test('recognizes an option E from OCR text', () => {
  const parsed = parseQuestionImageText(`
    Which values are valid?
    A. First
    B. Second
    C. Third
    D. Fourth
    E. Fifth
  `);

  assert.deepEqual(
    parsed.options.map((option) => option.key),
    ['A', 'B', 'C', 'D', 'E'],
  );
});
