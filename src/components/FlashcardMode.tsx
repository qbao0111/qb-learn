import { useState, useMemo } from 'react';
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

  const handlePrev = () => {
    setFlashIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setFlashIndex((prev) => Math.min(sessionQuestions.length - 1, prev + 1));
  };

  const isFinished = flashIndex === sessionQuestions.length - 1;

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center h-full">
      {/* Progress */}
      <div className="w-full flex items-center justify-between mb-8">
        <span className="font-semibold text-primary">{flashIndex + 1} / {sessionQuestions.length}</span>
        <div className="flex-1 mx-6 h-2 bg-surface-2 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((flashIndex + 1) / sessionQuestions.length) * 100}%` }}
          />
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

      {/* Card */}
      {activeQuestion && <Flashcard3D question={activeQuestion} index={flashIndex} />}
      
      {/* Controls */}
      <div className="flex items-center gap-6 mt-12">
        <button 
          onClick={handlePrev}
          disabled={flashIndex === 0}
          className="px-6 py-3 rounded-xl font-medium bg-surface border border-border hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Câu trước
        </button>
        {isFinished ? (
          <button 
            onClick={() => setSettings(null)}
            className="px-6 py-3 rounded-xl font-medium bg-green-600 text-white hover:bg-green-700 transition-all shadow-lg shadow-green-600/25"
          >
            Hoàn thành
          </button>
        ) : (
          <button 
            onClick={handleNext}
            className="px-6 py-3 rounded-xl font-medium bg-primary text-white hover:bg-primary-hover transition-all shadow-lg shadow-primary/25"
          >
            Câu tiếp
          </button>
        )}
      </div>
    </div>
  );
}
