import * as pdfjsLib from 'pdfjs-dist';
import { parseQuizletRows, cleanText } from './quizlet-parser';

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

  for (let pageNo = 1; pageNo <= doc.numPages; pageNo += 1) {
    if (onProgress) onProgress(pageNo, doc.numPages);
    
    const page = await doc.getPage(pageNo);
    const content = await page.getTextContent();
    const rows: any[] = [];

    for (const item of content.items) {
      if (!('transform' in item)) continue;
      
      const [, , , , x, y] = item.transform;
      if (y > 730 || y < 35 || !cleanText((item as any).str)) continue;
      
      let row = rows.find((candidate) => Math.abs(candidate.y - y) < 3);
      if (!row) {
        row = { page: pageNo, y, parts: [] };
        rows.push(row);
      }
      row.parts.push({ x, text: (item as any).str });
    }

    rows.sort((a, b) => b.y - a.y);
    allRows.push(...rows);
  }

  return parseQuizletRows(allRows);
}
