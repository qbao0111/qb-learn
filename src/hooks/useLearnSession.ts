import { useState, useCallback, useEffect } from 'react';
import type { Question } from '../store';

export function useLearnSession(questions: Question[]) {
  const [learningQueue, setLearningQueue] = useState<Question[]>([]);
  const [incorrectQueue, setIncorrectQueue] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [stats, setStats] = useState({ correct: 0, incorrect: 0 });

  // Initialize session
  useEffect(() => {
    if (questions.length > 0) {
      setLearningQueue([...questions].sort(() => Math.random() - 0.5));
      setIncorrectQueue([]);
      setCurrentIndex(0);
      setIsFinished(false);
      setStats({ correct: 0, incorrect: 0 });
    }
  }, [questions]);

  const currentQuestion = learningQueue[currentIndex];

  const answerQuestion = useCallback((selectedKey: string) => {
    if (!currentQuestion) return false;

    const isCorrect = currentQuestion.answer === selectedKey || 
                      (currentQuestion.answerKeys && currentQuestion.answerKeys.includes(selectedKey));

    if (isCorrect) {
      setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setStats(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
      setIncorrectQueue(prev => [...prev, currentQuestion]);
    }

    return isCorrect;
  }, [currentQuestion]);

  const nextQuestion = useCallback(() => {
    if (currentIndex < learningQueue.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (incorrectQueue.length > 0) {
      // Start another round with incorrect questions
      setLearningQueue([...incorrectQueue].sort(() => Math.random() - 0.5));
      setIncorrectQueue([]);
      setCurrentIndex(0);
    } else {
      setIsFinished(true);
    }
  }, [currentIndex, learningQueue.length, incorrectQueue]);

  return {
    currentQuestion,
    isFinished,
    stats,
    answerQuestion,
    nextQuestion,
    totalCurrentRound: learningQueue.length,
    currentRoundIndex: currentIndex,
    remainingToLearn: learningQueue.length - currentIndex + incorrectQueue.length
  };
}
