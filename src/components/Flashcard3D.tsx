import { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { playSound } from '../lib/sound';
import { getQuestionAnswerKeys } from '../lib/answer-utils';
import { QuestionImage } from './QuestionImage';

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

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["7deg", "-7deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-7deg", "7deg"]);

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
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => {
          if (!prev) playSound('flip');
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
    <div className="flex w-full justify-center py-5 perspective-1200 sm:py-8">
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
          minHeight: 'clamp(380px, 54vh, 580px)' 
        }}
        className="relative w-full max-w-4xl cursor-pointer"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
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
          transition={{ duration: 0.6, type: "spring", stiffness: 200, damping: 20 }}
          className="w-full h-full relative preserve-3d"
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* FRONT FACE */}
          <div 
            className="absolute inset-0 flex h-full w-full flex-col items-center justify-center rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-card)] backface-hidden sm:p-8"
            style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
          >
            <div className="absolute left-5 top-4 text-sm font-semibold text-text-muted sm:left-6">
              Thẻ {index + 1} • Nguồn #{question.id}
            </div>
            <div className="badge badge-primary mb-6">
              Câu hỏi
            </div>
            <h3 className="mb-8 max-w-2xl text-center text-xl font-semibold leading-relaxed text-text sm:text-2xl">
              {question.question}
            </h3>
            {question.imageDataUrl && (
              <div className="mb-6">
                <QuestionImage src={question.imageDataUrl} compact />
              </div>
            )}
            <ul className="grid w-full max-w-3xl grid-cols-1 gap-3 md:grid-cols-2">
              {question.options.map((opt, i) => (
                <li key={i} className="rounded-xl border border-border bg-background p-4 text-center text-sm leading-6 text-text-secondary md:text-base">
                  <strong className="text-primary mr-2">{opt.key}.</strong> {opt.text}
                </li>
              ))}
            </ul>
          </div>

          {/* BACK FACE */}
          <div 
            className="absolute inset-0 flex h-full w-full flex-col items-center justify-center rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-card-hover)] backface-hidden sm:p-8"
            style={{ 
              backfaceVisibility: "hidden", 
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)"
            }}
          >
            <div className="absolute left-5 top-4 text-sm font-semibold text-text-muted sm:left-6">
              Thẻ {index + 1} • Nguồn #{question.id}
            </div>
            <div className="badge badge-success mb-6 dark:bg-emerald-950/60 dark:text-emerald-300">
              Đáp án đúng
            </div>
            <h3 className="mb-4 max-w-2xl text-center text-xl font-bold leading-relaxed text-emerald-700 dark:text-emerald-300 sm:text-2xl">
              {correctAnswerText}
            </h3>
            <p className="text-text-muted text-center max-w-xl">
              {question.explanation ? `Gợi ý: ${question.explanation}` : "Hãy ghi nhớ đáp án đúng nhé."}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
