import type { Question } from '../store';
import { getQuestionAnswerKeys } from './answer-utils.ts';

export interface LearnMistake {
  question: Question;
  selectedKeys: string[];
  correctKeys: string[];
}

export function recordLearnMistake(
  previous: LearnMistake[],
  question: Question,
  selectedKeys: string[],
) {
  const mistake: LearnMistake = {
    question,
    selectedKeys: [...selectedKeys],
    correctKeys: getQuestionAnswerKeys(question),
  };
  const existingIndex = previous.findIndex(
    (item) => item.question.id === question.id,
  );

  if (existingIndex === -1) return [...previous, mistake];

  const next = [...previous];
  next[existingIndex] = mistake;
  return next;
}
