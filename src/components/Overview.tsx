import { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  CheckCircle2,
  X,
  Download,
  LoaderCircle,
} from 'lucide-react';
import { useStore } from '../store';
import { parseQuizletPdf } from '../lib/pdf-loader';
import {
  prepareImportedQuestions,
  suggestBankName,
} from '../lib/import-bank';
import { downloadQuizletPdf } from '../lib/quizlet-pdf-export';

export function Overview() {
  const { banks, activeBankId, setActiveBank, addBank, deleteBank } = useStore();
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState<'idle' | 'selected' | 'success' | 'error'>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bankName, setBankName] = useState('');
  const [exportingBankId, setExportingBankId] = useState<string | null>(null);
  const [exportError, setExportError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      const { questions, report } = prepareImportedQuestions(parsedQuestions);
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
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-12">
      {/* Upload Section */}
      <section className="bg-surface rounded-2xl border border-border p-8 shadow-sm">
        <h3 className="text-xl font-bold mb-2 flex items-center gap-2 text-text">
          <Upload className="text-primary" />
          Tạo bộ đề mới
        </h3>
        <p className="text-text-muted mb-6">Nhập trực tiếp từ file PDF xuất từ Quizlet (Quizlet Print).</p>
        
        <div
          className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
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

      {/* Bank Manager */}
      <section className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="p-6 border-b border-border">
          <h3 className="text-xl font-bold text-text">Quản lý bộ đề</h3>
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
