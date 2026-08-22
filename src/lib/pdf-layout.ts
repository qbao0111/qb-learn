export const PDF_CONTENT_TOP = 800;
export const PDF_CONTENT_BOTTOM = 35;

export function isQuizletRunningHeader(y: number, text: string, pageHeight?: number) {
  const headerRegionStart = pageHeight ? pageHeight - 150 : 700;
  if (y < headerRegionStart) return false;

  const normalizedText = text.replace(/\s+/g, ' ').trim();
  return (
    /^[A-Z]{2,}\d{3}[a-z]?$/i.test(normalizedText)
    || /^H[oọ]c\s+trực\s+tuyến\s+tại\s+https?:\/\/(?:www\.)?quizlet\.com\//i.test(normalizedText)
  );
}

export function isBrowserPrintMargin(text: string) {
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  return (
    /^https?:\/\/(?:www\.)?quizlet\.com\//i.test(normalizedText)
    || /^\d{1,2}\/\d{1,2}\/\d{2,4},\s+\d{1,2}:\d{2}\s+(?:AM|PM)$/i.test(normalizedText)
    || /^\d+\/\d+$/.test(normalizedText)
    || /^Thẻ ghi nhớ:.*\|\s*Quizlet$/i.test(normalizedText)
  );
}

export function isPdfContentItem(y: number, text: string, pageHeight?: number) {
  const contentTop = pageHeight ? pageHeight - 35 : PDF_CONTENT_TOP;
  return (
    y <= contentTop
    && y >= PDF_CONTENT_BOTTOM
    && Boolean(text.trim())
    && !isQuizletRunningHeader(y, text, pageHeight)
    && !isBrowserPrintMargin(text)
  );
}
