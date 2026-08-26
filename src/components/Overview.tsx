import { useCallback, useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  X,
  Download,
  LoaderCircle,
  FileSpreadsheet,
  Layers,
  GraduationCap,
  ListChecks,
  Sparkles,
  ArrowRight,
  PlusCircle,
  FolderOpen
} from 'lucide-react';
import { useStore } from '../store';
import { parseQuizletPdf } from '../lib/pdf-loader';
import {
  prepareImportedQuestions,
  suggestBankName,
} from '../lib/import-bank';
import { downloadQuizletPdf } from '../lib/quizlet-pdf-export';
import { downloadBanksBackup, readBanksBackup } from '../lib/data-backup';
import { TextBankImportDialog } from './TextBankImportDialog';

interface OverviewProps {
  onNavigate?: (mode: 'flashcards' | 'learn' | 'exam' | 'manage') => void;
}

export function Overview({ onNavigate }: OverviewProps) {
  const { banks, activeBankId, setActiveBank, addBank, deleteBank, restoreBanks } = useStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState<'idle' | 'selected' | 'success' | 'error'>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bankName, setBankName] = useState('');
  const [removeDuplicates, setRemoveDuplicates] = useState(false);
  const [exportingBankId, setExportingBankId] = useState<string | null>(null);
  const [exportError, setExportError] = useState('');
  const [textImportOpen, setTextImportOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const closeTextImport = useCallback(() => setTextImportOpen(false), []);

  const activeBank = banks.find((b) => b.id === activeBankId) || banks[0];

  const handleRestoreBackup = async (file?: File) => {
    if (!file) return;
    try {
      const restoredBanks = await readBanksBackup(file);
      restoreBanks(restoredBanks);
      setStatusType('success');
      setStatus(`Đã khôi phục ${restoredBanks.length} bộ đề từ bản sao lưu.`);
    } catch (error) {
      setStatusType('error');
      setStatus(error instanceof Error ? error.message : 'Không thể đọc file sao lưu.');
    } finally {
      if (backupInputRef.current) backupInputRef.current.value = '';
    }
  };

  const applySelectedFile = (file?: File) => {
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      setSelectedFile(null);
      setStatusType('error');
      setStatus('File chưa đúng định dạng. Vui lòng chọn một file PDF.');
      return;
    }

    setSelectedFile(file);
    setBankName((currentName) => currentName.trim() || suggestBankName(file.name));
    setStatusType('selected');
    setStatus('PDF đã sẵn sàng. Bạn có thể đặt tên bộ đề hoặc tạo ngay.');
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setStatus('');
    setStatusType('idle');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImport = async () => {
    if (!selectedFile || isLoading) return;

    setIsLoading(true);
    setStatusType('selected');
    setStatus('Đang phân tích PDF...');

    try {
      const parsedQuestions = await parseQuizletPdf(selectedFile, (page, total) => {
        setStatus(`Đang đọc PDF: trang ${page}/${total}...`);
      });

      const { questions, report } = prepareImportedQuestions(parsedQuestions, { removeDuplicates });
      if (!report.usableMultipleChoice) {
        throw new Error('Không tìm thấy câu hỏi trắc nghiệm có đáp án hợp lệ trong PDF này.');
      }

      const finalName = bankName.trim() || suggestBankName(selectedFile.name);
      addBank(finalName, questions, {
        sourceName: selectedFile.name.replace(/\.pdf$/i, ''),
        report,
      });

      const filteredDetails = [
        report.duplicatesRemoved
          ? `đã lọc ${report.duplicatesRemoved} câu trùng`
          : '',
        !report.duplicatesRemoved && report.duplicatesDetected
          ? `giữ nguyên ${report.duplicatesDetected} câu cùng nội dung`
          : '',
        report.invalidCount
          ? `${report.invalidCount} câu thiếu dữ liệu không dùng để học`
          : '',
      ].filter(Boolean);

      setStatusType('success');
      setStatus(
        `Đã thêm "${finalName}": ${questions.length} mục, ${report.usableMultipleChoice} câu dùng được${
          filteredDetails.length ? ` (${filteredDetails.join(', ')})` : ''
        }.`,
      );
      setSelectedFile(null);
      setBankName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error(err);
      setStatusType('error');
      setStatus(`Không tạo được bộ đề: ${err?.message || 'Lỗi không xác định'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (bank: (typeof banks)[number]) => {
    if (exportingBankId) return;

    setExportingBankId(bank.id);
    setExportError('');
    try {
      await downloadQuizletPdf(bank);
    } catch (error) {
      console.error('Quizlet PDF export failed', error);
      setExportError(`Không thể xuất PDF cho bộ đề "${bank.name}". Vui lòng thử lại.`);
    } finally {
      setExportingBankId(null);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      applySelectedFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="min-w-0 w-full space-y-7 overflow-x-hidden pb-12">
      {/* 1. QUIZLET HERO: JUMP BACK IN / TIẾP TỤC HỌC */}
      {activeBank && (
        <section className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-surface to-surface p-5 sm:p-7 shadow-xs">
          <div className="absolute -right-12 -top-12 size-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="badge badge-primary text-xs font-semibold">
                  <Sparkles size={12} /> Đang chọn học
                </span>
                <span className="text-[11px] font-normal text-text-muted">
                  Tạo ngày {new Date(activeBank.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-text truncate">
                {activeBank.name}
              </h2>

              <p className="text-xs sm:text-sm font-normal text-text-secondary leading-relaxed">
                Bộ đề gồm <strong className="text-primary font-semibold">{activeBank.report?.usableMultipleChoice ?? activeBank.questions.length}</strong> câu hỏi trắc nghiệm đã sẵn sàng.
              </p>
            </div>

            {/* Quick Action Study Modes */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => onNavigate ? onNavigate('learn') : null}
                className="btn btn-primary px-4 py-2.5 text-xs sm:text-sm font-medium shadow-sm shadow-primary/20"
              >
                <GraduationCap size={17} />
                <span>Học thông minh</span>
                <ArrowRight size={15} />
              </button>

              <button
                type="button"
                onClick={() => onNavigate ? onNavigate('flashcards') : null}
                className="btn btn-secondary px-3.5 py-2.5 text-xs sm:text-sm font-medium"
              >
                <Layers size={17} />
                <span>Thẻ ghi nhớ</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate ? onNavigate('exam') : null}
                className="btn btn-secondary px-3.5 py-2.5 text-xs sm:text-sm font-medium"
              >
                <ListChecks size={17} />
                <span>Làm kiểm tra</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 2. CREATE / IMPORT HUB */}
      <section className="elevated-card min-w-0 flex flex-col p-5 sm:p-6 rounded-2xl">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="flex items-center gap-2 text-base sm:text-lg font-bold text-text">
              <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <PlusCircle size={18} />
              </span>
              Tạo bộ đề mới
            </h3>
            <p className="mt-0.5 text-xs text-text-secondary leading-relaxed">
              Tải lên file PDF in từ Quizlet hoặc dán văn bản / TSV dạng bảng.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setTextImportOpen(true)}
            className="btn btn-secondary shrink-0 text-xs font-medium self-start sm:self-auto"
          >
            <FileSpreadsheet size={15} />
            <span>Nhập TSV / Bảng</span>
          </button>
        </div>

        {/* Dropzone */}
        <div
          className={`group relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-all duration-200 ${
            isDragging 
              ? 'border-primary bg-primary-subtle shadow-md shadow-primary/15 scale-[1.005]' 
              : 'border-border bg-surface-2 hover:border-primary/50 hover:bg-primary-subtle/30'
          }`}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click();
          }}
        >
          <input
            id="pdf-file-input"
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => applySelectedFile(e.target.files?.[0])}
          />
          <div className={`mb-2.5 flex size-11 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${
            isDragging ? 'bg-primary text-white' : 'bg-surface text-primary shadow-xs'
          }`}>
            <Upload size={22} strokeWidth={2} />
          </div>
          <p className="text-sm sm:text-base font-semibold text-text">
            Kéo thả file PDF vào đây hoặc <span className="text-primary underline decoration-1 underline-offset-2">chọn từ máy</span>
          </p>
          <p className="mt-0.5 text-xs text-text-muted">
            Hỗ trợ định dạng PDF (.pdf) in danh sách từ Quizlet
          </p>
        </div>

        {/* Selected File Form */}
        {selectedFile && (
          <div className="mt-4 rounded-xl border border-primary/30 bg-primary-subtle/40 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 truncate text-xs sm:text-sm font-semibold text-primary">
                <FileText size={16} className="shrink-0" />
                <span className="truncate">{selectedFile.name}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  clearSelectedFile();
                }}
                className="icon-btn min-h-6 min-w-6 rounded-md text-text-muted hover:text-danger"
                aria-label="Bỏ file đã chọn"
              >
                <X size={15} />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-text">Đặt tên bộ đề</span>
                <input
                  value={bankName}
                  onChange={(event) => setBankName(event.target.value)}
                  placeholder="Nhập tên bộ đề..."
                  className="input px-3.5 py-2 text-xs sm:text-sm bg-surface"
                />
              </label>
              <button
                type="button"
                onClick={handleImport}
                disabled={isLoading}
                className="btn btn-primary px-5 py-2 text-xs sm:text-sm font-semibold disabled:cursor-wait"
              >
                {isLoading ? 'Đang tạo...' : 'Tạo bộ đề'}
              </button>
            </div>

            <label className="flex items-start gap-2 text-xs text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={removeDuplicates}
                onChange={(event) => setRemoveDuplicates(event.target.checked)}
                className="mt-0.5 size-3.5 accent-primary rounded cursor-pointer"
              />
              <span>
                <strong className="text-text font-medium">Lọc câu hỏi trùng lặp</strong> (bỏ chọn để giữ trọn vẹn số lượng câu như file gốc).
              </span>
            </label>
          </div>
        )}

        {/* Status Alert */}
        {status && (
          <div
            role={statusType === 'error' ? 'alert' : 'status'}
            aria-live={statusType === 'error' ? 'assertive' : 'polite'}
            className={`mt-4 rounded-xl border p-3 text-xs sm:text-sm font-medium flex items-center gap-2.5 ${
              statusType === 'error'
                ? 'border-danger/30 bg-danger-subtle text-danger'
                : statusType === 'success'
                  ? 'border-success/30 bg-success-subtle text-success'
                  : 'border-primary/20 bg-primary-subtle text-primary'
            }`}
          >
            {isLoading && <LoaderCircle size={15} className="animate-spin shrink-0" />}
            <span>{status}</span>
          </div>
        )}
      </section>

      {/* 3. STUDY SETS LIBRARY */}
      <section className="plain-section space-y-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary-subtle text-primary">
              <FolderOpen size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-text">Thư viện bộ đề</h3>
                <span className="badge badge-primary text-[11px] py-0.5">{banks.length} bộ đề</span>
              </div>
              <p className="text-xs font-normal text-text-muted">Chọn bộ đề để bắt đầu luyện tập hoặc xuất file PDF.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={backupInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => void handleRestoreBackup(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => backupInputRef.current?.click()}
              className="btn btn-secondary text-xs px-3 py-1.5 font-medium"
              title="Khôi phục dữ liệu từ bản sao lưu JSON"
            >
              <Upload size={14} />
              <span>Khôi phục</span>
            </button>
            <button
              type="button"
              onClick={() => downloadBanksBackup(banks)}
              className="btn btn-secondary text-xs px-3 py-1.5 font-medium"
              title="Sao lưu toàn bộ bộ đề thành file JSON"
            >
              <Download size={14} />
              <span>Sao lưu</span>
            </button>
          </div>
        </div>

        {exportError && (
          <p className="rounded-xl border border-danger/30 bg-danger-subtle px-4 py-2 text-xs font-medium text-danger" role="alert">
            {exportError}
          </p>
        )}

        {/* Study Cards Grid */}
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
          {banks.map((bank) => {
            const isSelected = activeBankId === bank.id;
            const usableCount = bank.report?.usableMultipleChoice ?? bank.questions.length;
            
            return (
              <div
                key={bank.id}
                onClick={() => setActiveBank(bank.id)}
                className={`card card-hover group relative flex cursor-pointer flex-col justify-between p-4 sm:p-5 transition-all ${
                  isSelected 
                    ? 'border-primary ring-2 ring-primary/20 bg-surface shadow-sm' 
                    : 'bg-surface hover:border-primary/40'
                }`}
              >
                <div>
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <span className={`badge ${isSelected ? 'badge-primary font-medium' : 'badge-muted'}`}>
                      {isSelected ? (
                        <>
                          <CheckCircle2 size={12} /> Đang chọn
                        </>
                      ) : (
                        'Bộ đề'
                      )}
                    </span>
                    <span className="text-[11px] font-normal text-text-muted">
                      {new Date(bank.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  <h4 className="mb-1.5 text-base font-semibold leading-snug text-text group-hover:text-primary transition-colors line-clamp-2">
                    {bank.name}
                  </h4>

                  <p className="text-xs font-normal text-text-secondary flex items-center gap-1.5">
                    <span className="inline-block size-1.5 rounded-full bg-primary/70" />
                    <strong>{usableCount}</strong> câu trắc nghiệm
                  </p>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveBank(bank.id);
                      if (onNavigate) onNavigate('learn');
                    }}
                    className={`btn text-xs px-3 py-1.5 font-medium ${
                      isSelected ? 'btn-primary' : 'btn-secondary'
                    }`}
                  >
                    <span>Luyện tập</span>
                    <ArrowRight size={13} />
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        void handleExport(bank);
                      }}
                      disabled={Boolean(exportingBankId)}
                      className="icon-btn min-h-7 min-w-7 rounded-lg"
                      title={`Xuất ${bank.name} thành PDF Quizlet`}
                      aria-label={`Xuất ${bank.name} thành PDF Quizlet`}
                    >
                      {exportingBankId === bank.id ? (
                        <LoaderCircle size={15} className="animate-spin text-primary" />
                      ) : (
                        <Download size={15} />
                      )}
                    </button>

                    {banks.length > 1 && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (confirm(`Bạn có chắc muốn xoá bộ đề "${bank.name}"?`)) {
                            deleteBank(bank.id);
                          }
                        }}
                        className="icon-btn min-h-7 min-w-7 rounded-lg hover:bg-danger-subtle hover:text-danger"
                        title="Xóa bộ đề"
                        aria-label="Xóa bộ đề"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <TextBankImportDialog open={textImportOpen} onClose={closeTextImport} />
    </div>
  );
}


