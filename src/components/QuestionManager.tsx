import { useState } from 'react';
import { useStore, type Question } from '../store';
import { Plus, Pencil, Trash2, Database, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { QuestionEditor } from './QuestionEditor';
import { getQuestionAnswerKeys } from '../lib/answer-utils';
import { QuestionImage } from './QuestionImage';

export function QuestionManager() {
  const { activeBankId, banks, deleteQuestion, addQuestion, updateQuestion } = useStore();
  const activeBank = banks.find(b => b.id === activeBankId);
  
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  if (!activeBankId || !activeBank) {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-md flex-col items-center justify-center p-8 text-center">
        <div className="flex size-16 items-center justify-center rounded-3xl bg-surface-2 text-text-muted mb-4">
          <Database size={32} />
        </div>
        <h2 className="mb-2 text-xl font-bold text-text">Chưa chọn bộ đề</h2>
        <p className="text-xs text-text-secondary">Vui lòng tạo hoặc chọn một bộ đề ở Trang chủ trước khi quản lý.</p>
      </div>
    );
  }

  const handleDelete = (id: number) => {
    if (confirm('Bạn có chắc chắn muốn xoá câu hỏi này không?')) {
      deleteQuestion(activeBankId, id);
    }
  };

  const handleSave = (questionData: Omit<Question, 'id'>) => {
    if (isAdding) {
      addQuestion(activeBankId, questionData);
      setIsAdding(false);
    } else if (editingQuestion) {
      updateQuestion(activeBankId, editingQuestion.id, questionData);
      setEditingQuestion(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-1 py-2 pb-16">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/70 pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-text truncate">
              {activeBank.name}
            </h2>
            <span className="badge badge-primary text-xs shrink-0">
              {activeBank.questions.length} câu hỏi
            </span>
          </div>
          <p className="text-xs text-text-muted">Quản lý, chỉnh sửa nội dung hoặc thêm câu hỏi mới vào bộ đề.</p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="btn btn-primary shrink-0 px-4 py-2.5 text-sm font-bold shadow-md shadow-primary/25"
        >
          <Plus size={18} />
          <span>Thêm câu hỏi</span>
        </button>
      </div>

      {/* Questions list */}
      <div className="space-y-4">
        {activeBank.questions.length === 0 ? (
          <div className="elevated-card p-12 text-center rounded-3xl">
            <p className="text-sm font-semibold text-text-muted mb-3">Bộ đề này chưa có câu hỏi nào.</p>
            <button onClick={() => setIsAdding(true)} className="btn btn-primary px-5 py-2 text-xs font-bold">
              <Plus size={16} /> Thêm câu đầu tiên
            </button>
          </div>
        ) : (
          activeBank.questions.map((q, index) => (
            <div 
              key={q.id} 
              className="elevated-card p-5 sm:p-6 rounded-2xl transition-all hover:border-primary/40 group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge badge-muted text-xs">
                      Câu {index + 1} • #{q.id}
                    </span>
                  </div>

                  <h3 className="mb-3 text-base sm:text-lg font-bold leading-relaxed text-text">
                    {q.question}
                  </h3>

                  {q.imageDataUrl && (
                    <div className="mb-4 max-h-44">
                      <QuestionImage src={q.imageDataUrl} compact />
                    </div>
                  )}
                  
                  {q.options && q.options.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {q.options.map((opt) => {
                        const isCorrect = getQuestionAnswerKeys(q).includes(opt.key);
                        return (
                          <div 
                            key={opt.key} 
                            className={`rounded-xl border px-3.5 py-2 text-xs sm:text-sm leading-relaxed flex items-center gap-2 ${
                              isCorrect 
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-950 font-bold dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200' 
                                : 'border-border bg-surface-2/60 text-text-secondary'
                            }`}
                          >
                            <span className={`size-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                              isCorrect ? 'bg-emerald-600 text-white' : 'bg-surface border border-border text-text-muted'
                            }`}>
                              {opt.key}
                            </span>
                            <span className="flex-1 truncate">{opt.text}</span>
                            {isCorrect && <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                      <AlertTriangle size={14} />
                      Câu hỏi tự luận / không có lựa chọn
                    </div>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => setEditingQuestion(q)}
                    className="icon-btn min-h-8 min-w-8 rounded-lg"
                    title="Chỉnh sửa câu hỏi"
                    aria-label="Chỉnh sửa câu hỏi"
                  >
                    <Pencil size={17} />
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="icon-btn min-h-8 min-w-8 rounded-lg text-text-muted hover:bg-danger-subtle hover:text-danger"
                    title="Xoá câu hỏi"
                    aria-label="Xoá câu hỏi"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {(isAdding || editingQuestion) && (
        <QuestionEditor
          initialData={editingQuestion || undefined}
          onSave={handleSave}
          onCancel={() => {
            setIsAdding(false);
            setEditingQuestion(null);
          }}
        />
      )}
    </div>
  );
}

