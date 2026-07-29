export const PDF_CONTENT_TOP = 800;
export const PDF_CONTENT_BOTTOM = 35;

export function isPdfContentItem(y: number, text: string) {
  return (
    y <= PDF_CONTENT_TOP
    && y >= PDF_CONTENT_BOTTOM
    && Boolean(text.trim())
  );
}
