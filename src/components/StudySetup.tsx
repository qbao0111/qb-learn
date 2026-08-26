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
    <div className="flex min-h-[55vh] w-full max-w-lg flex-col items-center justify-center p-4">
      <div className="elevated-card w-full p-6 sm:p-8 rounded-3xl">
        <div className="flex items-center gap-3.5 mb-6">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Settings2 size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold leading-tight text-text">{title}</h2>
            <p className="text-xs text-text-muted">Tổng cộng {totalQuestions} câu hỏi có sẵn</p>
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-text">Phạm vi câu hỏi</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs text-text-muted mb-1 block">Từ câu:</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={start}
                  onChange={(e) => setStart(e.target.value.replace(/\D/g, ''))}
                  className="input px-4 py-2.5 bg-surface text-center font-bold"
                />
              </div>
              <div>
                <span className="text-xs text-text-muted mb-1 block">Đến câu:</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={end}
                  onChange={(e) => setEnd(e.target.value.replace(/\D/g, ''))}
                  className="input px-4 py-2.5 bg-surface text-center font-bold"
                />
              </div>
            </div>
          </div>

          <label className="choice-card flex cursor-pointer items-center justify-between p-3.5 sm:p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className={`rounded-xl p-2 transition-colors ${shuffle ? 'bg-primary text-white' : 'bg-surface-2 text-text-muted'}`}>
                <Shuffle size={18} />
              </div>
              <span className="font-semibold text-sm sm:text-base text-text">Xáo trộn câu hỏi</span>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={shuffle}
                onChange={(e) => setShuffle(e.target.checked)}
                className="sr-only"
              />
              <div className={`block h-7 w-12 rounded-full transition-colors ${shuffle ? 'bg-primary' : 'bg-surface-3'}`}></div>
              <div className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${shuffle ? 'translate-x-5' : ''}`}></div>
            </div>
          </label>

          {showShuffleOptions && (
            <label className="choice-card flex cursor-pointer items-center justify-between p-3.5 sm:p-4 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className={`rounded-xl p-2 transition-colors ${shuffleOptions ? 'bg-primary text-white' : 'bg-surface-2 text-text-muted'}`}>
                  <Shuffle size={18} />
                </div>
                <span className="font-semibold text-sm sm:text-base text-text">Xáo trộn vị trí đáp án (A, B, C, D)</span>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                  className="sr-only"
                />
                <div className={`block h-7 w-12 rounded-full transition-colors ${shuffleOptions ? 'bg-primary' : 'bg-surface-3'}`}></div>
                <div className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${shuffleOptions ? 'translate-x-5' : ''}`}></div>
              </div>
            </label>
          )}

          <button
            onClick={handleStart}
            className="btn btn-primary mt-2 w-full py-3.5 text-base font-bold shadow-md shadow-primary/25"
          >
            <span>Bắt đầu học</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

