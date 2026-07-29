import test from 'node:test';
import assert from 'node:assert/strict';
import { isPdfContentItem } from '../src/lib/pdf-layout.ts';

test('keeps the first question near the top of an exported PDF page', () => {
  assert.equal(isPdfContentItem(782, '105. A question near the page top?'), true);
  assert.equal(isPdfContentItem(815, 'Running page header'), false);
  assert.equal(isPdfContentItem(25, 'QB Learn - Trang 1/20'), false);
});
