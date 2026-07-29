import * as pdfjsLib from 'pdfjs-dist';

type PdfPage = Awaited<ReturnType<Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>['getPage']>>;

type PdfRawImage = {
  width: number;
  height: number;
  data?: Uint8Array | Uint8ClampedArray;
  bitmap?: ImageBitmap;
};

export interface PdfQuestionStart {
  id: number;
  page: number;
  top: number;
}

export interface PdfEmbeddedImage {
  page: number;
  top: number;
  width: number;
  height: number;
  dataUrl: string;
}

const pdfjs = (
  pdfjsLib as unknown as { default?: typeof pdfjsLib }
).default ?? pdfjsLib;

function transformPoint(
  matrix: number[],
  x: number,
  y: number,
) {
  return {
    x: matrix[0] * x + matrix[2] * y + matrix[4],
    y: matrix[1] * x + matrix[3] * y + matrix[5],
  };
}

export function getImagePlacement(
  matrix: number[],
  pageHeight: number,
) {
  const corners = [
    transformPoint(matrix, 0, 0),
    transformPoint(matrix, 1, 0),
    transformPoint(matrix, 0, 1),
    transformPoint(matrix, 1, 1),
  ];
  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // Quizlet/QB exports use a negative image Y scale and top-down coordinates.
  // Conventional PDF image matrices use a positive scale and bottom-up coordinates.
  const top = matrix[3] < 0 ? minY : pageHeight - maxY;

  return {
    top,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function findQuestionIdForImage(
  starts: PdfQuestionStart[],
  image: Pick<PdfEmbeddedImage, 'page' | 'top'>,
) {
  let selected: PdfQuestionStart | undefined;

  for (const start of starts) {
    const isBeforeImage =
      start.page < image.page
      || (start.page === image.page && start.top <= image.top + 2);
    if (!isBeforeImage) continue;

    if (
      !selected
      || start.page > selected.page
      || (start.page === selected.page && start.top > selected.top)
    ) {
      selected = start;
    }
  }

  return selected?.id;
}

function rawImageToDataUrl(image: PdfRawImage) {
  if (
    typeof document === 'undefined'
    || image.width <= 0
    || image.height <= 0
  ) {
    return '';
  }

  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  if (!context) return '';

  if (image.bitmap) {
    context.drawImage(image.bitmap, 0, 0, image.width, image.height);
    return canvas.toDataURL('image/png');
  }

  if (!image.data) return '';

  const pixelCount = image.width * image.height;
  const source = image.data;
  const output = context.createImageData(image.width, image.height);

  if (source.length === pixelCount * 4) {
    output.data.set(source);
  } else if (source.length === pixelCount * 3) {
    for (let sourceIndex = 0, targetIndex = 0; sourceIndex < source.length;) {
      output.data[targetIndex++] = source[sourceIndex++];
      output.data[targetIndex++] = source[sourceIndex++];
      output.data[targetIndex++] = source[sourceIndex++];
      output.data[targetIndex++] = 255;
    }
  } else if (source.length === pixelCount) {
    for (let sourceIndex = 0, targetIndex = 0; sourceIndex < source.length; sourceIndex += 1) {
      const value = source[sourceIndex];
      output.data[targetIndex++] = value;
      output.data[targetIndex++] = value;
      output.data[targetIndex++] = value;
      output.data[targetIndex++] = 255;
    }
  } else {
    return '';
  }

  context.putImageData(output, 0, 0);
  return canvas.toDataURL('image/png');
}

function findPlacementMatrix(
  fnArray: number[],
  argsArray: unknown[][],
  imageIndex: number,
) {
  for (let index = imageIndex - 1; index >= 0; index -= 1) {
    const fn = fnArray[index];
    if (fn === pdfjs.OPS.transform) {
      const matrix = argsArray[index];
      if (
        Array.isArray(matrix)
        && matrix.length === 6
        && matrix.every((value) => typeof value === 'number')
      ) {
        return matrix as number[];
      }
    }
    if (fn === pdfjs.OPS.restore || fn === pdfjs.OPS.paintImageXObject) break;
  }

  return null;
}

export async function extractPdfPageImages(
  page: PdfPage,
  pageNumber: number,
): Promise<PdfEmbeddedImage[]> {
  const operatorList = await page.getOperatorList();
  const pageHeight = page.view[3] - page.view[1];
  const images: PdfEmbeddedImage[] = [];

  for (let index = 0; index < operatorList.fnArray.length; index += 1) {
    if (operatorList.fnArray[index] !== pdfjs.OPS.paintImageXObject) continue;

    const matrix = findPlacementMatrix(
      operatorList.fnArray,
      operatorList.argsArray as unknown[][],
      index,
    );
    if (!matrix) continue;

    const placement = getImagePlacement(matrix, pageHeight);
    const objectName = operatorList.argsArray[index]?.[0];
    if (typeof objectName !== 'string') continue;

    const rawImage = page.objs.get(objectName) as PdfRawImage | undefined;
    if (!rawImage || rawImage.width < 40 || rawImage.height < 40) continue;
    if (
      placement.width < 32
      || placement.height < 32
      || placement.width * placement.height < 2_500
    ) {
      continue;
    }

    const dataUrl = rawImageToDataUrl(rawImage);
    if (!dataUrl) continue;

    images.push({
      page: pageNumber,
      top: placement.top,
      width: placement.width,
      height: placement.height,
      dataUrl,
    });
  }

  return images;
}
