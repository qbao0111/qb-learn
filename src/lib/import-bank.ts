import type { Question } from '../store';
import { getQuestionAnswerKeys } from './answer-utils.ts';

export interface ImportReport {
  extracted: number;
  usableMultipleChoice: number;
  duplicatesDetected: number;
  duplicatesRemoved: number;
  invalidCount: number;
  missingIds: number[];
  missingAnswers: number[];
  issueIds: number[];
}

export interface PreparedImport {
  questions: Question[];
  report: ImportReport;
}

export interface PrepareImportOptions {
  removeDuplicates?: boolean;
}

export function normalizeQuestionAnswers(
  question: Omit<Question, 'id'>,
): Omit<Question, 'id'> {
  const answerKeys = getQuestionAnswerKeys(question);
  const primaryAnswer = answerKeys[0] || String(question.answer || '').trim().toUpperCase();

  return {
    ...question,
    answer: primaryAnswer,
    answerKey: primaryAnswer,
    answerKeys,
  };
}

const UUID_FILE_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUsableQuestion(question: Question | null | undefined) {
  const hasUsableAnswer = Boolean(question && getQuestionAnswerKeys(question).length);

  return Boolean(
    question &&
      question.question?.trim() &&
      Array.isArray(question.options) &&
      question.options.length >= 2 &&
      hasUsableAnswer,
  );
}

export function suggestBankName(fileName: string) {
  const sourceName = fileName.replace(/\.pdf$/i, '').trim();
  return sourceName && !UUID_FILE_NAME.test(sourceName)
    ? sourceName
    : 'Bộ đề chưa đặt tên';
}

export function prepareImportedQuestions(
  parsedQuestions: Question[],
  options: PrepareImportOptions = { removeDuplicates: true },
): PreparedImport {
  const seen = new Set<string>();
  const questions: Question[] = [];
  let duplicatesDetected = 0;
  let duplicatesRemoved = 0;

  for (const question of parsedQuestions) {
    const normalizedQuestion = question.question.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!normalizedQuestion) continue;
    if (seen.has(normalizedQuestion)) {
      duplicatesDetected += 1;
      if (options.removeDuplicates !== false) {
        duplicatesRemoved += 1;
        continue;
      }
    } else {
      seen.add(normalizedQuestion);
    }

    questions.push(question);
  }

  const maxSourceId = Math.max(0, ...questions.map((question) => question.id || 0));
  const ids = new Set(questions.map((question) => question.id));
  const issueQuestions = questions.filter((question) => !isUsableQuestion(question));
  const usableMultipleChoice = questions.length - issueQuestions.length;

  return {
    questions,
    report: {
      extracted: parsedQuestions.length,
      usableMultipleChoice,
      duplicatesDetected,
      duplicatesRemoved,
      invalidCount: issueQuestions.length,
      missingIds: Array.from({ length: maxSourceId }, (_, index) => index + 1).filter(
        (id) => !ids.has(id),
      ),
      missingAnswers: questions
        .filter((question) => !question.answerKeys?.length)
        .map((question) => question.id),
      issueIds: issueQuestions.map((question) => question.id),
    },
  };
}
