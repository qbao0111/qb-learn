import { useState } from 'react';
import { useStore, type Question } from '../store';
import { Plus, Pencil, Trash2, Database, AlertTriangle } from 'lucide-react';
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
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <Database size={48} className="text-border mb-4" />
        <h2 className="mb-2 text-2xl font-bold text-text">Quản lý Dữ liệu</h2>
        <p className="text-text-secondary">Vui lòng tạo hoặc chọn một bộ đề ở Tổng quan trước khi quản lý.</p>
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
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-3 text-2xl font-bold leading-tight text-text">
            <Database className="text-primary" />
            Quản lý Bộ đề
          </h2>
          <p className="mt-1 text-text-secondary">Đang xem: <span className="font-semibold text-text">{activeBank.name}</span> ({activeBank.questions.length} câu hỏi)</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="btn btn-primary shrink-0 px-4"
        >
          <Plus size={20} />
          Thêm câu hỏi mới
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pb-12 pr-2">
        {activeBank.questions.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-text-muted">Bộ đề này chưa có câu hỏi nào.</p>
          </div>
        ) : (
          activeBank.questions.map((q, index) => (
            <div key={q.id} className="card card-hover group p-5 sm:p-6">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h3 className="mb-4 text-lg font-bold leading-relaxed text-text">
                    <span className="text-primary mr-2">Câu {index + 1}:</span>
                    {q.question}
                  </h3>
                  {q.imageDataUrl && (
                    <div className="mb-4">
                      <QuestionImage src={q.imageDataUrl} compact />
                    </div>
                  )}
                  
                  {q.options && q.options.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      {q.options.map((opt) => {
                        const isCorrect = getQuestionAnswerKeys(q).includes(opt.key);
                        return (
                          <div 
                            key={opt.key} 
                              className={`rounded-xl border px-4 py-2 text-sm leading-6 ${isCorrect ? 'border-emerald-200 bg-emerald-50 text-emerald-900 font-semibold' : 'border-transparent bg-background text-text-secondary'}`}
                          >
                            <span className="font-bold mr-2">{opt.key}.</span>
                            {opt.text}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                      <div className="mb-4 inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-600 dark:bg-orange-950/50 dark:text-orange-300">
                      <AlertTriangle size={16} />
                      Câu hỏi không có đáp án trắc nghiệm
                    </div>
                  )}
                  
                </div>
                
                <div className="flex shrink-0 flex-col gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                  <button
                    onClick={() => setEditingQuestion(q)}
                    className="icon-btn"
                    title="Sửa câu hỏi"
                    aria-label="Sửa câu hỏi"
                  >
                    <Pencil size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                      className="icon-btn hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-300"
                    title="Xoá câu hỏi"
                    aria-label="Xoá câu hỏi"
                  >
                    <Trash2 size={20} />
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
