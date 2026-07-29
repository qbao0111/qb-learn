import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findQuestionIdForImage,
  getImagePlacement,
} from '../src/lib/pdf-images.ts';

test('reads top-down placement used by Quizlet/QB image transforms', () => {
  assert.deepEqual(
    getImagePlacement([257.91, 0, 0, -240, 168.68, 536.77], 841.89),
    {
      top: 296.77,
      width: 257.91,
      height: 240,
    },
  );
});

test('associates an image with the closest question above it', () => {
  const starts = [
    { id: 56, page: 13, top: 50 },
    { id: 57, page: 13, top: 273 },
    { id: 58, page: 13, top: 600 },
  ];

  assert.equal(
    findQuestionIdForImage(starts, { page: 13, top: 296 }),
    57,
  );
});

test('associates an image at the top of a page with a question continued from the previous page', () => {
  const starts = [
    { id: 90, page: 19, top: 200 },
    { id: 91, page: 19, top: 760 },
    { id: 92, page: 20, top: 350 },
  ];

  assert.equal(
    findQuestionIdForImage(starts, { page: 20, top: 50 }),
    91,
  );
});
