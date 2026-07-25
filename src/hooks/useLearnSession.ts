import { useState, useCallback, useEffect } from 'react';
import type { Question } from '../store';

export function useLearnSession(questions: Question[], shuffleOptions: boolean = false) {
  const [learningQueue, setLearningQueue] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [stats, setStats] = useState({ correct: 0, incorrect: 0 });

  // Initialize session
  useEffect(() => {
    if (questions.length > 0) {
      const qList = questions.map(q => {
        if (!shuffleOptions || q.options.length <= 1) return q;
        
        // Deep clone question and options
        const clonedQ = { ...q, options: q.options.map(o => ({ ...o })) };
        
        // Original keys (e.g. ['A', 'B', 'C', 'D'])
        const originalKeys = clonedQ.options.map(o => o.key);
        
        // Shuffle the options using Fisher-Yates algorithm
        for (let i = clonedQ.options.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [clonedQ.options[i], clonedQ.options[j]] = [clonedQ.options[j], clonedQ.options[i]];
        }
        
        // Re-assign keys vertically and update answer references
        const oldToNewKeyMap: Record<string, string> = {};
        
        clonedQ.options.forEach((opt, index) => {
          const newKey = originalKeys[index];
          oldToNewKeyMap[opt.key] = newKey;
          opt.key = newKey; // Assign the new key (A, B, C, D) to the shuffled option
        });
        
        // Update correct answer mapping
        if (clonedQ.answer && oldToNewKeyMap[clonedQ.answer]) {
          clonedQ.answer = oldToNewKeyMap[clonedQ.answer];
        }
        
        if (clonedQ.answerKeys) {
          clonedQ.answerKeys = clonedQ.answerKeys.map(k => oldToNewKeyMap[k] || k);
        }
        
        return clonedQ;
      });

      setLearningQueue(qList);
      setCurrentIndex(0);
      setIsFinished(false);
      setStats({ correct: 0, incorrect: 0 });
    }
  }, [questions, shuffleOptions]);

  const currentQuestion = learningQueue[currentIndex];

  const answerQuestion = useCallback((selectedKey: string) => {
    if (!currentQuestion) return false;

    const isCorrect = currentQuestion.answer === selectedKey || 
                      (currentQuestion.answerKeys && currentQuestion.answerKeys.includes(selectedKey));

    if (isCorrect) {
      setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setStats(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
      
      // Chèn lại câu hỏi sai vào vị trí sau đó vài câu (ví dụ cách 3 câu)
      setLearningQueue(prev => {
        const newQueue = [...prev];
        // Nếu danh sách còn lại ít hơn 3 câu thì nhét vào cuối cùng
        const insertIndex = Math.min(currentIndex + 4, newQueue.length);
        newQueue.splice(insertIndex, 0, currentQuestion);
        return newQueue;
      });
    }

    return isCorrect;
  }, [currentQuestion, currentIndex]);

  const nextQuestion = useCallback(() => {
    if (currentIndex < learningQueue.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
    }
  }, [currentIndex, learningQueue.length]);

  return {
    currentQuestion,
    isFinished,
    stats,
    answerQuestion,
    nextQuestion,
    totalCurrentRound: learningQueue.length,
    currentRoundIndex: currentIndex,
    remainingToLearn: learningQueue.length - currentIndex
  };
}
