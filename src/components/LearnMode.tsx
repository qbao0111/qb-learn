import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLearnSession } from '../hooks/useLearnSession';
import { useActiveQuestions } from '../hooks/useActiveQuestions';
import { StudySetup } from './StudySetup';
import { 
  CheckCircle2, 
  XCircle, 
  GraduationCap, 
  RefreshCw, 
  Volume2, 
  Star, 
  ArrowRight,
  Sparkles,
  Lightbulb,
  Check,
  X
} from 'lucide-react';
import { playSound } from '../lib/sound';
import { getQuestionAnswerKeys } from '../lib/answer-utils';
import { QuestionImage } from './QuestionImage';

export function LearnMode() {
  const activeQuestions = useActiveQuestions();
  const [settings, setSettings] = useState<{start: number, end: number, shuffle: boolean, shuffleOptions?: boolean} | null>(null);
  const [starredIds, setStarredIds] = useState<Set<number>>(new Set());

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

  const session = useLearnSession(sessionQuestions, settings?.shuffleOptions);
  
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  // Reset state & scroll when question changes
  useEffect(() => {
    setSelectedKeys([]);
    setIsAnswered(false);
    setIsCorrect(false);
    
    // Scroll container back to top
    if (containerRef.current) {
      const scrollableParent = containerRef.current.closest('.overflow-y-auto');
      if (scrollableParent) {
        scrollableParent.scrollTo({ top: 0, behavior: 'instant' });
      }
    }
  }, [session.currentQuestion]);

  // Auto scroll feedback into view when answered
  useEffect(() => {
    if (isAnswered && feedbackRef.current) {
      const timer = setTimeout(() => {
        feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isAnswered]);

  const { currentQuestion } = session;
  const correctKeys = useMemo(() => {
    return currentQuestion ? getQuestionAnswerKeys(currentQuestion) : [];
  }, [currentQuestion]);
  const isMultiple = correctKeys.length > 1;

  const submitAnswer = useCallback((keys: string[]) => {
    if (isAnswered || !currentQuestion) return;

    const correct = session.answerQuestion(keys);
    setIsCorrect(Boolean(correct));
    setIsAnswered(true);
    
    if (correct) {
      playSound('correct');
    } else {
      playSound('incorrect');
    }
  }, [isAnswered, currentQuestion, session]);

  const handleSelect = useCallback((key: string) => {
    if (isAnswered) return;
    if (!isMultiple) {
      setSelectedKeys([key]);
      submitAnswer([key]);
      return;
    }
    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter((selectedKey) => selectedKey !== key)
        : [...current, key],
    );
    playSound('select');
  }, [isAnswered, isMultiple, submitAnswer]);

  // TTS Speech Synthesis
  const speakQuestion = useCallback((text: string) => {
    if (!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const cleanStr = text.replace(/<[^>]*>/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanStr);
    utterance.rate = 1.0;
    utterance.lang = 'vi-VN';
    window.speechSynthesis.speak(utterance);
  }, []);

  // Toggle star
  const toggleStar = useCallback((id: number) => {
    setStarredIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        playSound('flip');
      } else {
        next.add(id);
        playSound('star');
      }
      return next;
    });
  }, []);

  // Keyboard shortcut listener (1-4, A-D, Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.code === 'Space' && isAnswered) {
        e.preventDefault();
        session.nextQuestion();
        return;
      }

      if (!isAnswered && currentQuestion && !isMultiple) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= currentQuestion.options.length) {
          e.preventDefault();
          const option = currentQuestion.options[num - 1];
          if (option) handleSelect(option.key);
          return;
        }

        const letter = e.key.toUpperCase();
        const option = currentQuestion.options.find(o => o.key.toUpperCase() === letter);
        if (option) {
          e.preventDefault();
          handleSelect(option.key);
          return;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAnswered, currentQuestion, isMultiple, handleSelect, session]);

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
        storageKey="learn_settings"
        showShuffleOptions={true}
      />
    );
  }

  if (sessionQuestions.length === 0) {
    return (
      <div className="text-center mt-20 text-text-muted">
        Không có câu hỏi nào trong phạm vi đã chọn.
        <button onClick={() => setSettings(null)} className="block mx-auto mt-4 text-primary hover:underline font-semibold">
          Quay lại thiết lập
        </button>
      </div>
    );
  }

  if (session.isFinished) {
    const totalAnswered = session.stats.correct + session.stats.incorrect;
    const accuracy = totalAnswered > 0 ? Math.round((session.stats.correct / totalAnswered) * 100) : 100;

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center max-w-xl mx-auto text-center py-12 px-6"
      >
        <div className="w-24 h-24 bg-gradient-to-tr from-emerald-500 to-teal-400 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-500/25 mb-6">
          <GraduationCap size={52} />
        </div>
        
        <h2 className="text-3xl font-extrabold text-text tracking-tight mb-2">
          Xuất sắc! Bạn đã học xong vòng này
        </h2>
        <p className="text-text-muted text-base max-w-md mb-8">
          Bạn đã ôn tập toàn bộ các câu hỏi trong mục tiêu đã chọn. Hãy duy trì thói quen mỗi ngày!
        </p>
        
        <div className="w-full bg-surface p-6 rounded-2xl border border-border shadow-sm grid grid-cols-3 gap-4 mb-8">
          <div className="p-3 rounded-xl bg-surface-2">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Đúng lần đầu</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{session.stats.correct}</p>
          </div>
          <div className="p-3 rounded-xl bg-surface-2">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Đã ôn lại</p>
            <p className="text-2xl font-black text-orange-500 dark:text-orange-400">{session.stats.incorrect}</p>
          </div>
          <div className="p-3 rounded-xl bg-surface-2">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Độ chính xác</p>
            <p className="text-2xl font-black text-primary">{accuracy}%</p>
          </div>
        </div>
        
        <div className="flex gap-4 w-full sm:w-auto">
          <button 
            onClick={() => setSettings(null)}
            className="flex-1 sm:flex-initial px-6 py-3.5 rounded-xl font-bold bg-surface border border-border hover:bg-surface-2 transition-all text-text shadow-sm"
          >
            Học phạm vi khác
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="flex-1 sm:flex-initial px-8 py-3.5 rounded-xl font-bold bg-primary text-white hover:bg-primary-hover transition-all shadow-lg shadow-primary/25"
          >
            Trang tổng quan
          </button>
        </div>
      </motion.div>
    );
  }

  if (!currentQuestion) return null;

  const totalQuestionsInSet = session.totalCurrentRound || sessionQuestions.length;
  const progressPercent = Math.min(100, Math.round(((session.currentRoundIndex) / totalQuestionsInSet) * 100));

  const isStarred = starredIds.has(currentQuestion.id);

  // Selected option text for comparison
  const selectedOptionObjects = currentQuestion.options.filter(o => selectedKeys.includes(o.key));
  const correctOptionObjects = currentQuestion.options.filter(o => correctKeys.includes(o.key));

  return (
    <div ref={containerRef} className="w-full max-w-3xl mx-auto flex flex-col py-1 px-1 sm:px-2 pb-16">
      {/* Quizlet Header & Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-primary/10 text-primary">
              <Sparkles size={13} /> Học thông minh
            </span>
            <span className="text-xs sm:text-sm font-semibold text-text-muted">
              Còn <strong className="text-text font-bold">{session.remainingToLearn}</strong> câu
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 shadow-xs dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                <Check size={13} className="stroke-[3]" /> {session.stats.correct}
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200/60 shadow-xs">
                <X size={13} className="stroke-[3]" /> {session.stats.incorrect}
              </div>
            </div>

            <button 
              onClick={() => setSettings(null)}
              className="p-1.5 text-text-muted hover:text-primary hover:bg-surface-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
              title="Thiết lập lại"
            >
              <RefreshCw size={14} />
              <span className="hidden sm:inline">Cài đặt</span>
            </button>
          </div>
        </div>

        {/* Continuous Animated Progress Bar */}
        <div className="w-full h-1.5 sm:h-2 rounded-full bg-surface-2 border border-border/60 overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Main Question Card (Quizlet Style) */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 25 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -25 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="flex-1 flex flex-col"
        >
          <div className="bg-surface border border-border/90 rounded-2xl p-4 sm:p-5 shadow-sm mb-3.5 relative">
            <div className="flex items-center justify-between gap-4 mb-2.5 pb-2 border-b border-border/50">
              <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
                Thuật ngữ #{currentQuestion.id}
              </span>
              
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => speakQuestion(currentQuestion.question)}
                  className="p-1.5 text-text-muted hover:text-primary hover:bg-surface-2 rounded-lg transition-colors"
                  title="Phát âm câu hỏi (TTS)"
                >
                  <Volume2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => toggleStar(currentQuestion.id)}
                  className={`p-1.5 rounded-lg transition-colors ${isStarred ? 'text-amber-500 bg-amber-50' : 'text-text-muted hover:text-amber-500 hover:bg-surface-2'}`}
                  title="Gắn sao câu hỏi này"
                >
                  <Star size={16} fill={isStarred ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>

            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-text leading-snug">
              {currentQuestion.question}
            </h3>

            {currentQuestion.imageDataUrl && (
              <div className="mt-3">
                <QuestionImage src={currentQuestion.imageDataUrl} />
              </div>
            )}
          </div>

          {/* Multiple choice guidance */}
          {isMultiple && !isAnswered && (
            <div className="mb-2.5 flex items-center gap-2 text-xs sm:text-sm font-semibold text-primary bg-primary/10 px-3 py-1 rounded-xl border border-primary/20 w-fit">
              <Lightbulb size={15} /> Chọn {correctKeys.length} đáp án đúng, sau đó nhấn Kiểm tra
            </div>
          )}

          {/* Options Grid (Quizlet Pro Style) */}
          <div className="space-y-2 sm:space-y-2.5">
            {currentQuestion.options.map((opt, index) => {
              const isSelected = selectedKeys.includes(opt.key);
              const isActuallyCorrect = correctKeys.includes(opt.key);
              const shortcutNumber = index + 1;
              
              let cardStyle = "w-full text-left p-3 sm:p-3.5 rounded-xl border-2 transition-all font-medium text-sm sm:text-base flex items-center justify-between gap-3 ";
              
              if (!isAnswered) {
                cardStyle += isSelected 
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-border bg-surface hover:border-primary/70 hover:bg-primary/5 text-text shadow-xs";
              } else {
                if (isActuallyCorrect) {
                  cardStyle += "border-emerald-500 bg-emerald-50/80 text-emerald-950 font-semibold shadow-xs dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-100";
                } else if (isSelected && !isActuallyCorrect) {
                  cardStyle += "border-rose-500 bg-rose-50/80 text-rose-950 font-semibold shadow-xs";
                } else {
                  cardStyle += "border-border bg-surface opacity-40 text-text-muted";
                }
              }

              return (
                <motion.button
                  key={opt.key}
                  whileHover={!isAnswered ? { scale: 1.006, y: -1 } : {}}
                  whileTap={!isAnswered ? { scale: 0.985 } : {}}
                  animate={isAnswered && isSelected && !isActuallyCorrect ? { x: [-5, 5, -4, 4, 0] } : {}}
                  transition={{ duration: 0.25 }}
                  onClick={() => handleSelect(opt.key)}
                  disabled={isAnswered}
                  className={cardStyle}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-bold text-xs sm:text-sm flex-shrink-0 transition-colors ${
                      isAnswered && isActuallyCorrect 
                        ? 'bg-emerald-500 text-white' 
                        : isAnswered && isSelected && !isActuallyCorrect
                        ? 'bg-rose-500 text-white'
                        : isSelected
                        ? 'bg-primary text-white'
                        : 'bg-surface-2 border border-border text-text-muted'
                    }`}>
                      {opt.key}
                    </span>
                    <span className="leading-snug break-words">{opt.text}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!isAnswered && (
                      <kbd className="hidden sm:inline-flex items-center justify-center min-w-[20px] h-[20px] px-1 rounded-md text-xs font-bold text-text-muted bg-surface-2 border border-border shadow-xs">
                        {shortcutNumber}
                      </kbd>
                    )}
                    {isAnswered && isActuallyCorrect && (
                      <CheckCircle2 className="text-emerald-600 flex-shrink-0" size={20} />
                    )}
                    {isAnswered && isSelected && !isActuallyCorrect && (
                      <XCircle className="text-rose-600 flex-shrink-0" size={20} />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Multiple choice confirm button */}
          {isMultiple && !isAnswered && (
            <button
              type="button"
              onClick={() => submitAnswer(selectedKeys)}
              disabled={selectedKeys.length === 0}
              className="mt-3 w-full rounded-xl bg-primary py-3 text-sm sm:text-base font-bold text-white shadow-md shadow-primary/25 transition-all hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              Kiểm tra đáp án ({selectedKeys.length}/{correctKeys.length})
            </button>
          )}

          {/* Quizlet Feedback & Comparison Section */}
          {isAnswered && (
            <motion.div 
              ref={feedbackRef}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 pt-3.5 border-t border-border"
            >
              {isCorrect ? (
                /* Correct Celebration Banner */
                <div className="p-3 sm:p-3.5 rounded-xl bg-emerald-50/90 border border-emerald-300 flex items-center justify-between gap-3 text-emerald-950 shadow-xs dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Check size={18} className="stroke-[3]" />
                    </div>
                    <div>
                      <strong className="block text-sm sm:text-base font-extrabold text-emerald-900 dark:text-emerald-100">Chính xác! Làm rất tốt.</strong>
                      <span className="text-xs sm:text-sm text-emerald-800 line-clamp-1 dark:text-emerald-300">
                        {correctOptionObjects.map(o => `${o.key}. ${o.text}`).join(' · ')}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={session.nextQuestion}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center gap-1.5 flex-shrink-0 shadow-xs"
                  >
                    <span>Tiếp tục</span>
                    <span className="text-white/75 text-[11px] font-normal">(Space)</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                /* Quizlet Learning Comparison Box (Don't worry, you are learning) */
                <div className="space-y-3.5">
                  <div className="rounded-2xl bg-surface border border-border shadow-sm overflow-hidden">
                    <div className="bg-rose-50/80 px-4 py-2.5 border-b border-rose-200/70 flex items-center gap-2 text-rose-900 font-bold text-xs sm:text-sm">
                      <Lightbulb size={16} className="text-rose-600" />
                      Đừng lo lắng, hãy cùng ghi nhớ đáp án đúng:
                    </div>

                    <div className="p-3.5 sm:p-4 space-y-2.5">
                      {/* Wrong selection */}
                      {selectedOptionObjects.length > 0 && (
                        <div className="p-2.5 sm:p-3 rounded-xl bg-rose-50/60 border border-rose-200">
                          <span className="block text-xs font-bold text-rose-700 uppercase tracking-wider mb-0.5">
                            ❌ Bạn đã chọn:
                          </span>
                          <p className="text-xs sm:text-sm font-semibold text-rose-950">
                            {selectedOptionObjects.map(o => `${o.key}. ${o.text}`).join(' · ')}
                          </p>
                        </div>
                      )}

                      {/* Correct answer */}
                      <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-50/80 border border-emerald-300 dark:border-emerald-800 dark:bg-emerald-950/60">
                        <span className="block text-xs font-bold text-emerald-700 uppercase tracking-wider mb-0.5 dark:text-emerald-300">
                          ✅ Đáp án đúng:
                        </span>
                        <p className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-100">
                          {correctOptionObjects.map(o => `${o.key}. ${o.text}`).join(' · ')}
                        </p>
                        {currentQuestion.answer && (
                          <p className="mt-1 text-xs text-emerald-800 font-medium border-t border-emerald-200/80 pt-1 dark:border-emerald-800 dark:text-emerald-300">
                            Ghi chú: {currentQuestion.answer}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button 
                    onClick={session.nextQuestion}
                    className="w-full py-3 sm:py-3.5 bg-primary text-white font-extrabold rounded-xl hover:bg-primary-hover transition-all shadow-md shadow-primary/25 text-sm sm:text-base flex items-center justify-center gap-2 group"
                  >
                    <span>Tiếp tục</span>
                    <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    <span className="text-white/75 text-xs font-normal ml-1">(Phím Space)</span>
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
