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
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Database size={48} className="text-border mb-4" />
        <h2 className="text-2xl font-bold text-text mb-2">Quản lý Dữ liệu</h2>
        <p className="text-text-muted">Vui lòng tạo hoặc chọn một bộ đề ở Tổng quan trước khi quản lý.</p>
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
    <div className="w-full max-w-5xl mx-auto py-8 px-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-text flex items-center gap-3">
            <Database className="text-primary" />
            Quản lý Bộ đề
          </h2>
          <p className="text-text-muted mt-1">Đang xem: <span className="font-semibold text-text">{activeBank.name}</span> ({activeBank.questions.length} câu hỏi)</p>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl font-medium hover:bg-primary-hover transition-colors shadow-sm"
        >
          <Plus size={20} />
          Thêm câu hỏi mới
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-12">
        {activeBank.questions.length === 0 ? (
          <div className="text-center p-12 bg-surface border border-border rounded-2xl">
            <p className="text-text-muted">Bộ đề này chưa có câu hỏi nào.</p>
          </div>
        ) : (
          activeBank.questions.map((q, index) => (
            <div key={q.id} className="bg-surface border border-border rounded-2xl p-6 hover:border-primary/30 transition-colors shadow-sm group">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-text mb-4">
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
                            className={`px-4 py-2 rounded-lg border ${isCorrect ? 'bg-green-50 border-green-200 text-green-900 font-medium dark:bg-green-950/60 dark:border-green-800 dark:text-green-100' : 'bg-surface-2 border-transparent text-text-muted'}`}
                          >
                            <span className="font-bold mr-2">{opt.key}.</span>
                            {opt.text}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-orange-500 mb-4 text-sm bg-orange-50 px-3 py-2 rounded-lg inline-flex dark:bg-orange-950/50 dark:text-orange-300">
                      <AlertTriangle size={16} />
                      Câu hỏi không có đáp án trắc nghiệm
                    </div>
                  )}
                  
                </div>
                
                <div className="flex flex-col gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingQuestion(q)}
                    className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="Sửa câu hỏi"
                  >
                    <Pencil size={20} />
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors dark:hover:bg-red-950/50 dark:hover:text-red-300"
                    title="Xoá câu hỏi"
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
