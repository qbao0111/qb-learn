import { useMemo } from 'react';
import { useStore } from '../store';
import type { Question } from '../store';
import { isUsableQuestion } from '../lib/import-bank';

const EMPTY_QUESTIONS: Question[] = [];

export function useActiveQuestions() {
  const bankQuestions = useStore(
    (state) =>
      state.banks.find((bank) => bank.id === state.activeBankId)?.questions ??
      EMPTY_QUESTIONS,
  );

  return useMemo(
    () => bankQuestions.filter((question) => isUsableQuestion(question)),
    [bankQuestions],
  );
}
