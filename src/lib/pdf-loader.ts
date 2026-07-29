import * as pdfjsLib from 'pdfjs-dist';
import { parseQuizletRows, cleanText } from './quizlet-parser';
import { isPdfContentItem } from './pdf-layout';
import {
  extractPdfPageImages,
  findQuestionIdForImage,
  type PdfEmbeddedImage,
  type PdfQuestionStart,
} from './pdf-images';

// In Vite, we can point to the worker file from node_modules directly using ?url
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export async function parseQuizletPdf(
  file: File, 
  onProgress?: (page: number, total: number) => void
) {
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const allRows: any[] = [];
  const questionStarts: PdfQuestionStart[] = [];
  const embeddedImages: PdfEmbeddedImage[] = [];

  try {
    for (let pageNo = 1; pageNo <= doc.numPages; pageNo += 1) {
      if (onProgress) onProgress(pageNo, doc.numPages);
      
      const page = await doc.getPage(pageNo);
      const content = await page.getTextContent();
      const rows: any[] = [];

      for (const item of content.items) {
        if (!('transform' in item)) continue;
        
        const [, , , , x, y] = item.transform;
        // Exported QB/Quizlet PDFs may place the first question near y=782.
        // Only discard the actual running header/footer, not the top question.
        if (!isPdfContentItem(y, cleanText((item as any).str))) continue;
        
        let row = rows.find((candidate) => Math.abs(candidate.y - y) < 3);
        if (!row) {
          row = { page: pageNo, y, parts: [] };
          rows.push(row);
        }
        row.parts.push({ x, text: (item as any).str });
      }

      rows.sort((a, b) => b.y - a.y);
      const pageHeight = page.view[3] - page.view[1];
      for (const row of rows) {
        const line = cleanText(
          [...row.parts]
            .sort((a, b) => a.x - b.x)
            .map((part) => part.text)
            .join(' '),
        );
        const questionStart = line.match(/^\W*(\d+)\.\s*/);
        if (questionStart) {
          questionStarts.push({
            id: Number(questionStart[1]),
            page: pageNo,
            top: pageHeight - row.y,
          });
        }
      }

      allRows.push(...rows);
      embeddedImages.push(...await extractPdfPageImages(page, pageNo));
    }

    const questions = parseQuizletRows(allRows);
    const questionById = new Map(questions.map((question) => [question.id, question]));

    for (const image of embeddedImages) {
      const questionId = findQuestionIdForImage(questionStarts, image);
      if (!questionId) continue;

      const question = questionById.get(questionId);
      if (!question) continue;

      // The current data model stores one illustration per question. If a PDF
      // draws the same image more than once, keep the first useful one.
      if (!question.imageDataUrl) question.imageDataUrl = image.dataUrl;
    }

    return questions;
  } finally {
    await doc.destroy();
  }
}
