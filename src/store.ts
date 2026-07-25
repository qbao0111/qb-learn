import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { questions as defaultQuestions } from './data/questions';

export interface Question {
  id: number;
  question: string;
  options: { key: string; text: string }[];
  answer: string;
  answerKey?: string;
  answerKeys?: string[];
  explanation?: string;
  metadata?: string;
}

export interface BankReport {
  extracted: number;
  usableMultipleChoice: number;
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
  toggleSound: () => void;
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
      
      getActiveQuestions: () => {
        const state = get();
        const activeBank = state.banks.find(b => b.id === state.activeBankId);
        return activeBank
          ? activeBank.questions.filter(
              (question) =>
                Array.isArray(question.options) &&
                question.options.length >= 2 &&
                Array.isArray(question.answerKeys) &&
                question.answerKeys.length > 0,
            )
          : [];
      }
    }),
    {
      name: 'qblearn-storage',
    }
  )
);
