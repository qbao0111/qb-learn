import type { Question } from '../store';

export interface ImportReport {
  extracted: number;
  usableMultipleChoice: number;
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

const UUID_FILE_NAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUsableQuestion(question: Question | null | undefined) {
  return Boolean(
    question &&
      question.question?.trim() &&
      Array.isArray(question.options) &&
      question.options.length >= 2 &&
      Array.isArray(question.answerKeys) &&
      question.answerKeys.length,
  );
}

export function suggestBankName(fileName: string) {
  const sourceName = fileName.replace(/\.pdf$/i, '').trim();
  return sourceName && !UUID_FILE_NAME.test(sourceName)
    ? sourceName
    : 'Bộ đề chưa đặt tên';
}

export function prepareImportedQuestions(parsedQuestions: Question[]): PreparedImport {
  const seen = new Set<string>();
  const questions: Question[] = [];
  let duplicatesRemoved = 0;

  for (const question of parsedQuestions) {
    const normalizedQuestion = question.question.replace(/\s+/g, ' ').trim().toLowerCase();
    if (!normalizedQuestion || seen.has(normalizedQuestion)) {
      duplicatesRemoved += 1;
      continue;
    }

    seen.add(normalizedQuestion);
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
