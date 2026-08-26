import { useState } from 'react';
import { Settings2, Shuffle, ArrowRight } from 'lucide-react';

export interface StudySettings {
  start: number;
  end: number;
  shuffle: boolean;
  shuffleOptions?: boolean;
}

interface StudySetupProps {
  totalQuestions: number;
  onStart: (settings: StudySettings) => void;
  title: string;
  storageKey?: string;
  showShuffleOptions?: boolean;
}

export function StudySetup({ totalQuestions, onStart, title, storageKey, showShuffleOptions }: StudySetupProps) {
  // Load initial settings from localStorage
  const initialSettings = storageKey ? JSON.parse(localStorage.getItem(storageKey) || '{}') : {};
  
  const [start, setStart] = useState<string>(initialSettings.start?.toString() || '1');
  const [end, setEnd] = useState<string>(initialSettings.end?.toString() || totalQuestions.toString());
  const [shuffle, setShuffle] = useState<boolean>(initialSettings.shuffle || false);
  const [shuffleOptions, setShuffleOptions] = useState<boolean>(initialSettings.shuffleOptions || false);

  const handleStart = () => {
    // Validate range
    let s = parseInt(start, 10);
    let e = parseInt(end, 10);
    
    if (isNaN(s)) s = 1;
    if (isNaN(e)) e = totalQuestions;

    let validStart = Math.max(1, Math.min(s, totalQuestions));
    let validEnd = Math.max(validStart, Math.min(e, totalQuestions));
    
    const settings = { start: validStart, end: validEnd, shuffle, shuffleOptions };
    
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(settings));
    }
    
    onStart(settings);
  };

  return (
    <div className="flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center p-4">
      <div className="elevated-card w-full p-5 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-2xl bg-primary-subtle p-3 text-primary">
            <Settings2 size={24} />
          </div>
          <h2 className="text-2xl font-bold leading-tight text-text">{title}</h2>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text-secondary">Phạm vi câu hỏi (Tổng số: {totalQuestions})</label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <span className="text-xs text-text-muted mb-1 block">Từ câu:</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={start}
                  onChange={(e) => setStart(e.target.value.replace(/\D/g, ''))}
                  className="input px-4 py-3"
                />
              </div>
              <div className="flex-1">
                <span className="text-xs text-text-muted mb-1 block">Đến câu:</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={end}
                  onChange={(e) => setEnd(e.target.value.replace(/\D/g, ''))}
                  className="input px-4 py-3"
                />
              </div>
            </div>
          </div>

          <label className="choice-card flex cursor-pointer items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-xl p-2 ${shuffle ? 'bg-primary text-white' : 'bg-surface-2 text-text-muted'}`}>
                <Shuffle size={18} />
              </div>
              <span className="font-semibold text-text">Đảo vị trí câu hỏi</span>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={shuffle}
                onChange={(e) => setShuffle(e.target.checked)}
                className="sr-only"
              />
              <div className={`block h-8 w-14 rounded-full transition-colors ${shuffle ? 'bg-primary' : 'bg-surface-2'}`}></div>
              <div className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${shuffle ? 'translate-x-6' : ''}`}></div>
            </div>
          </label>

          {showShuffleOptions && (
            <label className="choice-card flex cursor-pointer items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className={`rounded-xl p-2 ${shuffleOptions ? 'bg-primary text-white' : 'bg-surface-2 text-text-muted'}`}>
                  <Shuffle size={18} />
                </div>
                <span className="font-semibold text-text">Đảo đáp án (A, B, C, D)</span>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                  className="sr-only"
                />
                <div className={`block h-8 w-14 rounded-full transition-colors ${shuffleOptions ? 'bg-primary' : 'bg-surface-2'}`}></div>
                <div className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${shuffleOptions ? 'translate-x-6' : ''}`}></div>
              </div>
            </label>
          )}

          <button
            onClick={handleStart}
            className="btn btn-primary mt-4 w-full py-4 text-base"
          >
            <span>Bắt đầu</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
