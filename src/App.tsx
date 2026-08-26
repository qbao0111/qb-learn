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
  Database,
  Sparkles
} from 'lucide-react';
import { FlashcardMode } from './components/FlashcardMode';
import { Overview } from './components/Overview';
import { LearnMode } from './components/LearnMode';
import { ExamMode } from './components/ExamMode';
import { QuestionManager } from './components/QuestionManager';
import { NeonSyncPopover } from './components/NeonSyncPopover';

import { useStore } from './store';
import { startCloudSync } from './lib/cloud-sync';

type AppMode = 'overview' | 'flashcards' | 'learn' | 'exam' | 'manage';
type Theme = 'light' | 'dark';

const THEME_STORAGE_KEY = 'qb-learn-theme';

function getInitialTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

const navigation = [
  { id: 'overview', label: 'Trang chủ', mobileLabel: 'Trang chủ', icon: Layout },
  { id: 'flashcards', label: 'Thẻ ghi nhớ', mobileLabel: 'Thẻ', icon: Layers },
  { id: 'learn', label: 'Học thông minh', mobileLabel: 'Học', icon: GraduationCap },
  { id: 'exam', label: 'Kiểm tra', mobileLabel: 'Kiểm tra', icon: ListChecks },
  { id: 'manage', label: 'Quản lý dữ liệu', mobileLabel: 'Dữ liệu', icon: Database },
] satisfies Array<{
  id: AppMode;
  label: string;
  mobileLabel: string;
  icon: typeof Layout;
}>;

const pageTitles: Record<AppMode, string> = {
  overview: 'Tổng quan học tập',
  flashcards: 'Thẻ ghi nhớ 3D',
  learn: 'Chế độ học thông minh',
  exam: 'Bài kiểm tra trắc nghiệm',
  manage: 'Quản lý câu hỏi',
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
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#0d111d' : '#4754ea');
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme(current => current === 'dark' ? 'light' : 'dark');

  return (
    <div className="app-shell min-h-dvh w-full max-w-full md:flex text-text">
      {/* SIDEBAR */}
      <aside className="sticky top-0 hidden h-dvh w-64 flex-shrink-0 flex-col border-r border-border bg-surface md:flex">
        {/* Brand */}
        <div className="px-5 py-4 border-b border-border/60">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setMode('overview')}>
            <div className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-indigo-500 text-white shadow-sm shadow-primary/20">
              <Layers size={20} strokeWidth={2.2} />
              <span className="absolute -bottom-0.5 -right-0.5 flex size-3 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-surface">
                <span className="size-1 rounded-full bg-white" />
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-bold tracking-tight text-text">QB Learn</h1>
                <span className="badge badge-primary px-1.5 py-0.2 text-[10px] font-semibold">PRO</span>
              </div>
              <p className="text-[11px] font-normal text-text-muted">Học sâu • Nhớ lâu</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Điều hướng chính">
          <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Menu học tập
          </div>
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = mode === item.id;
            return (
              <div key={item.id}>
                {item.id === 'manage' && (
                  <div className="my-2.5 px-3">
                    <div className="border-t border-border/60 pt-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Hệ thống
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setMode(item.id)}
                  className={`group relative flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-150 ${
                    isActive 
                      ? 'bg-primary text-white shadow-sm shadow-primary/25 font-semibold' 
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon 
                    size={18} 
                    strokeWidth={isActive ? 2.2 : 1.8} 
                    className={isActive ? 'text-white' : 'text-text-muted group-hover:text-primary transition-colors'} 
                  />
                  <span>{item.label}</span>
                  {item.id === 'learn' && (
                    <Sparkles size={13} className={`ml-auto ${isActive ? 'text-white/80' : 'text-amber-500'}`} />
                  )}
                </button>
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-border/60">
          <div className="flex items-center justify-between rounded-xl bg-surface-2 p-1.5 px-2.5">
            <div className="flex items-center gap-1.5">
              <button 
                type="button"
                onClick={toggleSound}
                className={`icon-btn min-h-7 min-w-7 rounded-lg ${soundEnabled ? 'text-primary' : 'text-text-muted'}`}
                title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
                aria-label={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
              <button
                type="button"
                onClick={toggleTheme}
                className="icon-btn min-h-7 min-w-7 rounded-lg text-text-muted"
                title={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
                aria-label={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
              >
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
            <span className="text-[11px] font-normal text-text-muted">
              {theme === 'dark' ? 'Giao diện tối' : 'Giao diện sáng'}
            </span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="min-w-0 flex-1 flex flex-col">
        {/* MOBILE HEADER */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md md:hidden">
          <div className="flex min-w-0 items-center gap-2" onClick={() => setMode('overview')}>
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
              <Layers size={16} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold leading-tight text-text">QB Learn</p>
              <p className="truncate text-[11px] leading-tight text-text-muted">{pageTitles[mode]}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <NeonSyncPopover compact />
            <button
              type="button"
              onClick={toggleSound}
              className={`icon-btn min-h-8 min-w-8 ${soundEnabled ? 'text-primary' : 'text-text-muted'}`}
              aria-label={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="icon-btn min-h-8 min-w-8 text-text-muted"
              aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </header>

        {/* DESKTOP TOPBAR */}
        <header className="sticky top-0 z-20 hidden h-14 items-center justify-between border-b border-border bg-surface/90 px-6 backdrop-blur-md md:flex">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-text tracking-tight">{pageTitles[mode]}</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Neon Cloud Sync Pill */}
            <NeonSyncPopover />

            <div className="h-4 w-px bg-border mx-0.5" />

            <button 
              type="button"
              onClick={toggleSound}
              className={`icon-btn rounded-xl border border-border bg-surface ${soundEnabled ? 'text-primary border-primary/30 bg-primary-subtle/50' : 'text-text-muted hover:text-text'}`}
              title={soundEnabled ? "Tắt âm thanh" : "Bật âm thanh"}
              aria-label={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className="icon-btn rounded-xl border border-border bg-surface text-text-muted hover:text-text"
              aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
              title={theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối'}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </header>

        {/* CONTENT AREA */}
        <div className="mx-auto flex w-full max-w-full flex-1 flex-col overflow-x-hidden px-4 py-6 pb-[calc(5.25rem+env(safe-area-inset-bottom))] sm:px-6 md:pb-12 lg:max-w-[1180px] lg:px-8">

          {mode === 'overview' && <Overview onNavigate={(targetMode) => setMode(targetMode)} />}
          {mode === 'flashcards' && <FlashcardMode />}
          {mode === 'learn' && <LearnMode />}
          {mode === 'exam' && <ExamMode />}
          {mode === 'manage' && <QuestionManager />}
        </div>
      </main>

      {/* MOBILE NAVIGATION */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(25,32,56,0.06)] backdrop-blur-xl md:hidden dark:shadow-none"
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
              className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold transition-colors ${
                active ? 'text-primary' : 'text-text-muted active:bg-surface-hover'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <span className={`flex h-8 w-12 items-center justify-center rounded-full transition-all ${active ? 'bg-primary-subtle scale-105' : ''}`}>
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
              </span>
              <span className="w-full text-center leading-tight truncate">{item.mobileLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default App;
