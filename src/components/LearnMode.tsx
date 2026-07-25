import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLearnSession } from '../hooks/useLearnSession';
import { useActiveQuestions } from '../hooks/useActiveQuestions';
import { StudySetup } from './StudySetup';
import { CheckCircle2, XCircle, GraduationCap, RefreshCw } from 'lucide-react';
import { playSound } from '../lib/sound';

export function LearnMode() {
  const activeQuestions = useActiveQuestions();
  const [settings, setSettings] = useState<{start: number, end: number, shuffle: boolean} | null>(null);

  // Derive the session questions based on settings
  const sessionQuestions = useMemo(() => {
    if (!settings) return [];
    let q = activeQuestions.slice(settings.start - 1, settings.end);
    if (settings.shuffle) {
      const newArr = [...q];
      for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
      }
      q = newArr;
    }
    return q;
  }, [activeQuestions, settings]);

  const session = useLearnSession(sessionQuestions);
  
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Reset state when question changes
  useEffect(() => {
    setSelectedKey(null);
    setIsAnswered(false);
    setIsCorrect(false);
  }, [session.currentQuestion]);

  useEffect(() => {
    if (session.isFinished) {
      playSound('complete');
    }
  }, [session.isFinished]);

  if (activeQuestions.length === 0) {
    return (
      <div className="text-center mt-20 text-text-muted">
        Không có câu hỏi nào. Vui lòng import bộ đề mới.
      </div>
    );
  }

  if (!settings) {
    return (
      <StudySetup 
        totalQuestions={activeQuestions.length} 
        onStart={setSettings} 
        title="Thiết lập Học"
      />
    );
  }

  if (sessionQuestions.length === 0) {
    return (
      <div className="text-center mt-20 text-text-muted">
        Không có câu hỏi nào trong phạm vi đã chọn.
        <button onClick={() => setSettings(null)} className="block mx-auto mt-4 text-primary hover:underline">
          Quay lại thiết lập
        </button>
      </div>
    );
  }

  if (session.isFinished) {
    return (
      <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center space-y-6">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
          <GraduationCap size={48} />
        </div>
        <h2 className="text-3xl font-bold text-text">Bạn đã học xong!</h2>
        <p className="text-text-muted text-lg">Bạn đã hoàn thành tất cả các câu hỏi trong bộ đề này.</p>
        
        <div className="w-full bg-surface p-6 rounded-2xl border border-border flex justify-around">
          <div>
            <p className="text-sm text-text-muted">Đúng ngay lần đầu</p>
            <p className="text-2xl font-bold text-green-600">{session.stats.correct}</p>
          </div>
          <div>
            <p className="text-sm text-text-muted">Cần học lại</p>
            <p className="text-2xl font-bold text-orange-500">{session.stats.incorrect}</p>
          </div>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => setSettings(null)}
            className="px-6 py-3 rounded-xl font-medium bg-surface border border-border hover:bg-surface-2 transition-all"
          >
            Thiết lập lại
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl font-medium bg-primary text-white hover:bg-primary-hover transition-all shadow-lg shadow-primary/25"
          >
            Quay lại trang chủ
          </button>
        </div>
      </div>
    );
  }

  const { currentQuestion } = session;
  if (!currentQuestion) return null;

  const handleSelect = (key: string) => {
    if (isAnswered) return;
    
    setSelectedKey(key);
    const correct = session.answerQuestion(key);
    setIsCorrect(Boolean(correct));
    setIsAnswered(true);
    
    if (correct) {
      playSound('correct');
    } else {
      playSound('incorrect');
    }
  };

  const correctAnswerText = currentQuestion.options.find(o => o.key === currentQuestion.answer)?.text || currentQuestion.answer;

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col h-full py-6">
      {/* Progress Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-primary">Học tập</span>
          <span className="text-sm text-text-muted">Còn {session.remainingToLearn} câu</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <div className="flex items-center gap-1 text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
              <CheckCircle2 size={16} /> {session.stats.correct}
            </div>
            <div className="flex items-center gap-1 text-sm font-medium text-orange-500 bg-orange-50 px-3 py-1 rounded-full">
              <XCircle size={16} /> {session.stats.incorrect}
            </div>
          </div>
          <button 
            onClick={() => setSettings(null)}
            className="p-2 text-text-muted hover:text-primary transition-colors flex items-center gap-2 text-sm"
            title="Thiết lập lại"
          >
            <RefreshCw size={18} />
            <span className="hidden sm:inline">Thiết lập lại</span>
          </button>
        </div>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={currentQuestion.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="flex-1 flex flex-col"
        >
          <div className="bg-surface border border-border rounded-2xl p-8 shadow-sm mb-6">
            <h3 className="text-2xl font-bold text-text leading-relaxed">
              {currentQuestion.question}
            </h3>
          </div>

          <div className="space-y-3">
            {currentQuestion.options.map((opt) => {
              const isSelected = selectedKey === opt.key;
              const isActuallyCorrect = currentQuestion.answer === opt.key || (currentQuestion.answerKeys && currentQuestion.answerKeys.includes(opt.key));
              
              let btnClass = "w-full text-left p-5 rounded-xl border-2 transition-all font-medium text-lg flex items-start gap-4 ";
              
              if (!isAnswered) {
                btnClass += "border-border bg-surface hover:border-primary hover:bg-primary/5";
              } else {
                if (isActuallyCorrect) {
                  btnClass += "border-green-500 bg-green-50 text-green-900";
                } else if (isSelected && !isActuallyCorrect) {
                  btnClass += "border-red-500 bg-red-50 text-red-900";
                } else {
                  btnClass += "border-border bg-surface opacity-50";
                }
              }

              return (
                <motion.button
                  key={opt.key}
                  whileHover={!isAnswered ? { scale: 1.01 } : {}}
                  whileTap={!isAnswered ? { scale: 0.98 } : {}}
                  animate={isSelected && !isCorrect ? { x: [-10, 10, -10, 10, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  onClick={() => handleSelect(opt.key)}
                  disabled={isAnswered}
                  className={btnClass}
                >
                  <span className={`font-bold ${isAnswered && isActuallyCorrect ? 'text-green-600' : 'text-primary'}`}>
                    {opt.key}.
                  </span>
                  <span>{opt.text}</span>
                  
                  {isAnswered && isActuallyCorrect && (
                    <CheckCircle2 className="ml-auto text-green-500 flex-shrink-0" />
                  )}
                  {isAnswered && isSelected && !isActuallyCorrect && (
                    <XCircle className="ml-auto text-red-500 flex-shrink-0" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {isAnswered && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 pt-6 border-t border-border"
            >
              {!isCorrect && (
                <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
                  <p className="font-semibold text-orange-800 mb-1">Đáp án đúng là:</p>
                  <p className="text-orange-900">{currentQuestion.answer}. {correctAnswerText}</p>
                </div>
              )}
              <button 
                onClick={session.nextQuestion}
                className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-colors shadow-lg shadow-primary/25 text-lg"
              >
                Tiếp tục
              </button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
