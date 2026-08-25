import { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  X,
  Download,
  LoaderCircle,
  Cloud,
  CloudOff,
  RefreshCw,
} from 'lucide-react';
import { useStore } from '../store';
import { parseQuizletPdf } from '../lib/pdf-loader';
import {
  prepareImportedQuestions,
  suggestBankName,
} from '../lib/import-bank';
import { downloadQuizletPdf } from '../lib/quizlet-pdf-export';
import { downloadBanksBackup, readBanksBackup } from '../lib/data-backup';
import {
  connectCloudSync,
  disconnectCloudSync,
  hasStoredSyncCode,
  syncCloudNow,
  useCloudSyncState,
} from '../lib/cloud-sync';

export function Overview() {
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
  const [syncCode, setSyncCode] = useState('');
  const [syncActionError, setSyncActionError] = useState('');
  const syncState = useCloudSyncState();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const handleConnectSync = async () => {
    setSyncActionError('');
    try {
      await connectCloudSync(syncCode);
      setSyncCode('');
    } catch (error) {
      setSyncActionError(error instanceof Error ? error.message : 'Không thể kết nối đồng bộ.');
    }
  };

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
    <div className="mx-auto w-full max-w-4xl space-y-5 pb-6 sm:space-y-8 sm:pb-12">
      {/* Upload Section */}
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-8">
        <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-text">
          <Upload className="text-primary" />
          Tạo bộ đề mới
        </h3>
        <p className="text-text-muted mb-6">Nhập trực tiếp từ file PDF xuất từ Quizlet (Quizlet Print).</p>
        
        <div
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors sm:p-10 ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
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
          <FileText size={48} className={`mb-4 ${isDragging ? 'text-primary' : 'text-text-muted'}`} />
          <p className="font-medium text-text mb-1">Kéo thả file PDF vào đây hoặc Click để chọn</p>
          <p className="text-sm text-text-muted">Chỉ hỗ trợ định dạng PDF (.pdf)</p>
        </div>

        {selectedFile && (
          <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-text">Tên bộ đề</span>
              <input
                value={bankName}
                onChange={(event) => setBankName(event.target.value)}
                placeholder="Bộ đề chưa đặt tên"
                className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-text outline-none transition-colors focus:border-primary"
              />
            </label>
            <button
              type="button"
              onClick={handleImport}
              disabled={isLoading}
              className="rounded-xl bg-primary px-6 py-3 font-semibold text-white shadow-lg shadow-primary/20 transition-colors hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60"
            >
              {isLoading ? 'Đang tạo...' : 'Tạo bộ đề từ PDF'}
            </button>
            <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={removeDuplicates}
                onChange={(event) => setRemoveDuplicates(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              />
              <span>
                <span className="block font-semibold text-text">Lọc câu hỏi có cùng nội dung</span>
                <span className="text-text-muted">
                  Để trống để giữ nguyên đủ số thẻ như trên Quizlet, kể cả các câu lặp lại.
                </span>
              </span>
            </label>
            <div className="flex min-w-0 items-center gap-2 text-sm text-text-muted sm:col-span-2">
              <FileText size={16} className="shrink-0 text-primary" />
              <span className="truncate">{selectedFile.name}</span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  clearSelectedFile();
                }}
                className="ml-auto rounded-lg p-1 hover:bg-surface-2 hover:text-text"
                aria-label="Bỏ file đã chọn"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {status && (
          <div
            role={statusType === 'error' ? 'alert' : 'status'}
            aria-live={statusType === 'error' ? 'assertive' : 'polite'}
            className={`mt-4 rounded-xl p-4 text-sm font-medium ${
              statusType === 'error'
                ? 'bg-red-100 text-red-700'
                : statusType === 'success'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-primary/10 text-primary'
            }`}
          >
            {isLoading && <span className="inline-block animate-spin mr-2">⟳</span>}
            {status}
          </div>
        )}
      </section>

      {/* Neon Sync */}
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className={`rounded-xl p-2.5 ${syncState.connected ? 'bg-emerald-50 text-emerald-600' : 'bg-primary/10 text-primary'}`}>
            {syncState.connected ? <Cloud size={22} /> : <CloudOff size={22} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-text">Đồng bộ Neon</h3>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${syncState.connected ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-2 text-text-muted'}`}>
                {syncState.connected ? 'Đã kết nối' : 'Chưa kết nối'}
              </span>
            </div>
            <p className="mt-1 text-sm text-text-muted">{syncState.message}</p>
            {syncState.lastSyncedAt && (
              <p className="mt-1 text-xs text-text-muted">
                Cập nhật lúc {new Date(syncState.lastSyncedAt).toLocaleTimeString('vi-VN')}
              </p>
            )}
          </div>
        </div>

        {!syncState.connected ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="sr-only">Mã đồng bộ</span>
              <input
                type="password"
                value={syncCode}
                onChange={(event) => setSyncCode(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void handleConnectSync();
                }}
                placeholder="Tạo hoặc nhập mã đồng bộ (ít nhất 8 ký tự)"
                autoComplete="off"
                className="min-h-11 w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-text outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </label>
            <button
              type="button"
              onClick={() => void handleConnectSync()}
              disabled={syncState.phase === 'connecting' || syncCode.trim().length < 8}
              className="min-h-11 rounded-xl bg-primary px-5 py-2.5 font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {syncState.phase === 'connecting' ? 'Đang kết nối…' : hasStoredSyncCode() ? 'Kết nối lại' : 'Bật đồng bộ'}
            </button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:justify-end">
            <button
              type="button"
              onClick={() => void syncCloudNow()}
              disabled={syncState.phase === 'syncing'}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
            >
              <RefreshCw size={17} className={syncState.phase === 'syncing' ? 'animate-spin' : ''} />
              Đồng bộ ngay
            </button>
            <button
              type="button"
              onClick={disconnectCloudSync}
              className="min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              Ngắt kết nối
            </button>
          </div>
        )}

        {syncActionError && (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
            {syncActionError}
          </p>
        )}
        <p className="mt-3 text-xs leading-relaxed text-text-muted">
          Nhập cùng một mã trên máy tính và iPhone. Mã không được lưu trong database; hãy dùng mã khó đoán và không chia sẻ cho người khác.
        </p>
      </section>

      {/* Bank Manager */}
      <section className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <h3 className="text-xl font-bold text-text">Quản lý bộ đề</h3>
            <p className="mt-1 text-sm text-text-muted">Sao lưu để chuyển toàn bộ bộ đề sang thiết bị khác.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:flex-wrap sm:justify-end">
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
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-text transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
            >
              <Upload size={18} aria-hidden="true" />
              <span>Khôi phục</span>
            </button>
            <button
              type="button"
              onClick={() => downloadBanksBackup(banks)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-text transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
            >
              <Download size={18} aria-hidden="true" />
              <span>Sao lưu</span>
            </button>
          </div>
        </div>
        
        {exportError && (
          <p className="m-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
            {exportError}
          </p>
        )}

        <div className="divide-y divide-border">
          {banks.map(bank => (
            <div key={bank.id} className={`p-4 flex items-center justify-between transition-colors ${activeBankId === bank.id ? 'bg-primary/5' : 'hover:bg-surface-2'}`}>
              <div className="flex-1 cursor-pointer" onClick={() => setActiveBank(bank.id)}>
                <div className="flex items-center gap-3">
                  <h4 className="font-semibold text-text">{bank.name}</h4>
                  {activeBankId === bank.id && (
                    <span className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                      <CheckCircle2 size={12} /> Đang chọn
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-muted mt-1">
                  {bank.report?.usableMultipleChoice ?? bank.questions.length} câu dùng được
                  {' • '}
                  Tạo ngày {new Date(bank.createdAt).toLocaleDateString('vi-VN')}
                </p>
              </div>
              
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void handleExport(bank);
                }}
                disabled={Boolean(exportingBankId)}
                className="ml-3 inline-flex shrink-0 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-text transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-wait disabled:opacity-60"
                title={`Xuất ${bank.name} thành PDF Quizlet`}
                aria-label={`Xuất ${bank.name} thành PDF Quizlet`}
              >
                {exportingBankId === bank.id ? (
                  <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Download size={18} aria-hidden="true" />
                )}
                <span className="hidden sm:inline">
                  {exportingBankId === bank.id ? 'Đang xuất...' : 'Xuất PDF'}
                </span>
              </button>

              {banks.length > 1 && (
                <button 
                  onClick={() => deleteBank(bank.id)}
                  className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Xóa bộ đề"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
