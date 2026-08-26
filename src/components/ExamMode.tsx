import { useState, useEffect } from 'react';
import type { Question } from '../store';
import { useActiveQuestions } from '../hooks/useActiveQuestions';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
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
      <div className="text-center mt-20 text-text-muted">
        Không có câu hỏi nào. Vui lòng import bộ đề mới.
      </div>
    );
  }

  if (examState === 'setup') {
    return (
      <div className="elevated-card mx-auto mt-8 w-full max-w-xl p-5 sm:p-8">
        <h2 className="mb-6 flex items-center gap-3 text-2xl font-bold leading-tight text-text">
          Thiết lập bài kiểm tra
        </h2>
        
        <div className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-semibold text-text-secondary">
              Số lượng câu hỏi (tối đa {maxQuestions})
            </label>
            <input 
              type="number" 
              min="1" 
              max={maxQuestions}
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="input px-4 py-3"
            />
          </div>
          
          <div>
            <label className="mb-2 block text-sm font-semibold text-text-secondary">
              Thời gian làm bài (Phút)
            </label>
            <input 
              type="number" 
              min="1" 
              max="180"
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
              className="input px-4 py-3"
            />
          </div>
          
          <button 
            onClick={startExam}
            className="btn btn-primary mt-4 w-full py-4 text-base"
          >
            Bắt đầu làm bài
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
      <div className="mx-auto w-full max-w-3xl space-y-8 pb-12">
        <div className="elevated-card p-6 text-center sm:p-8">
          <h2 className="mb-2 text-3xl font-bold leading-tight">Kết quả bài thi</h2>
          <p className="mb-8 text-text-secondary">Thời gian hoàn thành: {m} phút {s} giây</p>
          
          <div className="mb-8 flex items-center justify-center gap-8 sm:gap-12">
            <div>
              <div className="mb-2 text-5xl font-bold text-primary">{score}/{examQuestions.length}</div>
              <div className="font-medium text-text-muted">Câu đúng</div>
            </div>
            <div className="h-20 w-px bg-border"></div>
            <div>
                <div className={`mb-2 text-5xl font-bold ${percent >= 80 ? 'text-emerald-600 dark:text-emerald-400' : percent >= 50 ? 'text-orange-500 dark:text-orange-400' : 'text-red-500 dark:text-red-400'}`}>
                {percent}%
              </div>
              <div className="font-medium text-text-muted">Độ chính xác</div>
            </div>
          </div>
          
          <button 
            onClick={() => setExamState('setup')}
            className="btn btn-secondary px-8 py-3"
          >
            Làm bài mới
          </button>
        </div>
        
        <div className="space-y-6">
          <h3 className="text-xl font-bold">Chi tiết đáp án</h3>
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
                <div key={q.id} className={`rounded-2xl border p-5 sm:p-6 ${isCorrect ? 'border-emerald-200 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/30' : 'border-red-200 bg-red-50/30 dark:border-red-800 dark:bg-red-950/30'}`}>
                <div className="flex gap-4">
                  <div className="mt-1">
                    {isCorrect ? <CheckCircle2 className="text-emerald-600" /> : <XCircle className="text-red-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold mb-4">Câu {idx + 1}: {q.question}</p>
                    
                    {q.imageDataUrl && (
                      <div className="mb-4">
                        <QuestionImage src={q.imageDataUrl} compact />
                      </div>
                    )}
                    <div className="space-y-2 mb-4">
                      {q.options.map(opt => {
                        const isThisSelected = selected.includes(opt.key);
                        const isThisCorrect = correctKeys.includes(opt.key);
                        
                        let optClass = "p-3 rounded-lg border text-sm ";
                        if (isThisCorrect) {
                            optClass += "bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold dark:bg-emerald-950/60 dark:border-emerald-700 dark:text-emerald-100";
                        } else if (isThisSelected && !isThisCorrect) {
                          optClass += "bg-red-100 border-red-300 text-red-900 dark:bg-red-950/60 dark:border-red-700 dark:text-red-100";
                        } else {
                          optClass += "bg-surface border-border opacity-60";
                        }
                        
                        return (
                          <div key={opt.key} className={optClass}>
                            <strong>{opt.key}.</strong> {opt.text}
                          </div>
                        );
                      })}
                    </div>
                    
                    {!isCorrect && (
                      <div className="bg-surface-2 p-3 rounded-lg border border-border text-sm">
                        <span className="font-semibold text-text-muted">Đáp án đúng:</span> {correctAnswerText}
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
    <div className="relative mx-auto w-full max-w-3xl pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 mb-8 flex items-center justify-between gap-3 border-b border-border bg-background/88 py-4 backdrop-blur-md">
        <div className="font-semibold text-text-muted">
          Đã làm: <span className="text-primary font-bold">{answeredCount}/{examQuestions.length}</span>
        </div>
        <div className={`flex items-center gap-2 font-bold text-lg ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-text'}`}>
          <Clock size={20} />
          {m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}
        </div>
        <button 
          onClick={() => {
            if (confirm('Bạn có chắc chắn muốn nộp bài?')) handleSubmit();
          }}
          className="btn btn-primary px-5 py-2"
        >
          Nộp bài
        </button>
      </div>
      
      {/* Questions List */}
      <div className="space-y-8">
        {examQuestions.map((q, idx) => {
          const correctKeys = getQuestionAnswerKeys(q);
          const isMultiple = correctKeys.length > 1;
          const selectedKeys = answers[q.id] ?? [];

          return (
          <div key={q.id} className="elevated-card p-5 sm:p-8">
            <h3 className="mb-6 text-xl font-bold leading-relaxed text-text">
              Câu {idx + 1}: <span className="font-normal">{q.question}</span>
            </h3>
            {q.imageDataUrl && (
              <div className="mb-6">
                <QuestionImage src={q.imageDataUrl} />
              </div>
            )}
            {isMultiple && (
              <p className="badge badge-primary mb-4">
                Chọn {correctKeys.length} đáp án
              </p>
            )}
            <div className="space-y-3">
              {q.options.map((opt) => {
                const isSelected = selectedKeys.includes(opt.key);
                return (
                  <label 
                    key={opt.key}
                    className={`choice-card flex cursor-pointer items-center gap-4 p-4 ${isSelected ? 'border-primary bg-primary-subtle text-primary' : 'text-text'}`}
                  >
                    <input 
                      type={isMultiple ? 'checkbox' : 'radio'}
                      name={`q-${q.id}`} 
                      value={opt.key}
                      checked={isSelected}
                      onChange={() => setAnswers((previous) => {
                        if (!isMultiple) {
                          return { ...previous, [q.id]: [opt.key] };
                        }
                        const current = previous[q.id] ?? [];
                        const next = current.includes(opt.key)
                          ? current.filter((key) => key !== opt.key)
                          : [...current, opt.key];
                        return { ...previous, [q.id]: next };
                      })}
                      className="h-5 w-5 accent-primary focus:ring-primary"
                    />
                    <div className="flex-1 text-base">
                      <strong className="mr-2 text-primary">{opt.key}.</strong>
                      {opt.text}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
