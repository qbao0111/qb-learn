export interface QuestionImageOcrProgress {
  status: string;
  progress: number;
}

const VIETNAMESE_CHARACTERS =
  /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;

export async function recognizeQuestionImage(
  imageUrl: string,
  onProgress?: (progress: QuestionImageOcrProgress) => void,
) {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker(['eng', 'vie'], 1, {
    logger: (message) => {
      onProgress?.({
        status: message.status,
        progress: Math.max(0, Math.min(1, message.progress || 0)),
      });
    },
  });

  try {
    const bilingualResult = await worker.recognize(imageUrl);
    if (VIETNAMESE_CHARACTERS.test(bilingualResult.data.text)) {
      return bilingualResult.data.text;
    }

    onProgress?.({ status: 'optimizing English text', progress: 0 });
    await worker.reinitialize('eng');
    const englishResult = await worker.recognize(imageUrl);
    return englishResult.data.text;
  } finally {
    await worker.terminate();
  }
}
