import { useState, useMemo, useEffect } from 'react';
import { useActiveQuestions } from '../hooks/useActiveQuestions';
import { Flashcard3D } from './Flashcard3D';
import { StudySetup, type StudySettings } from './StudySetup';
import { RefreshCw, ArrowLeft, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

// Helper to shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export function FlashcardMode() {
  const activeQuestions = useActiveQuestions();
  const [settings, setSettings] = useState<StudySettings | null>(null);
  const [flashIndex, setFlashIndex] = useState(0);

  // Derive the session questions based on settings
  const sessionQuestions = useMemo(() => {
    if (!settings) return [];
    let q = activeQuestions.slice(settings.start - 1, settings.end);
    if (settings.shuffle) {
      q = shuffleArray(q);
    }
    return q;
  }, [activeQuestions, settings]);

  const handlePrev = () => {
    setFlashIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setFlashIndex((prev) => Math.min(sessionQuestions.length - 1, prev + 1));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sessionQuestions.length]);

  if (activeQuestions.length === 0) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center text-center p-6">
        <p className="text-base font-semibold text-text-muted">Không có câu hỏi nào trong bộ đề.</p>
        <p className="mt-1 text-xs text-text-secondary">Vui lòng tạo hoặc nhập bộ đề mới ở Trang chủ.</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <StudySetup 
        totalQuestions={activeQuestions.length} 
        onStart={(s) => {
          setSettings(s);
          setFlashIndex(0);
        }} 
        title="Thiết lập Thẻ ghi nhớ"
        storageKey="flashcard_settings"
      />
    );
  }

  if (sessionQuestions.length === 0) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center text-center p-6">
        <p className="text-base font-semibold text-text-muted">Không có câu hỏi nào trong phạm vi đã chọn.</p>
        <button onClick={() => setSettings(null)} className="btn btn-primary mt-4 px-5">
          Quay lại thiết lập
        </button>
      </div>
    );
  }

  const activeQuestion = sessionQuestions[flashIndex];
  const isFinished = flashIndex === sessionQuestions.length - 1;
  const progressPct = ((flashIndex + 1) / sessionQuestions.length) * 100;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center pb-12">
      {/* Progress & Setup Header */}
      <div className="mb-4 flex w-full items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="badge badge-primary">
            <Sparkles size={13} /> Thẻ {flashIndex + 1} / {sessionQuestions.length}
          </span>
        </div>

        <div className="h-2 flex-1 max-w-md overflow-hidden rounded-full bg-surface-2 border border-border/50">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <button 
          onClick={() => setSettings(null)}
          className="btn btn-ghost min-h-9 px-2.5 text-xs text-text-muted hover:text-text"
          title="Thiết lập lại"
        >
          <RefreshCw size={14} />
          <span className="hidden sm:inline">Cài đặt</span>
        </button>
      </div>

      {/* 3D Flashcard */}
      {activeQuestion && <Flashcard3D question={activeQuestion} index={flashIndex} />}
      
      {/* Controls */}
      <div className="mt-6 flex w-full flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
        <button 
          onClick={handlePrev}
          disabled={flashIndex === 0}
          className="btn btn-secondary w-full px-6 py-3 sm:w-auto font-semibold"
        >
          <ArrowLeft size={16} />
          <span>Thẻ trước</span>
          <kbd className="hidden sm:inline text-xs opacity-60 font-mono">←</kbd>
        </button>

        <span className="text-xs font-medium text-text-muted hidden md:inline">
          Nhấn thẻ hoặc phím <kbd className="px-1.5 py-0.5 rounded bg-surface-2 border border-border text-[11px] font-mono">Space</kbd> để lật
        </span>

        {isFinished ? (
          <button 
            onClick={() => setSettings(null)}
            className="btn btn-primary w-full px-8 py-3 sm:w-auto font-bold bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white shadow-md shadow-emerald-600/25"
          >
            <CheckCircle2 size={18} />
            <span>Hoàn thành vòng học</span>
          </button>
        ) : (
          <button 
            onClick={handleNext}
            className="btn btn-primary w-full px-6 py-3 sm:w-auto font-bold shadow-md shadow-primary/25"
          >
            <span>Thẻ tiếp theo</span>
            <kbd className="hidden sm:inline text-xs opacity-75 font-mono text-white">→</kbd>
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

