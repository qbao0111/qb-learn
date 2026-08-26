import { useCallback, useState, useRef } from 'react';
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
  FileSpreadsheet,
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
import { TextBankImportDialog } from './TextBankImportDialog';

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
  const [textImportOpen, setTextImportOpen] = useState(false);
  const syncState = useCloudSyncState();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const closeTextImport = useCallback(() => setTextImportOpen(false), []);

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
    <div className="min-w-0 w-full space-y-8 overflow-x-hidden pb-10">
      <div className="min-w-0 flex flex-col gap-2 pt-1">
        <h2 className="text-[2rem] font-bold leading-tight tracking-[-0.01em] text-text">Tổng quan bộ đề</h2>
        <p className="max-w-full text-base leading-7 text-text-secondary sm:max-w-2xl">
          Tạo, đồng bộ và chọn bộ đề đang học trong một không gian gọn hơn.
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-12 lg:items-stretch">
        {/* Upload Section */}
        <section className="elevated-card min-w-0 lg:col-span-8">
          <div className="flex h-full flex-col p-4 sm:p-5">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="flex items-center gap-2 text-xl font-bold leading-tight text-text">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-primary-subtle text-primary">
                    <Upload size={20} />
                  </span>
                  Tạo bộ đề mới
                </h3>
                <p className="mt-1 text-sm leading-6 text-text-secondary">Nhập từ PDF Quizlet hoặc dán dữ liệu dạng bảng.</p>
              </div>
              <button
                type="button"
                onClick={() => setTextImportOpen(true)}
                className="btn btn-secondary w-full shrink-0 sm:w-auto"
              >
                <FileSpreadsheet size={18} />
                Nhập văn bản / TSV
              </button>
            </div>

            <div
              className={`grid min-h-[150px] min-w-0 cursor-pointer grid-cols-1 items-center gap-4 rounded-2xl border border-dashed p-4 transition-all duration-200 sm:min-h-[178px] sm:grid-cols-[auto_1fr_auto] sm:p-5 ${isDragging ? 'border-primary bg-primary-subtle shadow-[inset_0_0_0_1px_rgba(66,85,255,0.12)]' : 'border-primary/20 bg-primary-subtle/50 hover:border-primary/50 hover:bg-primary-subtle'}`}
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
              <div className={`mx-auto flex size-14 items-center justify-center rounded-2xl sm:mx-0 ${isDragging ? 'bg-primary text-white' : 'bg-surface text-primary shadow-sm'}`}>
                <FileText size={29} />
              </div>
              <div className="min-w-0 text-center sm:text-left">
                <p className="text-lg font-bold leading-7 text-text">Kéo thả file PDF vào đây</p>
                <p className="mt-1 break-words text-sm leading-6 text-text-secondary">Hoặc chọn file từ máy. Chỉ hỗ trợ định dạng PDF (.pdf)</p>
              </div>
              <span className="btn btn-primary pointer-events-none w-full justify-self-center px-5 sm:w-auto sm:justify-self-end">
                Chọn file PDF
              </span>
            </div>

            {selectedFile && (
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-text">Tên bộ đề</span>
                  <input
                    value={bankName}
                    onChange={(event) => setBankName(event.target.value)}
                    placeholder="Bộ đề chưa đặt tên"
                    className="input px-4 py-3"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={isLoading}
                  className="btn btn-primary px-6 py-3 disabled:cursor-wait"
                >
                  {isLoading ? 'Đang tạo...' : 'Tạo bộ đề từ PDF'}
                </button>
                <label className="flex items-start gap-3 rounded-xl bg-background px-4 py-3 text-sm sm:col-span-2">
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
                    className="icon-btn ml-auto min-h-8 min-w-8 rounded-lg"
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
                className={`mt-4 rounded-xl border p-3 text-sm font-semibold ${
                  statusType === 'error'
                    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300'
                    : statusType === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'border-primary/20 bg-primary-subtle text-primary'
                }`}
              >
                {isLoading && <LoaderCircle size={16} className="mr-2 inline-block animate-spin" />}
                {status}
              </div>
            )}
          </div>
        </section>

        {/* Neon Sync */}
        <section className="subtle-panel min-w-0 lg:col-span-4">
          <div className="flex h-full flex-col p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-text">Đồng bộ Neon</h3>
                  <span className={`badge ${syncState.connected ? 'badge-success dark:bg-emerald-950/60 dark:text-emerald-300' : 'badge-muted'}`}>
                    <span className={`size-1.5 rounded-full ${syncState.connected ? 'bg-emerald-600' : 'bg-text-muted'}`} />
                    {syncState.connected ? 'Đã kết nối' : 'Chưa kết nối'}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{syncState.message}</p>
                {syncState.lastSyncedAt && (
                  <p className="mt-1 text-xs font-medium text-text-muted">
                    Cập nhật lúc {new Date(syncState.lastSyncedAt).toLocaleTimeString('vi-VN')}
                  </p>
                )}
              </div>
              <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${syncState.connected ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-surface text-primary'}`}>
                {syncState.connected ? <Cloud size={21} /> : <CloudOff size={21} />}
              </div>
            </div>

            {!syncState.connected ? (
              <div className="mt-5 space-y-3">
                <label className="block">
                  <span className="sr-only">Mã đồng bộ</span>
                  <input
                    type="password"
                    value={syncCode}
                    onChange={(event) => setSyncCode(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void handleConnectSync();
                    }}
                    placeholder="Mã đồng bộ"
                    autoComplete="off"
                    className="input px-4 py-2.5"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void handleConnectSync()}
                  disabled={syncState.phase === 'connecting' || syncCode.trim().length < 8}
                  className="btn btn-primary w-full"
                >
                  {syncState.phase === 'connecting' ? 'Đang kết nối…' : hasStoredSyncCode() ? 'Kết nối lại' : 'Bật đồng bộ'}
                </button>
              </div>
            ) : (
              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => void syncCloudNow()}
                  disabled={syncState.phase === 'syncing'}
                  className="btn btn-primary w-full disabled:opacity-50"
                >
                  <RefreshCw size={17} className={syncState.phase === 'syncing' ? 'animate-spin' : ''} />
                  Đồng bộ ngay
                </button>
                <button
                  type="button"
                  onClick={disconnectCloudSync}
                  className="btn btn-ghost w-full text-text-muted hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-300"
                >
                  Ngắt kết nối
                </button>
              </div>
            )}

            {syncActionError && (
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300" role="alert">
                {syncActionError}
              </p>
            )}
            <p className="mt-auto pt-4 text-xs leading-relaxed text-text-muted">
              Nhập cùng một mã trên máy tính và iPhone. Mã không được lưu trong database; hãy dùng mã khó đoán và không chia sẻ cho người khác.
            </p>
          </div>
        </section>
      </div>

      {/* Bank Manager */}
      <section className="plain-section">
        <div className="mb-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-xl font-bold text-text">Quản lý bộ đề</h3>
            <p className="mt-1 text-sm leading-6 text-text-secondary">Sao lưu để chuyển toàn bộ bộ đề sang thiết bị khác.</p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:flex-wrap sm:justify-end">
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
              className="btn btn-secondary px-3"
            >
              <Upload size={18} aria-hidden="true" />
              <span>Khôi phục</span>
            </button>
            <button
              type="button"
              onClick={() => downloadBanksBackup(banks)}
              className="btn btn-secondary px-3"
            >
              <Download size={18} aria-hidden="true" />
              <span>Sao lưu</span>
            </button>
          </div>
        </div>
        
        {exportError && (
          <p className="m-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300" role="alert">
            {exportError}
          </p>
        )}

        <div className="overflow-hidden rounded-2xl border border-border bg-surface">
          {banks.map(bank => (
            <div key={bank.id} className={`relative flex min-h-[82px] flex-col gap-3 border-b border-border/70 p-4 transition-all duration-200 last:border-b-0 sm:flex-row sm:items-center sm:justify-between ${activeBankId === bank.id ? 'bg-primary-subtle/45 before:absolute before:left-0 before:top-3 before:h-[calc(100%-1.5rem)] before:w-1 before:rounded-full before:bg-primary' : 'hover:bg-background'}`}>
              <div className="min-w-0 flex-1 cursor-pointer pl-1" onClick={() => setActiveBank(bank.id)}>
                <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                  <h4 className="truncate text-base font-bold text-text">{bank.name}</h4>
                  {activeBankId === bank.id && (
                    <span className="badge badge-primary">
                      <CheckCircle2 size={12} /> Đang chọn
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-text-muted">
                  {bank.report?.usableMultipleChoice ?? bank.questions.length} câu dùng được
                  {' • '}
                  Tạo ngày {new Date(bank.createdAt).toLocaleDateString('vi-VN')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    void handleExport(bank);
                  }}
                  disabled={Boolean(exportingBankId)}
                  className="btn btn-secondary shrink-0 px-3 disabled:cursor-wait"
                  title={`Xuất ${bank.name} thành PDF Quizlet`}
                  aria-label={`Xuất ${bank.name} thành PDF Quizlet`}
                >
                  {exportingBankId === bank.id ? (
                    <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Download size={18} aria-hidden="true" />
                  )}
                  <span>{exportingBankId === bank.id ? 'Đang xuất...' : 'Xuất PDF'}</span>
                </button>

                {banks.length > 1 && (
                  <button
                    onClick={() => deleteBank(bank.id)}
                    className="icon-btn shrink-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-300"
                    title="Xóa bộ đề"
                    aria-label="Xóa bộ đề"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <TextBankImportDialog open={textImportOpen} onClose={closeTextImport} />
    </div>
  );
}
