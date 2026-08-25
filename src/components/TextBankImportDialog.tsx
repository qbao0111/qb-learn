import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Upload,
  X,
} from 'lucide-react';
import { useStore } from '../store';
import { prepareImportedQuestions } from '../lib/import-bank';
import { parseTextBank } from '../lib/text-bank-import';

interface TextBankImportDialogProps {
  open: boolean;
  onClose: () => void;
}

const separatorOptions = [
  { value: '\t', label: 'Tab' },
  { value: ',', label: 'Dấu phẩy' },
  { value: ';', label: 'Dấu chấm phẩy' },
  { value: 'custom', label: 'Tùy chỉnh' },
];

const rowSeparatorOptions = [
  { value: '\n', label: 'Dòng mới' },
  { value: ';', label: 'Dấu chấm phẩy' },
  { value: 'custom', label: 'Tùy chỉnh' },
];

function readableFileName(name: string) {
  return name.replace(/\.(?:tsv|txt|csv)$/i, '').trim() || 'Bộ đề nhập từ văn bản';
}

export function TextBankImportDialog({ open, onClose }: TextBankImportDialogProps) {
  const addBank = useStore((state) => state.addBank);
  const [bankName, setBankName] = useState('Bộ đề nhập từ văn bản');
  const [sourceText, setSourceText] = useState('');
  const [sourceName, setSourceName] = useState('Dữ liệu dán');
  const [termSeparatorMode, setTermSeparatorMode] = useState('\t');
  const [rowSeparatorMode, setRowSeparatorMode] = useState('\n');
  const [customTermSeparator, setCustomTermSeparator] = useState('|');
  const [customRowSeparator, setCustomRowSeparator] = useState('---');
  const [removeDuplicates, setRemoveDuplicates] = useState(false);
  const [error, setError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const termSeparator = termSeparatorMode === 'custom' ? customTermSeparator : termSeparatorMode;
  const rowSeparator = rowSeparatorMode === 'custom' ? customRowSeparator : rowSeparatorMode;
  const parsed = useMemo(
    () => parseTextBank(sourceText, { termSeparator, rowSeparator }),
    [sourceText, termSeparator, rowSeparator],
  );
  const prepared = useMemo(
    () => prepareImportedQuestions(parsed.questions, { removeDuplicates }),
    [parsed.questions, removeDuplicates],
  );

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => textareaRef.current?.focus(), 50);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleFile = async (file?: File) => {
    if (!file) return;
    try {
      const text = await file.text();
      setSourceText(text);
      setSourceName(file.name);
      setBankName(readableFileName(file.name));
      setTermSeparatorMode(/\.csv$/i.test(file.name) ? ',' : '\t');
      setRowSeparatorMode('\n');
      setError('');
    } catch {
      setError('Không thể đọc file đã chọn.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImport = () => {
    if (!bankName.trim()) {
      setError('Hãy nhập tên bộ đề.');
      return;
    }
    if (!prepared.report.usableMultipleChoice) {
      setError('Chưa có câu hỏi hợp lệ để nhập. Hãy kiểm tra dấu phân cách và dữ liệu.');
      return;
    }

    addBank(bankName, prepared.questions, {
      sourceName,
      report: prepared.report,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="text-import-title"
        className="flex h-[100dvh] w-full flex-col overflow-hidden bg-background shadow-2xl sm:h-[92vh] sm:max-w-6xl sm:rounded-3xl sm:border sm:border-border"
      >
        <header className="flex flex-shrink-0 items-start justify-between gap-4 border-b border-border bg-surface px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="text-import-title" className="text-xl font-bold text-text sm:text-2xl">
              Nhập bộ đề từ văn bản hoặc TSV
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Mỗi dòng là một câu hỏi; dùng dấu Tab để ngăn câu hỏi và đáp án.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Đóng cửa sổ nhập dữ liệu"
          >
            <X size={22} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(340px,.95fr)]">
            <div className="min-w-0 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-text">Tên bộ đề</span>
                <input
                  value={bankName}
                  onChange={(event) => setBankName(event.target.value)}
                  className="min-h-11 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
                />
              </label>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor="text-bank-source" className="text-sm font-semibold text-text">
                    Dữ liệu
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-text transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <Upload size={17} /> Chọn file TSV
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".tsv,.txt,.csv,text/tab-separated-values,text/plain,text/csv"
                    className="hidden"
                    onChange={(event) => void handleFile(event.target.files?.[0])}
                  />
                </div>
                <textarea
                  id="text-bank-source"
                  ref={textareaRef}
                  value={sourceText}
                  onChange={(event) => {
                    setSourceText(event.target.value);
                    setSourceName('Dữ liệu dán');
                    setError('');
                  }}
                  rows={11}
                  spellCheck={false}
                  placeholder={'Câu hỏi? A. Lựa chọn 1 B. Lựa chọn 2 C. Lựa chọn 3 D. Lựa chọn 4\tB\nCâu hỏi tiếp theo…\tAC'}
                  className="min-h-64 w-full resize-y rounded-2xl border-2 border-border bg-surface p-4 font-mono text-sm leading-relaxed text-text outline-none transition-colors focus:border-primary"
                  aria-describedby="text-import-help"
                />
                <p id="text-import-help" className="mt-2 text-xs leading-relaxed text-text-muted">
                  Hỗ trợ đáp án A–Z, nhiều đáp án như AC hoặc A,C, và nguyên văn nội dung đáp án đúng.
                </p>
              </div>

              <div className="grid gap-4 rounded-2xl bg-surface-2 p-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-text-muted">
                    Giữa câu hỏi và đáp án
                  </span>
                  <select
                    value={termSeparatorMode}
                    onChange={(event) => setTermSeparatorMode(event.target.value)}
                    className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-text outline-none focus:border-primary"
                  >
                    {separatorOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {termSeparatorMode === 'custom' && (
                    <input
                      value={customTermSeparator}
                      onChange={(event) => setCustomTermSeparator(event.target.value)}
                      maxLength={8}
                      className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-text outline-none focus:border-primary"
                      aria-label="Dấu phân cách câu hỏi và đáp án tùy chỉnh"
                    />
                  )}
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-text-muted">
                    Giữa các câu hỏi
                  </span>
                  <select
                    value={rowSeparatorMode}
                    onChange={(event) => setRowSeparatorMode(event.target.value)}
                    className="min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-text outline-none focus:border-primary"
                  >
                    {rowSeparatorOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {rowSeparatorMode === 'custom' && (
                    <input
                      value={customRowSeparator}
                      onChange={(event) => setCustomRowSeparator(event.target.value)}
                      maxLength={8}
                      className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-text outline-none focus:border-primary"
                      aria-label="Dấu phân cách giữa các câu hỏi tùy chỉnh"
                    />
                  )}
                </label>
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={removeDuplicates}
                  onChange={(event) => setRemoveDuplicates(event.target.checked)}
                  className="mt-0.5 size-4 accent-primary"
                />
                <span>
                  <span className="block font-semibold text-text">Lọc câu hỏi trùng nội dung</span>
                  <span className="text-text-muted">Tắt để giữ nguyên đủ số dòng đã nhập.</span>
                </span>
              </label>
            </div>

            <div className="min-w-0">
              <div className="sticky top-0 overflow-hidden rounded-2xl border border-border bg-surface">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                  <div>
                    <h3 className="font-bold text-text">Xem trước</h3>
                    <p className="text-xs text-text-muted">{parsed.rowCount} dòng được nhận diện</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                      <CheckCircle2 size={14} /> {prepared.report.usableMultipleChoice} hợp lệ
                    </span>
                    {parsed.issues.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-amber-700">
                        <AlertTriangle size={14} /> {parsed.issues.length} lỗi
                      </span>
                    )}
                  </div>
                </div>

                <div className="max-h-[48vh] overflow-y-auto p-3 sm:max-h-[58vh]">
                  {!sourceText.trim() && (
                    <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center text-text-muted">
                      <FileSpreadsheet size={42} className="mb-3 opacity-60" />
                      <p className="font-semibold text-text">Dán dữ liệu hoặc chọn file TSV</p>
                      <p className="mt-1 text-sm">Bản xem trước sẽ xuất hiện ngay tại đây.</p>
                    </div>
                  )}

                  {prepared.questions.slice(0, 50).map((question, index) => (
                    <article key={`${question.id}-${index}`} className="mb-3 rounded-xl border border-border p-3 last:mb-0">
                      <p className="text-sm font-semibold leading-relaxed text-text">
                        <span className="mr-1 text-primary">{index + 1}.</span>{question.question}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {question.options.map((option) => (
                          <span
                            key={option.key}
                            className={`rounded-lg px-2 py-1 text-xs ${question.answerKeys?.includes(option.key) ? 'bg-emerald-50 font-semibold text-emerald-700' : 'bg-surface-2 text-text-muted'}`}
                          >
                            {option.key}. {option.text}
                          </span>
                        ))}
                      </div>
                    </article>
                  ))}

                  {parsed.issues.slice(0, 20).map((issue) => (
                    <div key={`${issue.row}-${issue.source}`} className="mb-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 last:mb-0">
                      <p className="font-semibold">Dòng {issue.row}: {issue.message}</p>
                      <p className="mt-1 truncate text-xs opacity-75">{issue.source}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">
              {error}
            </p>
          )}
        </div>

        <footer className="flex flex-shrink-0 items-center justify-between gap-3 border-t border-border bg-surface px-4 py-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-3">
          <p className="hidden text-sm text-text-muted sm:block">
            Sẽ tạo {prepared.report.usableMultipleChoice} câu hỏi dùng được.
          </p>
          <div className="ml-auto grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-xl border border-border px-5 py-2.5 font-semibold text-text transition-colors hover:bg-surface-2"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={!prepared.report.usableMultipleChoice}
              className="min-h-11 rounded-xl bg-primary px-6 py-2.5 font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Nhập {prepared.report.usableMultipleChoice || ''} câu
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
