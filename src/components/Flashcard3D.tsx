import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { playSound } from '../lib/sound';
import { getQuestionAnswerKeys } from '../lib/answer-utils';
import { QuestionImage } from './QuestionImage';
import { CheckCircle2, RotateCw, Lightbulb } from 'lucide-react';

export interface Question {
  id: number;
  question: string;
  options: { key: string; text: string }[];
  answer: string;
  answerKey?: string;
  answerKeys?: string[];
  explanation?: string;
  metadata?: string;
  imageDataUrl?: string;
}

interface Flashcard3DProps {
  question: Question;
  index: number;
}

export function Flashcard3D({ question, index }: Flashcard3DProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Pointer tracking for tilt effect
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 40 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 40 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["6deg", "-6deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-6deg", "6deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  // Reset flip when question changes
  useEffect(() => {
    setIsFlipped(false);
  }, [question]);

  // Handle spacebar to flip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => {
          playSound('flip');
          return !prev;
        });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const answerKeys = getQuestionAnswerKeys(question);
  const correctAnswerText = answerKeys
    .map((key) => {
      const text = question.options.find((option) => option.key === key)?.text;
      return text ? `${key}. ${text}` : key;
    })
    .join(' · ');

  return (
    <div className="flex w-full justify-center py-3 perspective-1200 sm:py-5">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={() => {
          setIsFlipped(!isFlipped);
          playSound('flip');
        }}
        style={{ 
          rotateX, 
          rotateY,
          minHeight: 'clamp(400px, 58vh, 600px)' 
        }}
        className="relative w-full max-w-4xl cursor-pointer select-none"
        whileHover={{ scale: 1.008 }}
        whileTap={{ scale: 0.99 }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.code === 'Space') {
            e.preventDefault();
            setIsFlipped(!isFlipped);
          }
        }}
      >
        <motion.div
          initial={false}
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.5, type: "spring", stiffness: 220, damping: 24 }}
          className="w-full h-full relative"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* FRONT FACE */}
          <div
            className="elevated-card absolute inset-0 flex h-full w-full flex-col justify-between p-6 sm:p-8 rounded-3xl"
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-text-muted">
              <span className="badge badge-muted">
                Thẻ #{index + 1}
              </span>
              <span className="flex items-center gap-1.5 text-primary">
                <RotateCw size={13} /> Nhấn để xem đáp án
              </span>
            </div>

            {/* Content Center */}
            <div className="my-auto flex flex-col items-center text-center py-4">
              <h3 className="mb-6 max-w-3xl text-lg font-bold leading-relaxed text-text sm:text-2xl sm:leading-relaxed">
                {question.question}
              </h3>

              {question.imageDataUrl && (
                <div className="mb-6 max-h-44">
                  <QuestionImage src={question.imageDataUrl} compact />
                </div>
              )}

              {question.options && question.options.length > 0 && (
                <div className="grid w-full max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2 text-left">
                  {question.options.map((opt) => (
                    <div 
                      key={opt.key} 
                      className="rounded-xl border border-border bg-surface-2/60 p-3 text-xs sm:text-sm font-normal text-text-secondary leading-relaxed transition-colors"
                    >
                      <span className="text-primary font-semibold mr-1.5">{opt.key}.</span>
                      <span>{opt.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Indicator */}
            <div className="text-center text-[11px] font-normal text-text-muted">
              Nguồn câu hỏi #{question.id}
            </div>
          </div>

          {/* BACK FACE */}
          <div
            className="elevated-card absolute inset-0 flex h-full w-full flex-col justify-between p-6 sm:p-8 rounded-3xl border-emerald-300/60 dark:border-emerald-800"
            style={{ 
              backfaceVisibility: "hidden", 
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)"
            }}
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-text-muted">
              <span className="badge badge-success">
                <CheckCircle2 size={13} /> Đáp án đúng
              </span>
              <span className="flex items-center gap-1.5 text-text-muted">
                <RotateCw size={13} /> Nhấn để lật lại câu hỏi
              </span>
            </div>

            {/* Content Center */}
            <div className="my-auto flex flex-col items-center text-center py-4 space-y-4">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md shadow-emerald-500/25">
                <CheckCircle2 size={30} />
              </div>

              <div className="max-w-2xl">
                <h3 className="text-xl font-bold leading-relaxed text-emerald-600 dark:text-emerald-400 sm:text-2xl">
                  {correctAnswerText}
                </h3>
              </div>

              {question.explanation ? (
                <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 p-4 text-left text-xs sm:text-sm font-normal text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 max-w-xl">
                  <Lightbulb size={17} className="shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  <div>
                    <strong className="block mb-0.5 text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Giải thích chi tiết</strong>
                    {question.explanation}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-text-muted font-normal">
                  Ghi nhớ kĩ các từ khoá của đáp án này nhé!
                </p>
              )}
            </div>

            {/* Bottom Indicator */}
            <div className="text-center text-[11px] font-normal text-text-muted">
              Thẻ #{index + 1} • Nguồn #{question.id}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

