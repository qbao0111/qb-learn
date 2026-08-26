import {
  Check,
  ClipboardPaste,
  ImagePlus,
  LoaderCircle,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
} from 'react';
import type { Question } from '../store';
import { getQuestionAnswerKeys } from '../lib/answer-utils';
import { recognizeQuestionImage } from '../lib/question-image-ocr';
import { parseQuestionImageText } from '../lib/question-image-parser';
import { createQuestionImageDataUrl } from '../lib/question-image';

interface QuestionEditorProps {
  initialData?: Question;
  onSave: (question: Omit<Question, 'id'>) => void;
  onCancel: () => void;
}

type OcrState =
  | { type: 'idle'; message: string }
  | { type: 'loading'; message: string; progress: number }
  | { type: 'success' | 'error'; message: string };

const EMPTY_OPTIONS = ['A', 'B', 'C', 'D'].map((key) => ({ key, text: '' }));
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export function QuestionEditor({ initialData, onSave, onCancel }: QuestionEditorProps) {
  const [questionText, setQuestionText] = useState(initialData?.question || '');
  const [options, setOptions] = useState<{ key: string; text: string }[]>(
    initialData?.options?.length ? initialData.options : EMPTY_OPTIONS,
  );
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>(
    initialData ? getQuestionAnswerKeys(initialData) : ['A'],
  );
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState(initialData?.imageDataUrl || '');
  const [imageName, setImageName] = useState('');
  const [illustrationPreviewUrl, setIllustrationPreviewUrl] = useState(
    initialData?.imageDataUrl || '',
  );
  const [illustrationName, setIllustrationName] = useState(
    initialData?.imageDataUrl ? 'Ảnh minh hoạ đã lưu' : '',
  );
  const [ocrState, setOcrState] = useState<OcrState>({
    type: 'idle',
    message: 'Tải ảnh lên hoặc dán ảnh từ clipboard để tự động điền nội dung.',
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const illustrationInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef('');
  const ocrRequestRef = useRef(0);

  useEffect(() => {
    return () => {
      ocrRequestRef.current += 1;
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const handleOptionChange = (key: string, text: string) => {
    setOptions((current) =>
      current.map((option) => (option.key === key ? { ...option, text } : option)),
    );
  };

  const addOption = () => {
    setOptions((current) => {
      if (current.length >= 26) return current;
      return [...current, { key: String.fromCharCode(65 + current.length), text: '' }];
    });
  };

  const removeLastOption = () => {
    setOptions((current) => {
      if (current.length <= 2) return current;
      const removedKey = current[current.length - 1].key;
      setSelectedAnswers((answers) => answers.filter((key) => key !== removedKey));
      return current.slice(0, -1);
    });
  };

  const toggleAnswer = (key: string) => {
    setSelectedAnswers((current) =>
      current.includes(key)
        ? current.filter((answerKey) => answerKey !== key)
        : [...current, key],
    );
  };

  const processOcrImage = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setOcrState({ type: 'error', message: 'Tệp đã chọn không phải là hình ảnh.' });
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setOcrState({ type: 'error', message: 'Ảnh phải nhỏ hơn 10 MB.' });
      return;
    }

    const requestId = ocrRequestRef.current + 1;
    ocrRequestRef.current = requestId;

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    const nextPreviewUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextPreviewUrl;
    setImagePreviewUrl(nextPreviewUrl);
    setImageName(file.name || 'Ảnh từ clipboard');
    setOcrState({ type: 'loading', message: 'Đang chuẩn bị nhận diện ảnh…', progress: 0 });

    try {
      const rawText = await recognizeQuestionImage(nextPreviewUrl, ({ status, progress }) => {
        if (ocrRequestRef.current !== requestId) return;
        const percentage = Math.round(progress * 100);
        setOcrState({
          type: 'loading',
          message: status === 'recognizing text'
            ? `Đang đọc nội dung ảnh… ${percentage}%`
            : 'Đang tải bộ nhận diện…',
          progress,
        });
      });

      if (ocrRequestRef.current !== requestId) return;
      const parsed = parseQuestionImageText(rawText);

      if (parsed.question) {
        setQuestionText(parsed.question);
      }
      if (parsed.options.length) {
        setOptions((current) => {
          const highestParsedIndex = Math.max(
            3,
            ...parsed.options.map((option) => option.key.charCodeAt(0) - 65),
          );
          const keys = Array.from(
            { length: Math.min(26, highestParsedIndex + 1) },
            (_, index) => String.fromCharCode(65 + index),
          );
          return keys.map((key) => ({
            key,
            text:
              parsed.options.find((option) => option.key === key)?.text
              ?? current.find((option) => option.key === key)?.text
              ?? '',
          }));
        });
      }

      const detail = parsed.warnings.length
        ? parsed.warnings.join(' ')
        : 'Đã điền câu hỏi và các lựa chọn.';
      setOcrState({
        type: parsed.question && parsed.options.length >= 2 ? 'success' : 'error',
        message: `${detail} Hãy kiểm tra nội dung và chọn đáp án đúng.`,
      });
    } catch (error) {
      if (ocrRequestRef.current !== requestId) return;
      console.error('Question image OCR failed', error);
      setOcrState({
        type: 'error',
        message: 'Không thể đọc ảnh này. Hãy thử ảnh rõ hơn hoặc nhập nội dung thủ công.',
      });
    }
  }, []);

  const handleClipboardButton = async () => {
    try {
      if (!navigator.clipboard?.read) {
        throw new Error('Clipboard image reading is not supported');
      }
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((type) => type.startsWith('image/'));
        if (!imageType) continue;
        const blob = await item.getType(imageType);
        await processOcrImage(
          new File([blob], 'Ảnh từ clipboard', { type: imageType }),
        );
        return;
      }
      setOcrState({ type: 'error', message: 'Clipboard hiện không có hình ảnh.' });
    } catch (error) {
      console.error('Clipboard image read failed', error);
      setOcrState({
        type: 'error',
        message: 'Không đọc được clipboard. Hãy nhấn Ctrl+V trong cửa sổ này hoặc tải ảnh lên.',
      });
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const image = Array.from(event.dataTransfer.files).find((file) =>
      file.type.startsWith('image/'),
    );
    if (image) {
      void processOcrImage(image);
    } else {
      setOcrState({ type: 'error', message: 'Hãy thả một tệp hình ảnh vào đây.' });
    }
  };

  const processIllustration = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setOcrState({ type: 'error', message: 'Tệp minh hoạ đã chọn không phải là hình ảnh.' });
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setOcrState({ type: 'error', message: 'Ảnh minh hoạ phải nhỏ hơn 10 MB.' });
      return;
    }
    try {
      const storedImage = await createQuestionImageDataUrl(file);
      setImageDataUrl(storedImage);
      setIllustrationPreviewUrl(storedImage);
      setIllustrationName(file.name || 'Ảnh minh hoạ từ clipboard');
    } catch (error) {
      console.error('Question illustration processing failed', error);
      setOcrState({ type: 'error', message: 'Không thể xử lý ảnh minh hoạ này.' });
    }
  };

  const handleIllustrationClipboard = async () => {
    try {
      if (!navigator.clipboard?.read) throw new Error('Clipboard image reading is not supported');
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((type) => type.startsWith('image/'));
        if (!imageType) continue;
        const blob = await item.getType(imageType);
        await processIllustration(
          new File([blob], 'Ảnh minh hoạ từ clipboard', { type: imageType }),
        );
        return;
      }
      setOcrState({ type: 'error', message: 'Clipboard hiện không có ảnh minh hoạ.' });
    } catch (error) {
      console.error('Illustration clipboard read failed', error);
      setOcrState({ type: 'error', message: 'Không đọc được ảnh minh hoạ từ clipboard.' });
    }
  };

  const removeImage = () => {
    setImageDataUrl('');
    setIllustrationPreviewUrl('');
    setIllustrationName('');
  };

  const handleSave = () => {
    if (!questionText.trim()) {
      setOcrState({ type: 'error', message: 'Vui lòng nhập nội dung câu hỏi.' });
      return;
    }
    if (options.filter((option) => option.text.trim()).length < 2) {
      setOcrState({ type: 'error', message: 'Vui lòng nhập ít nhất hai lựa chọn.' });
      return;
    }

    const answerKeys = options
      .map((option) => option.key)
      .filter((key) => selectedAnswers.includes(key));
    if (answerKeys.length === 0) {
      setOcrState({ type: 'error', message: 'Vui lòng chọn ít nhất một đáp án đúng.' });
      return;
    }

    const primaryAnswer = answerKeys[0];
    onSave({
      explanation: initialData?.explanation,
      metadata: initialData?.metadata,
      imageDataUrl: imageDataUrl || undefined,
      question: questionText.trim(),
      options: options.map((option) => ({ ...option, text: option.text.trim() })),
      answer: primaryAnswer,
      answerKey: primaryAnswer,
      answerKeys,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-md"
    >
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="question-editor-title"
      >
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4">
          <div>
            <span className="badge badge-primary text-[11px] mb-1">
              {initialData ? 'Chỉnh sửa' : 'Thêm mới'}
            </span>
            <h2 id="question-editor-title" className="text-xl sm:text-2xl font-extrabold text-text">
              {initialData ? 'Sửa câu hỏi' : 'Thêm câu hỏi mới'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="icon-btn rounded-xl"
            aria-label="Đóng cửa sổ"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
          <section aria-labelledby="image-import-title">
            <div className="mb-2.5 flex items-center gap-2">
              <ImagePlus className="text-primary" size={18} aria-hidden="true" />
              <h3 id="image-import-title" className="text-sm font-bold text-text">
                Nhận diện nhanh từ hình ảnh (OCR)
              </h3>
            </div>

            <div
              className="rounded-2xl border border-dashed border-primary/40 bg-primary-subtle/40 p-4 transition-colors hover:border-primary"
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {imagePreviewUrl ? (
                  <img
                    src={imagePreviewUrl}
                    alt="Ảnh câu hỏi đang được nhận diện"
                    className="h-24 w-full rounded-xl border border-border bg-surface object-contain sm:w-36"
                  />
                ) : (
                  <div className="flex h-24 w-full shrink-0 items-center justify-center rounded-xl border border-border bg-surface sm:w-36">
                    <ImagePlus size={28} className="text-text-muted" aria-hidden="true" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-text">
                    {imageName || 'Kéo thả ảnh chụp câu hỏi vào đây'}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    Hệ thống sẽ tự động đọc nội dung câu hỏi và các lựa chọn A, B, C, D.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input
                      ref={inputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void processOcrImage(file);
                        event.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      disabled={ocrState.type === 'loading'}
                      className="btn btn-primary min-h-9 px-3.5 py-1.5 text-xs font-semibold disabled:cursor-wait"
                    >
                      <Upload size={14} aria-hidden="true" />
                      Tải ảnh lên
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleClipboardButton()}
                      disabled={ocrState.type === 'loading'}
                      className="btn btn-secondary min-h-9 px-3.5 py-1.5 text-xs font-semibold disabled:cursor-wait"
                    >
                      <ClipboardPaste size={14} aria-hidden="true" />
                      Dán từ clipboard
                    </button>
                  </div>
                </div>
              </div>

              {ocrState.type === 'loading' && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-primary/20">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300"
                    style={{ width: `${Math.max(6, ocrState.progress * 100)}%` }}
                  />
                </div>
              )}
              <div
                className={`mt-2.5 flex items-center gap-2 text-xs font-medium ${
                  ocrState.type === 'error'
                    ? 'text-danger'
                    : ocrState.type === 'success'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-text-muted'
                }`}
                role={ocrState.type === 'error' ? 'alert' : 'status'}
                aria-live="polite"
              >
                {ocrState.type === 'loading' && (
                  <LoaderCircle size={14} className="animate-spin shrink-0" aria-hidden="true" />
                )}
                <span>{ocrState.message}</span>
              </div>
            </div>
          </section>

          <section aria-labelledby="illustration-title">
            <div className="mb-2.5 flex items-center gap-2">
              <ImagePlus className="text-emerald-600 dark:text-emerald-400" size={18} aria-hidden="true" />
              <h3 id="illustration-title" className="text-sm font-bold text-text">
                Ảnh minh hoạ cho câu hỏi (tuỳ chọn)
              </h3>
            </div>
            <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {illustrationPreviewUrl ? (
                  <img
                    src={illustrationPreviewUrl}
                    alt="Ảnh minh hoạ đang gắn với câu hỏi"
                    className="h-24 w-full rounded-xl border border-emerald-200 bg-surface object-contain p-1 sm:w-36 dark:border-emerald-800"
                  />
                ) : (
                  <div className="flex h-24 w-full shrink-0 items-center justify-center rounded-xl border border-dashed border-emerald-300 bg-surface sm:w-36 dark:border-emerald-700">
                    <ImagePlus size={28} className="text-emerald-500" aria-hidden="true" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-text">
                    {illustrationName || 'Chưa gắn ảnh minh hoạ'}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    Ảnh sẽ hiển thị cùng câu hỏi trong Thẻ ghi nhớ, chế độ Học, Kiểm tra và PDF.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input
                      ref={illustrationInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void processIllustration(file);
                        event.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => illustrationInputRef.current?.click()}
                      className="btn min-h-9 bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs"
                    >
                      <Upload size={14} aria-hidden="true" />
                      Tải ảnh lên
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleIllustrationClipboard()}
                      className="btn min-h-9 border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-text hover:bg-surface-hover"
                    >
                      <ClipboardPaste size={14} aria-hidden="true" />
                      Dán từ clipboard
                    </button>
                    {imageDataUrl && (
                      <button
                        type="button"
                        onClick={removeImage}
                        className="btn btn-danger min-h-9 px-3.5 py-1.5 text-xs font-semibold"
                      >
                        <X size={14} aria-hidden="true" />
                        Xoá ảnh
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div>
            <label htmlFor="question-text" className="mb-2 block text-sm font-bold text-text">
              Nội dung câu hỏi
            </label>
            <textarea
              id="question-text"
              value={questionText}
              onChange={(event) => setQuestionText(event.target.value)}
              placeholder="Nhập nội dung câu hỏi..."
              className="input h-28 resize-none px-4 py-3 bg-surface text-sm leading-relaxed"
            />
          </div>

          <fieldset className="space-y-3">
            <div className="flex items-center justify-between">
              <legend className="text-sm font-bold text-text">Các lựa chọn đáp án</legend>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={removeLastOption}
                  disabled={options.length <= 2}
                  className="btn btn-secondary min-h-8 rounded-lg px-2.5 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={13} aria-hidden="true" />
                  Bớt lựa chọn
                </button>
                <button
                  type="button"
                  onClick={addOption}
                  disabled={options.length >= 26}
                  className="btn btn-secondary min-h-8 rounded-lg px-2.5 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus size={13} aria-hidden="true" />
                  Thêm lựa chọn
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {options.map((option) => (
                <div key={option.key} className="flex items-center gap-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-bold text-xs text-primary">
                    {option.key}
                  </div>
                  <label htmlFor={`option-${option.key}`} className="sr-only">
                    Lựa chọn {option.key}
                  </label>
                  <input
                    id={`option-${option.key}`}
                    type="text"
                    value={option.text}
                    onChange={(event) => handleOptionChange(option.key, event.target.value)}
                    placeholder={`Nhập nội dung lựa chọn ${option.key}...`}
                    className="input flex-1 bg-surface px-3.5 py-2 text-sm"
                  />
                </div>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <div className="flex items-center justify-between mb-2">
              <legend className="text-sm font-bold text-text">Chọn đáp án đúng</legend>
              <span className="text-xs text-primary font-semibold">Có thể chọn nhiều đáp án</span>
            </div>

            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {options.map((option) => (
                <label
                  key={option.key}
                  className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border text-sm font-bold transition-colors ${
                    selectedAnswers.includes(option.key)
                      ? 'border-primary bg-primary text-white shadow-xs'
                      : 'border-border bg-surface text-text hover:bg-surface-hover'
                  }`}
                >
                  <input
                    type="checkbox"
                    value={option.key}
                    checked={selectedAnswers.includes(option.key)}
                    onChange={() => toggleAnswer(option.key)}
                    className="sr-only"
                  />
                  {option.key}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border/80 bg-surface-2/50 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn-ghost px-5 text-sm"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={ocrState.type === 'loading'}
            className="btn btn-primary px-6 text-sm font-bold shadow-md shadow-primary/25 disabled:cursor-wait"
          >
            <Check size={16} aria-hidden="true" />
            Lưu câu hỏi
          </button>
        </div>
      </div>
    </div>
  );
}


