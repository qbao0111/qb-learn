import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isBrowserPrintMargin,
  isPdfContentItem,
  isQuizletRunningHeader,
} from '../src/lib/pdf-layout.ts';

test('keeps the first question near the top of an exported PDF page', () => {
  assert.equal(isPdfContentItem(782, '105. A question near the page top?'), true);
  assert.equal(isPdfContentItem(815, 'Running page header'), false);
  assert.equal(isPdfContentItem(25, 'QB Learn - Trang 1/20'), false);
});

test('removes Quizlet course and online-study running headers', () => {
  assert.equal(isQuizletRunningHeader(759, 'PMG201c'), true);
  assert.equal(
    isQuizletRunningHeader(741, 'Hoc trực tuyến tại https://quizlet.com/_ju150q'),
    true,
  );
  assert.equal(isPdfContentItem(759, 'PMG201c'), false);
  assert.equal(
    isPdfContentItem(741, 'Hoc trực tuyến tại https://quizlet.com/_ju150q'),
    false,
  );
});

test('keeps Prevention over inspection as a real answer option', () => {
  assert.equal(isPdfContentItem(573, 'B. Prevention over inspection'), true);
});

test('supports A3 browser-print pages while removing browser headers and footers', () => {
  assert.equal(isPdfContentItem(1128.9, 'Nội dung câu hỏi A. Một B. Hai', 1191.12), true);
  assert.equal(isPdfContentItem(1168.6, '8/21/26, 8:46 PM', 1191.12), false);
  assert.equal(
    isBrowserPrintMargin('https://quizlet.com/vn/1200881508/mln122-qbao-cu-flash-cards'),
    true,
  );
  assert.equal(isBrowserPrintMargin('15/15'), true);
  assert.equal(isBrowserPrintMargin('Thẻ ghi nhớ: MLN122 Qbao Cũ | Quizlet'), true);
});
