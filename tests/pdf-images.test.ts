import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findQuestionIdForImage,
  getImagePlacement,
  isLikelyPdfHeaderImage,
  waitForPdfObject,
} from '../src/lib/pdf-images.ts';

test('reads top-down placement used by Quizlet/QB image transforms', () => {
  assert.deepEqual(
    getImagePlacement([257.91, 0, 0, -240, 168.68, 536.77], 841.89),
    {
      left: 168.68,
      top: 296.77,
      width: 257.91,
      height: 240,
    },
  );
});

test('ignores the repeated Quizlet logo before requesting its unresolved object', () => {
  const placement = getImagePlacement([38, 0, 0, -38, 1, 39], 792);

  assert.equal(isLikelyPdfHeaderImage(placement), true);
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

test('waits for a PDF.js image object that has not resolved yet', async () => {
  const image = { width: 100, height: 80, data: new Uint8Array(100 * 80 * 3) };
  const store = {
    get(_name: string, callback?: (value: unknown) => void) {
      setTimeout(() => callback?.(image), 5);
      return null;
    },
  };

  assert.equal(await waitForPdfObject(store, 'g_d1_img_p1_1', 100), image);
});

test('skips an unresolved image after a timeout instead of failing the import', async () => {
  const store = {
    get() {
      return null;
    },
  };

  assert.equal(await waitForPdfObject(store, 'missing-image', 5), undefined);
});
