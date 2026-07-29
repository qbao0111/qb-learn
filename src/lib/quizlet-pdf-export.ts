import type {
  Content,
  ContentStack,
  TDocumentDefinitions,
} from 'pdfmake/interfaces';
import type { Bank, Question } from '../store';
import { getQuestionAnswerKeys } from './answer-utils.ts';

export interface QuizletPdfQuestionBlock {
  question: string;
  options: string[];
  explanation?: string;
}

export function createQuizletPdfQuestionBlock(
  question: Question,
  index: number,
): QuizletPdfQuestionBlock {
  const answer = getQuestionAnswerKeys(question).join(' ');
  const options = question.options
    .filter((option) => option.text.trim())
    .map((option) => `${option.key.toUpperCase()}. ${option.text.trim()}`);

  if (answer && options.length) {
    options[options.length - 1] = `${options[options.length - 1]}: ${answer}`;
  }

  return {
    question: `${index + 1}. ${question.question.trim()}`,
    options,
    explanation: question.explanation?.trim() || undefined,
  };
}

export function buildQuizletPdfDefinition(bank: Bank): TDocumentDefinitions {
  const questionContent: Content[] = bank.questions.map((question, index) => {
    const block = createQuizletPdfQuestionBlock(question, index);
    const stack: ContentStack = {
      stack: [
        { text: block.question, style: 'question' },
        ...(question.imageDataUrl
          ? [{
              image: question.imageDataUrl,
              fit: [430, 240],
              alignment: 'center',
              margin: [0, 6, 0, 8],
            } as Content]
          : []),
        ...block.options.map((option) => ({ text: option, style: 'option' })),
        ...(block.explanation
          ? [{
              text: `( Giải thích: ${block.explanation} )`,
              style: 'explanation',
            }]
          : []),
      ],
      margin: [0, 0, 0, 13],
      unbreakable:
        !question.imageDataUrl
        &&
        block.question.length
          + block.options.join('').length
          + (block.explanation?.length ?? 0)
        < 1200,
    };

    return stack;
  });

  return {
    pageSize: 'A4',
    pageMargins: [42, 50, 42, 44],
    info: {
      title: `${bank.name} - Quizlet`,
      subject: 'Bộ đề trắc nghiệm xuất từ QB Learn',
      creator: 'QB Learn',
    },
    header: (currentPage) => ({
      text: `${bank.name} - ${currentPage}`,
      alignment: 'right',
      color: '#64748b',
      fontSize: 8,
      margin: [42, 20, 42, 0],
    }),
    footer: (currentPage, pageCount) => ({
      text: `QB Learn - Trang ${currentPage}/${pageCount}`,
      alignment: 'center',
      color: '#94a3b8',
      fontSize: 8,
      margin: [0, 12, 0, 0],
    }),
    content: [
      { text: bank.name, style: 'title' },
      {
        text: `${bank.questions.length} câu hỏi - Định dạng Quizlet Print`,
        style: 'subtitle',
      },
      {
        canvas: [{
          type: 'line',
          x1: 0,
          y1: 0,
          x2: 511,
          y2: 0,
          lineWidth: 1,
          lineColor: '#cbd5e1',
        }],
        margin: [0, 0, 0, 18],
      },
      ...questionContent,
    ],
    defaultStyle: {
      font: 'Roboto',
      fontSize: 10.5,
      lineHeight: 1.25,
      color: '#0f172a',
    },
    styles: {
      title: {
        fontSize: 22,
        bold: true,
        color: '#1d4ed8',
        margin: [0, 0, 0, 5],
      },
      subtitle: {
        fontSize: 9,
        color: '#64748b',
        margin: [0, 0, 0, 14],
      },
      question: {
        fontSize: 11,
        bold: true,
        margin: [0, 0, 0, 4],
      },
      option: {
        margin: [14, 1, 0, 1],
      },
      explanation: {
        italics: true,
        color: '#475569',
        fontSize: 9,
        margin: [14, 4, 0, 0],
      },
    },
  };
}

export function createQuizletPdfFileName(bankName: string) {
  const safeName = bankName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[<>:"/\\|?*]/g, '')
    .split('')
    .filter((character) => character.charCodeAt(0) >= 32)
    .join('')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90);

  return `${safeName || 'bo-de'}-quizlet.pdf`;
}

export async function downloadQuizletPdf(bank: Bank) {
  const [pdfMakeModule, fontModule] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ]);
  const pdfMake = pdfMakeModule.default ?? pdfMakeModule;
  const fontAssets = fontModule as unknown as {
    default?: Record<string, string>;
    vfs?: Record<string, string>;
  };
  const vfs = fontAssets.default ?? fontAssets.vfs ?? {};
  const definition = buildQuizletPdfDefinition(bank);
  const fileName = createQuizletPdfFileName(bank.name);

  await new Promise<void>((resolve) => {
    pdfMake
      .createPdf(definition, undefined, undefined, vfs)
      .download(fileName, resolve);
  });

  return fileName;
}
