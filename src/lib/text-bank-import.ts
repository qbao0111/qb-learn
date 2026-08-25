import type { Question } from '../store';
import { getQuestionAnswerKeys } from './answer-utils.ts';
import { cleanText, parseInlineOptions } from './quizlet-parser.ts';

export interface TextImportSettings {
  termSeparator: string;
  rowSeparator: string;
}

export interface TextImportIssue {
  row: number;
  source: string;
  message: string;
}

export interface ParsedTextBank {
  questions: Question[];
  issues: TextImportIssue[];
  rowCount: number;
}

function splitDelimited(value: string, separator: string, preserveQuotes = false) {
  if (!separator) return [value];
  const parts: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (character === '"') {
      if (quoted && value[index + 1] === '"') {
        current += preserveQuotes ? '""' : '"';
        index += 1;
      } else {
        quoted = !quoted;
        if (preserveQuotes) current += character;
      }
      continue;
    }
    if (!quoted && value.startsWith(separator, index)) {
      parts.push(current);
      current = '';
      index += separator.length - 1;
      continue;
    }
    current += character;
  }
  parts.push(current);
  return parts;
}

function deriveExplanation(answer: string, question: Question, answerKeys: string[]) {
  if (answerKeys.length !== 1) return '';
  const answerKey = answerKeys[0];
  const optionText = cleanText(
    question.options.find((option) => option.key === answerKey)?.text || '',
  );
  let remainder = cleanText(answer)
    .replace(new RegExp(`^${answerKey}\\s*[.):\\-]?\\s*`, 'i'), '')
    .trim();

  if (optionText && remainder.toLocaleLowerCase().startsWith(optionText.toLocaleLowerCase())) {
    remainder = remainder.slice(optionText.length).trim();
  }

  return remainder
    .replace(/^[-–—:;,.\s]+/, '')
    .replace(/^\(?\s*(?:giải\s*thích|explanation)\s*[:=-]?\s*/i, '')
    .replace(/\)\s*$/, '')
    .trim();
}

export function parseTextBank(
  rawText: string,
  settings: TextImportSettings = { termSeparator: '\t', rowSeparator: '\n' },
): ParsedTextBank {
  const normalizedSource = rawText.replace(/^\ufeff/, '').replace(/\r\n?/g, '\n');
  const rowSeparator = settings.rowSeparator === '\r\n' ? '\n' : settings.rowSeparator;
  const rows = splitDelimited(normalizedSource, rowSeparator, true)
    .map((row) => row.trim())
    .filter(Boolean);
  const questions: Question[] = [];
  const issues: TextImportIssue[] = [];

  rows.forEach((source, rowIndex) => {
    const columns = splitDelimited(source, settings.termSeparator);
    if (columns.length < 2) {
      issues.push({
        row: rowIndex + 1,
        source,
        message: 'Không tìm thấy dấu phân cách giữa câu hỏi và đáp án.',
      });
      return;
    }

    const term = cleanText(columns[0].replace(/[\t\n]+/g, ' '));
    const answer = cleanText(
      columns.slice(1).join(settings.termSeparator).replace(/[\t\n]+/g, ' '),
    );
    if (!term || !answer) {
      issues.push({
        row: rowIndex + 1,
        source,
        message: 'Câu hỏi hoặc đáp án đang để trống.',
      });
      return;
    }

    const parsed = parseInlineOptions(term);
    if (!parsed) {
      issues.push({
        row: rowIndex + 1,
        source,
        message: 'Không nhận diện được ít nhất hai lựa chọn dạng A., B., C.…',
      });
      return;
    }

    const draft: Question = {
      id: questions.length + 1,
      question: parsed.question,
      options: parsed.options,
      answer,
      answerKey: '',
      answerKeys: [],
      explanation: '',
    };
    const answerKeys = getQuestionAnswerKeys(draft);
    if (!answerKeys.length) {
      issues.push({
        row: rowIndex + 1,
        source,
        message: `Đáp án “${answer}” không khớp với các lựa chọn.`,
      });
      return;
    }

    questions.push({
      ...draft,
      id: questions.length + 1,
      answer: answerKeys[0],
      answerKey: answerKeys[0],
      answerKeys,
      explanation: deriveExplanation(answer, draft, answerKeys),
    });
  });

  return { questions, issues, rowCount: rows.length };
}
