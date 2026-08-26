import { useState, useMemo, useEffect } from 'react';
import { useActiveQuestions } from '../hooks/useActiveQuestions';
import { Flashcard3D } from './Flashcard3D';
import { StudySetup, type StudySettings } from './StudySetup';
import { RefreshCw } from 'lucide-react';

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
      <div className="text-center mt-20 text-text-muted">
        Không có câu hỏi nào. Vui lòng import bộ đề mới.
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
      <div className="text-center mt-20 text-text-muted">
        Không có câu hỏi nào trong phạm vi đã chọn.
        <button onClick={() => setSettings(null)} className="block mx-auto mt-4 text-primary hover:underline">
          Quay lại thiết lập
        </button>
      </div>
    );
  }

  const activeQuestion = sessionQuestions[flashIndex];

  const isFinished = flashIndex === sessionQuestions.length - 1;

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col items-center">
      {/* Progress */}
      <div className="mb-6 flex w-full items-center justify-between gap-3 sm:mb-8">
        <span className="badge badge-primary shrink-0">{flashIndex + 1} / {sessionQuestions.length}</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((flashIndex + 1) / sessionQuestions.length) * 100}%` }}
          />
        </div>
        <button 
          onClick={() => setSettings(null)}
          className="btn btn-ghost shrink-0 px-3"
          title="Thiết lập lại"
        >
          <RefreshCw size={18} />
          <span className="hidden sm:inline">Thiết lập lại</span>
        </button>
      </div>

      {/* Card */}
      {activeQuestion && <Flashcard3D question={activeQuestion} index={flashIndex} />}
      
      {/* Controls */}
      <div className="mt-10 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
        <button 
          onClick={handlePrev}
          disabled={flashIndex === 0}
          className="btn btn-secondary px-6 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Câu trước <span className="text-text-muted text-sm font-normal">(←)</span>
        </button>
        {isFinished ? (
          <button 
            onClick={() => setSettings(null)}
            className="btn bg-emerald-600 px-6 text-white shadow-[0_8px_18px_rgba(5,150,105,0.18)] hover:bg-emerald-700"
          >
            Hoàn thành
          </button>
        ) : (
          <button 
            onClick={handleNext}
            className="btn btn-primary px-6"
          >
            Câu tiếp <span className="text-sm font-normal text-white/75">(→)</span>
          </button>
        )}
      </div>
    </div>
  );
}
