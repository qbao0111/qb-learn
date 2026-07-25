import { useState, useEffect } from 'react';
import type { Question } from '../store';
import { useActiveQuestions } from '../hooks/useActiveQuestions';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { playSound } from '../lib/sound';

export function ExamMode() {
  const activeQuestions = useActiveQuestions();
  
  const [examState, setExamState] = useState<'setup' | 'running' | 'result'>('setup');
  const [numQuestions, setNumQuestions] = useState(20);
  
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  
  // Timer state
  const [timeLimit, setTimeLimit] = useState(30); // minutes
  const [timeLeft, setTimeLeft] = useState(0); // seconds
  const [timeSpent, setTimeSpent] = useState(0);

  // Setup options
  const maxQuestions = activeQuestions.length;

  useEffect(() => {
    let timer: any;
    if (examState === 'running' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setTimeSpent(timeLimit * 60);
            setExamState('result');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [examState, timeLeft, timeLimit]);

  const startExam = () => {
    const qCount = Math.min(numQuestions, maxQuestions);
    const shuffled = [...activeQuestions].sort(() => Math.random() - 0.5).slice(0, qCount);
    
    setExamQuestions(shuffled);
    setAnswers({});
    setTimeLeft(timeLimit * 60);
    setExamState('running');
  };

  const handleSubmit = () => {
    if (examState !== 'running') return;
    
    // Calculate time spent
    const totalSeconds = timeLimit * 60;
    setTimeSpent(totalSeconds - Math.max(0, timeLeft));
    setExamState('result');
    playSound('complete');
  };

  const calculateScore = () => {
    let correct = 0;
    examQuestions.forEach(q => {
      const selected = answers[q.id];
      if (!selected) return;
      if (q.answer === selected || (q.answerKeys && q.answerKeys.includes(selected))) {
        correct++;
      }
    });
    return correct;
  };

  if (activeQuestions.length === 0) {
    return (
      <div className="text-center mt-20 text-text-muted">
        Không có câu hỏi nào. Vui lòng import bộ đề mới.
      </div>
    );
  }

  if (examState === 'setup') {
    return (
      <div className="w-full max-w-xl mx-auto bg-surface border border-border rounded-2xl p-8 shadow-sm mt-8">
        <h2 className="text-2xl font-bold mb-6 text-text flex items-center gap-3">
          Thiết lập bài kiểm tra
        </h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Số lượng câu hỏi (tối đa {maxQuestions})
            </label>
            <input 
              type="number" 
              min="1" 
              max={maxQuestions}
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:border-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">
              Thời gian làm bài (Phút)
            </label>
            <input 
              type="number" 
              min="1" 
              max="180"
              value={timeLimit}
              onChange={(e) => setTimeLimit(Number(e.target.value))}
              className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:border-primary"
            />
          </div>
          
          <button 
            onClick={startExam}
            className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-colors shadow-lg shadow-primary/25 mt-4"
          >
            Bắt đầu làm bài
          </button>
        </div>
      </div>
    );
  }

  if (examState === 'result') {
    const score = calculateScore();
    const percent = Math.round((score / examQuestions.length) * 100);
    const m = Math.floor(timeSpent / 60);
    const s = timeSpent % 60;

    return (
      <div className="w-full max-w-3xl mx-auto space-y-8 pb-12">
        <div className="bg-surface border border-border rounded-2xl p-8 text-center shadow-sm">
          <h2 className="text-3xl font-bold mb-2">Kết quả bài thi</h2>
          <p className="text-text-muted mb-8">Thời gian hoàn thành: {m} phút {s} giây</p>
          
          <div className="flex items-center justify-center gap-12 mb-8">
            <div>
              <div className="text-5xl font-black text-primary mb-2">{score}/{examQuestions.length}</div>
              <div className="text-text-muted">Câu đúng</div>
            </div>
            <div className="h-20 w-px bg-border"></div>
            <div>
              <div className={`text-5xl font-black mb-2 ${percent >= 80 ? 'text-green-500' : percent >= 50 ? 'text-orange-500' : 'text-red-500'}`}>
                {percent}%
              </div>
              <div className="text-text-muted">Độ chính xác</div>
            </div>
          </div>
          
          <button 
            onClick={() => setExamState('setup')}
            className="px-8 py-3 bg-surface-2 text-text font-medium rounded-xl hover:bg-border transition-colors mr-4"
          >
            Làm bài mới
          </button>
        </div>
        
        <div className="space-y-6">
          <h3 className="text-xl font-bold">Chi tiết đáp án</h3>
          {examQuestions.map((q, idx) => {
            const selected = answers[q.id];
            const isCorrect = q.answer === selected || (q.answerKeys && q.answerKeys.includes(selected));
            const correctAnswerText = q.options.find(o => o.key === q.answer)?.text || q.answer;
            
            return (
              <div key={q.id} className={`bg-surface border rounded-2xl p-6 ${isCorrect ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'}`}>
                <div className="flex gap-4">
                  <div className="mt-1">
                    {isCorrect ? <CheckCircle2 className="text-green-500" /> : <XCircle className="text-red-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold mb-4">Câu {idx + 1}: {q.question}</p>
                    
                    <div className="space-y-2 mb-4">
                      {q.options.map(opt => {
                        const isThisSelected = selected === opt.key;
                        const isThisCorrect = q.answer === opt.key || (q.answerKeys && q.answerKeys.includes(opt.key));
                        
                        let optClass = "p-3 rounded-lg border text-sm ";
                        if (isThisCorrect) {
                          optClass += "bg-green-100 border-green-300 text-green-900 font-semibold";
                        } else if (isThisSelected && !isThisCorrect) {
                          optClass += "bg-red-100 border-red-300 text-red-900";
                        } else {
                          optClass += "bg-surface border-border opacity-60";
                        }
                        
                        return (
                          <div key={opt.key} className={optClass}>
                            <strong>{opt.key}.</strong> {opt.text}
                          </div>
                        );
                      })}
                    </div>
                    
                    {!isCorrect && (
                      <div className="bg-white p-3 rounded-lg border border-border text-sm">
                        <span className="font-semibold text-text-muted">Đáp án đúng:</span> {q.answer}. {correctAnswerText}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Running state
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="w-full max-w-3xl mx-auto relative pb-24">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border py-4 mb-8 flex items-center justify-between">
        <div className="font-medium text-text-muted">
          Đã làm: <span className="text-primary font-bold">{answeredCount}/{examQuestions.length}</span>
        </div>
        <div className={`flex items-center gap-2 font-bold text-lg ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-text'}`}>
          <Clock size={20} />
          {m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}
        </div>
        <button 
          onClick={() => {
            if (confirm('Bạn có chắc chắn muốn nộp bài?')) handleSubmit();
          }}
          className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover"
        >
          Nộp bài
        </button>
      </div>
      
      {/* Questions List */}
      <div className="space-y-8">
        {examQuestions.map((q, idx) => (
          <div key={q.id} className="bg-surface border border-border rounded-2xl p-8 shadow-sm">
            <h3 className="text-xl font-bold text-text mb-6">
              Câu {idx + 1}: <span className="font-normal">{q.question}</span>
            </h3>
            <div className="space-y-3">
              {q.options.map((opt) => {
                const isSelected = answers[q.id] === opt.key;
                return (
                  <label 
                    key={opt.key}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-surface-2'}`}
                  >
                    <input 
                      type="radio" 
                      name={`q-${q.id}`} 
                      value={opt.key}
                      checked={isSelected}
                      onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt.key }))}
                      className="w-5 h-5 text-primary focus:ring-primary"
                    />
                    <div className="flex-1 text-base">
                      <strong className="mr-2 text-primary">{opt.key}.</strong>
                      {opt.text}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
