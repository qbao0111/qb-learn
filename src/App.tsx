import { useState } from 'react';
import { 
  Layers, 
  GraduationCap, 
  ListChecks, 
  Sun,
  Layout,
  Volume2,
  VolumeX,
  Database
} from 'lucide-react';
import { FlashcardMode } from './components/FlashcardMode';
import { Overview } from './components/Overview';
import { LearnMode } from './components/LearnMode';
import { ExamMode } from './components/ExamMode';
import { QuestionManager } from './components/QuestionManager';

import { useStore } from './store';

function App() {
  const [mode, setMode] = useState<'overview' | 'flashcards' | 'learn' | 'exam' | 'manage'>('overview');
  const soundEnabled = useStore(state => state.soundEnabled);
  const toggleSound = useStore(state => state.toggleSound);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* SIDEBAR */}
      <aside className="w-64 bg-surface border-r border-border flex flex-col flex-shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-white p-2 rounded-lg">
              <Layers size={24} />
            </div>
            <h1 className="font-bold text-xl text-text">QB Learn</h1>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button 
            onClick={() => setMode('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${mode === 'overview' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-surface-2 hover:text-text'}`}
          >
            <Layout size={20} />
            Tổng quan
          </button>
          
          <button 
            onClick={() => setMode('flashcards')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${mode === 'flashcards' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-surface-2 hover:text-text'}`}
          >
            <Layers size={20} />
            Thẻ ghi nhớ
          </button>

          <button 
            onClick={() => setMode('learn')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${mode === 'learn' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-surface-2 hover:text-text'}`}
          >
            <GraduationCap size={20} />
            Học
          </button>
          
          <button 
            onClick={() => setMode('exam')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${mode === 'exam' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-surface-2 hover:text-text'}`}
          >
            <ListChecks size={20} />
            Kiểm tra
          </button>
          
          <div className="my-2 border-t border-border"></div>
          
          <button 
            onClick={() => setMode('manage')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${mode === 'manage' ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-surface-2 hover:text-text'}`}
          >
            <Database size={20} />
            Quản lý dữ liệu
          </button>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* HEADER */}
        <header className="h-16 border-b border-border bg-surface flex items-center justify-between px-8 flex-shrink-0">
          <h2 className="font-semibold text-lg text-text">
            {mode === 'flashcards' && "Thẻ ghi nhớ"}
            {mode === 'overview' && "Tổng quan bộ đề"}
            {mode === 'learn' && "Chế độ học"}
            {mode === 'exam' && "Làm bài kiểm tra"}
          </h2>
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleSound}
              className={`p-2 rounded-full transition-colors ${soundEnabled ? 'text-primary hover:bg-primary/10' : 'text-text-muted hover:bg-surface-2 hover:text-text'}`}
              title={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
            >
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button className="p-2 text-text-muted hover:text-text rounded-full hover:bg-surface-2 transition-colors">
              <Sun size={20} />
            </button>
          </div>
        </header>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4 flex flex-col items-center">
          {mode === 'overview' && <Overview />}
          
          {mode === 'flashcards' && <FlashcardMode />}

          {mode === 'learn' && <LearnMode />}
          {mode === 'exam' && <ExamMode />}
          {mode === 'manage' && <QuestionManager />}
        </div>
      </main>
    </div>
  );
}

export default App;
