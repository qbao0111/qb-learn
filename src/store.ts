import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { questions as defaultQuestions } from './data/questions';
import { isUsableQuestion, normalizeQuestionAnswers } from './lib/import-bank';
import { getQuestionAnswerKeys } from './lib/answer-utils';

export interface Question {
  id: number;
  question: string;
  options: { key: string; text: string }[];
  answer: string;
  answerKey?: string;
  answerKeys?: string[];
  explanation?: string;
  metadata?: string;
  imageDataUrl?: string;
}

export interface BankReport {
  extracted: number;
  usableMultipleChoice: number;
  duplicatesDetected: number;
  duplicatesRemoved: number;
  invalidCount: number;
  missingIds: number[];
  missingAnswers: number[];
  issueIds: number[];
}

export interface Bank {
  id: string;
  name: string;
  questions: Question[];
  createdAt: number;
  sourceName?: string;
  report?: BankReport;
}

interface AppState {
  banks: Bank[];
  activeBankId: string | null;
  soundEnabled: boolean;
  addBank: (
    name: string,
    questions: Question[],
    details?: { sourceName?: string; report?: BankReport },
  ) => void;
  setActiveBank: (id: string) => void;
  getActiveQuestions: () => Question[];
  deleteBank: (id: string) => void;
  restoreBanks: (banks: Bank[]) => void;
  toggleSound: () => void;
  addQuestion: (bankId: string, question: Omit<Question, 'id'>) => void;
  updateQuestion: (bankId: string, questionId: number, question: Omit<Question, 'id'>) => void;
  deleteQuestion: (bankId: string, questionId: number) => void;
}

function updateBankQuestions(bank: Bank, questions: Question[]): Bank {
  if (!bank.report) return { ...bank, questions };

  const usableQuestions = questions.filter((question) => isUsableQuestion(question));
  const maxSourceId = Math.max(0, ...questions.map((question) => question.id || 0));
  const ids = new Set(questions.map((question) => question.id));
  const issueQuestions = questions.filter((question) => !isUsableQuestion(question));

  return {
    ...bank,
    questions,
    report: {
      ...bank.report,
      extracted: questions.length,
      usableMultipleChoice: usableQuestions.length,
      invalidCount: issueQuestions.length,
      missingIds: Array.from({ length: maxSourceId }, (_, index) => index + 1).filter(
        (id) => !ids.has(id),
      ),
      missingAnswers: questions
        .filter(
          (question) =>
            getQuestionAnswerKeys(question).length === 0,
        )
        .map((question) => question.id),
      issueIds: issueQuestions.map((question) => question.id),
    },
  };
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      banks: [
        {
          id: 'default-mln111',
          name: 'MLN111 (Mặc định)',
          questions: defaultQuestions as Question[],
          createdAt: Date.now(),
        }
      ],
      activeBankId: 'default-mln111',
      soundEnabled: true,
      
      addQuestion: (bankId, question) =>
        set((state) => {
          const bank = state.banks.find((b) => b.id === bankId);
          if (!bank) return state;
          const newId = bank.questions.length > 0 ? Math.max(...bank.questions.map(q => q.id)) + 1 : 1;
          const newQuestion: Question = {
            ...normalizeQuestionAnswers(question),
            id: newId,
          };
          return {
            banks: state.banks.map((b) =>
              b.id === bankId
                ? updateBankQuestions(b, [...b.questions, newQuestion])
                : b
            ),
          };
        }),
      updateQuestion: (bankId, questionId, updatedData) =>
        set((state) => ({
          banks: state.banks.map((b) => {
            if (b.id !== bankId) return b;
            const normalizedQuestion: Question = {
              ...normalizeQuestionAnswers(updatedData),
              id: questionId,
            };
            return updateBankQuestions(
              b,
              b.questions.map((q) => q.id === questionId ? normalizedQuestion : q),
            );
          }),
        })),
      deleteQuestion: (bankId, questionId) =>
        set((state) => ({
          banks: state.banks.map((b) => {
            if (b.id !== bankId) return b;
            return updateBankQuestions(
              b,
              b.questions.filter((q) => q.id !== questionId),
            );
          }),
        })),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      
      addBank: (name, questions, details) => {
        const createdAt = Date.now();
        const id = `bank-${createdAt}-${Math.random().toString(36).slice(2, 8)}`;
        const bank: Bank = {
          id,
          name: name.trim() || 'Bộ đề chưa đặt tên',
          questions,
          createdAt,
          ...details,
        };

        set((state) => ({
          banks: [
            ...state.banks.filter(
              (item) => item.id === 'default-mln111' || item.name !== bank.name,
            ),
            bank,
          ],
          activeBankId: id,
        }));
      },
      
      setActiveBank: (id) => {
        set({ activeBankId: id });
      },
      
      deleteBank: (id) => {
        set((state) => {
          const newBanks = state.banks.filter(b => b.id !== id);
          return {
            banks: newBanks,
            activeBankId: state.activeBankId === id 
              ? (newBanks[0]?.id || null) 
              : state.activeBankId
          };
        });
      },

      restoreBanks: (restoredBanks) => {
        set((state) => {
          const restoredIds = new Set(restoredBanks.map((bank) => bank.id));
          return {
            banks: [
              ...state.banks.filter((bank) => !restoredIds.has(bank.id)),
              ...restoredBanks,
            ],
            activeBankId: restoredBanks.at(-1)?.id || state.activeBankId,
          };
        });
      },
      
      getActiveQuestions: () => {
        const state = get();
        const activeBank = state.banks.find(b => b.id === state.activeBankId);
        return activeBank
          ? activeBank.questions.filter((question) => isUsableQuestion(question))
          : [];
      }
    }),
    {
      name: 'qblearn-storage',
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as AppState;
        if (!state || !Array.isArray(state.banks)) return state;

        return {
          ...state,
          banks: state.banks.map((bank) => ({
            ...bank,
            questions: bank.questions.map((question) => ({
              ...normalizeQuestionAnswers(question),
              id: question.id,
            })),
          })),
        };
      },
    }
  )
);
