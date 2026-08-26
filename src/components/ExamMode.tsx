import { useState, useEffect } from 'react';
import type { Question } from '../store';
import { useActiveQuestions } from '../hooks/useActiveQuestions';
import { CheckCircle2, XCircle, Clock, ListChecks, ArrowRight, RotateCcw, Award } from 'lucide-react';
import { playSound } from '../lib/sound';
import { areAnswerSetsEqual, getQuestionAnswerKeys } from '../lib/answer-utils';
import { QuestionImage } from './QuestionImage';

export function ExamMode() {
  const activeQuestions = useActiveQuestions();
  
  const [examState, setExamState] = useState<'setup' | 'running' | 'result'>('setup');
  const [numQuestions, setNumQuestions] = useState(20);
  
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string[]>>({});
  
  // Timer state
  const [timeLimit, setTimeLimit] = useState(30); // minutes
  const [timeLeft, setTimeLeft] = useState(0); // seconds
  const [timeSpent, setTimeSpent] = useState(0);

  // Setup options
  const maxQuestions = activeQuestions.length;

  useEffect(() => {
    let timer: any;
    if (examState === 'running' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setTimeSpent(timeLimit * 60);
            setExamState('result');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [examState, timeLeft, timeLimit]);

  const startExam = () => {
    const qCount = Math.min(numQuestions, maxQuestions);
    const shuffled = [...activeQuestions].sort(() => Math.random() - 0.5).slice(0, qCount);
    
    setExamQuestions(shuffled);
    setAnswers({});
    setTimeLeft(timeLimit * 60);
    setExamState('running');
  };

  const handleSelectOption = (questionId: number, optionKey: string, isMultiple: boolean) => {
    setAnswers(prev => {
      const current = prev[questionId] || [];
      if (!isMultiple) {
        return { ...prev, [questionId]: [optionKey] };
      }
      const next = current.includes(optionKey)
        ? current.filter(k => k !== optionKey)
        : [...current, optionKey];
      return { ...prev, [questionId]: next };
    });
  };

  const handleSubmit = () => {
    if (examState !== 'running') return;
    
    // Calculate time spent
    const totalSeconds = timeLimit * 60;
    setTimeSpent(totalSeconds - Math.max(0, timeLeft));
    setExamState('result');
    playSound('complete');
  };

  const calculateScore = () => {
    let correct = 0;
    examQuestions.forEach(q => {
      const selected = answers[q.id] ?? [];
      if (areAnswerSetsEqual(selected, getQuestionAnswerKeys(q))) {
        correct++;
      }
    });
    return correct;
  };

  if (activeQuestions.length === 0) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center text-center p-6">
        <p className="text-base font-semibold text-text-muted">Không có câu hỏi nào trong bộ đề.</p>
        <p className="mt-1 text-xs text-text-secondary">Vui lòng tạo hoặc nhập bộ đề mới ở Trang chủ.</p>
      </div>
    );
  }

  if (examState === 'setup') {
    return (
      <div className="elevated-card mx-auto mt-6 w-full max-w-xl p-6 sm:p-7 rounded-2xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ListChecks size={22} />
          </div>
          <div>
            <h2 className="text-xl font-bold leading-tight text-text">
              Thiết lập bài kiểm tra
            </h2>
            <p className="text-xs text-text-muted">Kiểm tra kiến thức trắc nghiệm với thời gian bấm giờ.</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-text">
                Số lượng câu hỏi
              </label>
              <span className="text-xs font-semibold text-primary">Tối đa {maxQuestions} câu</span>
            </div>
            <input 
              type="number" 
              min="1" 
              max={maxQuestions}
              value={numQuestions}
              onChange={(e) => setNumQuestions(Math.min(maxQuestions, Math.max(1, Number(e.target.value))))}
              className="input px-3.5 py-2 text-sm bg-surface"
            />
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-text">
                Thời gian làm bài (phút)
              </label>
              <span className="text-xs text-text-muted">1 - 180 phút</span>
            </div>
            <input 
              type="number" 
              min="1" 
              max="180"
              value={timeLimit}
              onChange={(e) => setTimeLimit(Math.max(1, Number(e.target.value)))}
              className="input px-3.5 py-2 text-sm bg-surface"
            />
          </div>
          
          <button 
            onClick={startExam}
            className="btn btn-primary mt-3 w-full py-2.5 text-sm font-semibold shadow-md shadow-primary/25"
          >
            <span>Bắt đầu làm bài</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  if (examState === 'result') {
    const score = calculateScore();
    const percent = Math.round((score / examQuestions.length) * 100);
    const m = Math.floor(timeSpent / 60);
    const s = timeSpent % 60;

    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 pb-16">
        <div className="elevated-card p-6 text-center sm:p-7 rounded-2xl">
          <div className="mx-auto mb-3.5 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-indigo-500 text-white shadow-md shadow-primary/25">
            <Award size={32} />
          </div>
          <h2 className="mb-1 text-xl sm:text-2xl font-bold text-text">Kết quả bài thi</h2>
          <p className="mb-6 text-xs text-text-secondary">Thời gian hoàn thành: {m} phút {s} giây</p>
          
          <div className="mb-7 flex items-center justify-center gap-4 sm:gap-8">
            <div className="rounded-2xl bg-surface-2 p-3.5 min-w-[110px]">
              <div className="mb-0.5 text-2xl sm:text-3xl font-bold text-primary">{score}/{examQuestions.length}</div>
              <div className="text-xs font-medium text-text-muted">Câu đúng</div>
            </div>
            <div className="rounded-2xl bg-surface-2 p-3.5 min-w-[110px]">
              <div className={`mb-0.5 text-2xl sm:text-3xl font-bold ${percent >= 80 ? 'text-emerald-600 dark:text-emerald-400' : percent >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                {percent}%
              </div>
              <div className="text-xs font-medium text-text-muted">Độ chính xác</div>
            </div>
          </div>
          
          <button 
            onClick={() => setExamState('setup')}
            className="btn btn-primary px-6 py-2 text-xs sm:text-sm font-semibold shadow-sm shadow-primary/25"
          >
            <RotateCcw size={15} />
            <span>Làm bài kiểm tra mới</span>
          </button>
        </div>
        
        <div className="space-y-3.5">
          <h3 className="text-lg font-bold text-text px-1">Chi tiết từng câu hỏi</h3>
          {examQuestions.map((q, idx) => {
            const selected = answers[q.id] ?? [];
            const correctKeys = getQuestionAnswerKeys(q);
            const isCorrect = areAnswerSetsEqual(selected, correctKeys);
            const correctAnswerText = correctKeys
              .map((key) => {
                const text = q.options.find((option) => option.key === key)?.text;
                return text ? `${key}. ${text}` : key;
              })
              .join(' · ');
            
            return (
              <div key={q.id} className={`rounded-xl border p-4 sm:p-5 transition-colors ${isCorrect ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/20' : 'border-rose-200 bg-rose-50/40 dark:border-rose-800 dark:bg-rose-950/20'}`}>
                <div className="flex gap-3">
                  <div className="mt-0.5 shrink-0">
                    {isCorrect ? (
                      <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={20} />
                    ) : (
                      <XCircle className="text-rose-500 dark:text-rose-400" size={20} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base text-text mb-2.5">Câu {idx + 1}: {q.question}</p>
                    
                    {q.imageDataUrl && (
                      <div className="mb-3 max-h-40">
                        <QuestionImage src={q.imageDataUrl} compact />
                      </div>
                    )}

                    <div className="space-y-1.5 mb-2.5">
                      {q.options.map(opt => {
                        const isThisSelected = selected.includes(opt.key);
                        const isThisCorrect = correctKeys.includes(opt.key);
                        
                        let optClass = "p-2.5 rounded-lg border text-xs sm:text-sm flex items-center gap-2 ";
                        if (isThisCorrect) {
                          optClass += "bg-emerald-100/70 border-emerald-300 text-emerald-950 font-medium dark:bg-emerald-950/60 dark:border-emerald-700 dark:text-emerald-100";
                        } else if (isThisSelected && !isThisCorrect) {
                          optClass += "bg-rose-100/70 border-rose-300 text-rose-950 font-medium dark:bg-rose-950/60 dark:border-rose-700 dark:text-rose-100";
                        } else {
                          optClass += "bg-surface border-border opacity-60 text-text-secondary";
                        }
                        
                        return (
                          <div key={opt.key} className={optClass}>
                            <span className="font-semibold text-xs shrink-0">{opt.key}.</span>
                            <span className="font-normal">{opt.text}</span>
                          </div>
                        );
                      })}
                    </div>
                    
                    {!isCorrect && (
                      <div className="bg-surface p-2.5 rounded-lg border border-border text-xs text-text-secondary">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 mr-1">Đáp án đúng:</span> {correctAnswerText}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Running state
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  const answeredCount = Object.values(answers).filter((keys) => keys.length > 0).length;

  return (
    <div className="relative mx-auto w-full max-w-3xl pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 mb-5 flex items-center justify-between gap-3 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur-md rounded-xl shadow-xs">
        <div className="text-xs sm:text-sm font-medium text-text-muted">
          Đã làm: <span className="text-primary font-semibold text-xs sm:text-sm">{answeredCount}/{examQuestions.length}</span>
        </div>
        <div className={`flex items-center gap-1.5 font-bold text-sm sm:text-base ${timeLeft < 300 ? 'text-rose-500 animate-pulse' : 'text-text'}`}>
          <Clock size={17} />
          <span>{m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}</span>
        </div>
        <button 
          onClick={() => {
            if (confirm('Bạn có chắc chắn muốn nộp bài sớm?')) handleSubmit();
          }}
          className="btn btn-primary px-3.5 py-1.5 text-xs font-semibold shadow-xs"
        >
          Nộp bài
        </button>
      </div>

      {/* Questions list */}
      <div className="space-y-4">
        {examQuestions.map((q, idx) => {
          const selected = answers[q.id] || [];
          const correctKeys = getQuestionAnswerKeys(q);
          const isMultiple = correctKeys.length > 1;

          return (
            <div key={q.id} className="elevated-card p-4 sm:p-5 rounded-xl space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="badge badge-muted text-[11px] mb-1.5">
                    Câu {idx + 1}/{examQuestions.length} {isMultiple && '• Chọn nhiều đáp án'}
                  </span>
                  <h3 className="text-sm sm:text-base font-semibold text-text leading-relaxed">
                    {q.question}
                  </h3>
                </div>
              </div>

              {q.imageDataUrl && (
                <div className="max-h-40">
                  <QuestionImage src={q.imageDataUrl} compact />
                </div>
              )}

              <div className="space-y-2">
                {q.options.map((opt) => {
                  const isChecked = selected.includes(opt.key);
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => handleSelectOption(q.id, opt.key, isMultiple)}
                      className={`w-full text-left p-2.5 sm:p-3 rounded-xl border transition-all text-xs sm:text-sm font-normal flex items-center gap-2.5 ${
                        isChecked 
                          ? 'border-primary ring-2 ring-primary/20 bg-primary-subtle text-primary font-medium shadow-xs' 
                          : 'border-border bg-surface hover:border-primary/40 hover:bg-surface-hover text-text'
                      }`}
                    >
                      <span className={`size-6 rounded-md flex items-center justify-center font-semibold text-xs shrink-0 ${
                        isChecked ? 'bg-primary text-white' : 'bg-surface-2 border border-border text-text-muted'
                      }`}>
                        {opt.key}
                      </span>
                      <span className="flex-1 leading-relaxed break-words">{opt.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-7 flex justify-center">
        <button 
          onClick={() => {
            if (confirm('Bạn có chắc chắn muốn nộp bài?')) handleSubmit();
          }}
          className="btn btn-primary px-8 py-2.5 text-sm font-semibold shadow-md shadow-primary/25"
        >
          Nộp bài kiểm tra
        </button>
      </div>
    </div>
  );
}


