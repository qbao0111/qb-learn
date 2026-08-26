import { useEffect, useState } from 'react';
import { 
  Layers, 
  GraduationCap, 
  ListChecks, 
  Moon,
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
import { startCloudSync } from './lib/cloud-sync';

type AppMode = 'overview' | 'flashcards' | 'learn' | 'exam' | 'manage';
type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'qb-learn-theme';

function getInitialTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

const navigation = [
  { id: 'overview', label: 'Tổng quan', mobileLabel: 'Tổng quan', icon: Layout },
  { id: 'flashcards', label: 'Thẻ ghi nhớ', mobileLabel: 'Thẻ', icon: Layers },
  { id: 'learn', label: 'Học', mobileLabel: 'Học', icon: GraduationCap },
  { id: 'exam', label: 'Kiểm tra', mobileLabel: 'Kiểm tra', icon: ListChecks },
  { id: 'manage', label: 'Quản lý dữ liệu', mobileLabel: 'Dữ liệu', icon: Database },
] satisfies Array<{
  id: AppMode;
  label: string;
  mobileLabel: string;
  icon: typeof Layout;
}>;

const pageTitles: Record<AppMode, string> = {
  overview: 'Tổng quan bộ đề',
  flashcards: 'Thẻ ghi nhớ',
  learn: 'Chế độ học',
  exam: 'Làm bài kiểm tra',
  manage: 'Quản lý dữ liệu',
};

function App() {
  const [mode, setMode] = useState<AppMode>('overview');
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  const soundEnabled = useStore(state => state.soundEnabled);
  const toggleSound = useStore(state => state.toggleSound);

  useEffect(() => startCloudSync(), []);

  useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#11111b' : '#6d3df5');
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme(current => current === 'dark' ? 'light' : 'dark');

  return (
    <div className="flex h-dvh min-h-0 w-full overflow-hidden bg-background">
      {/* SIDEBAR */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-white p-2 rounded-lg">
              <Layers size={24} />
            </div>
            <h1 className="font-bold text-xl text-text">QB Learn</h1>
          </div>
        </div>

        <nav className="mt-4 flex-1 space-y-2 px-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id}>
                {item.id === 'manage' && <div className="my-2 border-t border-border" />}
                <button
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 font-medium transition-colors ${mode === item.id ? 'bg-primary/10 text-primary' : 'text-text-muted hover:bg-surface-2 hover:text-text'}`}
                >
                  <Icon size={20} />
                  {item.label}
                </button>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        {/* MOBILE HEADER */}
        <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border bg-surface px-4 pt-[env(safe-area-inset-top)] md:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="rounded-lg bg-primary p-1.5 text-white">
              <Layers size={20} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight text-text">QB Learn</p>
              <p className="truncate text-xs leading-tight text-text-muted">{pageTitles[mode]}</p>
            </div>
          </div>
          <div className="flex items-center">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex size-11 items-center justify-center rounded-full text-text-muted transition-colors active:bg-surface-2 active:text-text"
              aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              title={theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}
            >
              {theme === 'dark' ? <Sun size={21} /> : <Moon size={21} />}
            </button>
            <button
              type="button"
              onClick={toggleSound}
              className={`flex size-11 items-center justify-center rounded-full transition-colors ${soundEnabled ? 'text-primary active:bg-primary/10' : 'text-text-muted active:bg-surface-2'}`}
              aria-label={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              {soundEnabled ? <Volume2 size={21} /> : <VolumeX size={21} />}
            </button>
          </div>
        </header>

        {/* HEADER */}
        <header className="hidden h-16 flex-shrink-0 items-center justify-between border-b border-border bg-surface px-8 md:flex">
          <h2 className="text-lg font-semibold text-text">{pageTitles[mode]}</h2>
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleSound}
              className={`p-2 rounded-full transition-colors ${soundEnabled ? 'text-primary hover:bg-primary/10' : 'text-text-muted hover:bg-surface-2 hover:text-text'}`}
              title={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
            >
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-full p-2 text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
              aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              title={theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        {/* CONTENT AREA */}
        <div className="flex flex-1 flex-col items-center overflow-x-hidden overflow-y-auto px-3 py-3 pb-[calc(5.25rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-4 md:pb-4">
          {mode === 'overview' && <Overview />}
          
          {mode === 'flashcards' && <FlashcardMode />}

          {mode === 'learn' && <LearnMode />}
          {mode === 'exam' && <ExamMode />}
          {mode === 'manage' && <QuestionManager />}
        </div>
      </main>

      {/* MOBILE NAVIGATION */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_8px_rgba(15,23,42,0.06)] backdrop-blur-xl md:hidden dark:shadow-none"
        aria-label="Điều hướng chính"
      >
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = mode === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold transition-colors ${active ? 'text-primary' : 'text-text-muted active:bg-surface-2'}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className={`flex h-8 w-12 items-center justify-center rounded-full ${active ? 'bg-primary/10' : ''}`}>
                <Icon size={21} strokeWidth={active ? 2.4 : 2} />
              </span>
              <span className="w-full truncate text-center leading-none">{item.mobileLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default App;
