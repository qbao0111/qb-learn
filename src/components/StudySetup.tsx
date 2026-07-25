import { useState } from 'react';
import { Settings2, Shuffle, ArrowRight } from 'lucide-react';

export interface StudySettings {
  start: number;
  end: number;
  shuffle: boolean;
}

interface StudySetupProps {
  totalQuestions: number;
  onStart: (settings: StudySettings) => void;
  title: string;
}

export function StudySetup({ totalQuestions, onStart, title }: StudySetupProps) {
  const [start, setStart] = useState<number>(1);
  const [end, setEnd] = useState<number>(totalQuestions);
  const [shuffle, setShuffle] = useState<boolean>(false);

  const handleStart = () => {
    // Validate range
    let validStart = Math.max(1, Math.min(start, totalQuestions));
    let validEnd = Math.max(validStart, Math.min(end, totalQuestions));
    onStart({ start: validStart, end: validEnd, shuffle });
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full max-w-lg mx-auto p-4">
      <div className="bg-surface border border-border rounded-2xl p-8 w-full shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Settings2 size={24} />
          </div>
          <h2 className="text-2xl font-bold text-text">{title}</h2>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-muted">Phạm vi câu hỏi (Tổng số: {totalQuestions})</label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <span className="text-xs text-text-muted mb-1 block">Từ câu:</span>
                <input
                  type="number"
                  min={1}
                  max={totalQuestions}
                  value={start}
                  onChange={(e) => setStart(Number(e.target.value) || 1)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
              <div className="flex-1">
                <span className="text-xs text-text-muted mb-1 block">Đến câu:</span>
                <input
                  type="number"
                  min={1}
                  max={totalQuestions}
                  value={end}
                  onChange={(e) => setEnd(Number(e.target.value) || totalQuestions)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <label className="flex items-center justify-between p-4 bg-background border border-border rounded-xl cursor-pointer hover:bg-surface-2 transition-colors">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${shuffle ? 'bg-primary text-white' : 'bg-surface-2 text-text-muted'}`}>
                <Shuffle size={18} />
              </div>
              <span className="font-medium text-text">Đảo vị trí câu hỏi</span>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={shuffle}
                onChange={(e) => setShuffle(e.target.checked)}
                className="sr-only"
              />
              <div className={`block w-14 h-8 rounded-full transition-colors ${shuffle ? 'bg-primary' : 'bg-surface-2'}`}></div>
              <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${shuffle ? 'transform translate-x-6' : ''}`}></div>
            </div>
          </label>

          <button
            onClick={handleStart}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/25"
          >
            <span>Bắt đầu</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
