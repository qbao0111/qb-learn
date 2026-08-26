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
    <div className="app-shell min-h-dvh w-full max-w-full md:flex">
      {/* SIDEBAR */}
      <aside className="sticky top-0 hidden h-dvh w-56 flex-shrink-0 flex-col border-r border-border bg-surface/96 md:flex">
        <div className="px-4 pb-4 pt-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary p-2 text-white">
              <Layers size={21} strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold leading-tight text-text">QB Learn</h1>
              <p className="text-xs font-medium text-text-muted">Học gọn hơn mỗi ngày</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-2.5" aria-label="Điều hướng chính">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id}>
                {item.id === 'manage' && <div className="my-3 border-t border-border/70" />}
                <button
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={`relative flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-all duration-200 ${mode === item.id ? 'bg-primary-subtle text-primary shadow-[inset_0_0_0_1px_rgba(66,85,255,0.08)] before:absolute before:left-0 before:top-2 before:h-7 before:w-1 before:rounded-full before:bg-primary' : 'text-text-secondary hover:bg-surface-hover hover:text-text'}`}
                  aria-current={mode === item.id ? 'page' : undefined}
                >
                  <Icon size={20} strokeWidth={mode === item.id ? 2.35 : 2} />
                  {item.label}
                </button>
              </div>
            );
          })}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="min-w-0 flex-1">
        {/* MOBILE HEADER */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/96 px-4 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="rounded-xl bg-primary p-1.5 text-white">
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
              className="icon-btn"
              aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              title={theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}
            >
              {theme === 'dark' ? <Sun size={21} /> : <Moon size={21} />}
            </button>
            <button
              type="button"
              onClick={toggleSound}
              className={`icon-btn ${soundEnabled ? 'text-primary' : ''}`}
              aria-label={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              {soundEnabled ? <Volume2 size={21} /> : <VolumeX size={21} />}
            </button>
          </div>
        </header>

        {/* HEADER */}
        <header className="sticky top-0 z-20 hidden h-16 items-center justify-end border-b border-border bg-surface/90 px-8 backdrop-blur md:flex">
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleSound}
              className={`icon-btn ${soundEnabled ? 'text-primary' : ''}`}
              title={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
              aria-label={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="icon-btn"
              aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              title={theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        {/* CONTENT AREA */}
        <div className="mx-auto flex w-full max-w-full flex-col overflow-x-hidden px-4 py-6 pb-[calc(5.25rem+env(safe-area-inset-bottom))] sm:px-6 md:pb-10 lg:max-w-[1240px] lg:px-8">
          {mode === 'overview' && <Overview />}
          
          {mode === 'flashcards' && <FlashcardMode />}

          {mode === 'learn' && <LearnMode />}
          {mode === 'exam' && <ExamMode />}
          {mode === 'manage' && <QuestionManager />}
        </div>
      </main>

      {/* MOBILE NAVIGATION */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface/96 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(37,44,97,0.08)] backdrop-blur-xl md:hidden dark:shadow-none"
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
              className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold transition-colors ${active ? 'text-primary' : 'text-text-muted active:bg-surface-hover'}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className={`flex h-8 w-12 items-center justify-center rounded-full ${active ? 'bg-primary-subtle' : ''}`}>
                <Icon size={21} strokeWidth={active ? 2.4 : 2} />
              </span>
              <span className="w-full text-center leading-tight">{item.mobileLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default App;
