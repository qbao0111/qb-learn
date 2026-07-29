interface QuestionImageProps {
  src?: string;
  alt?: string;
  compact?: boolean;
}

export function QuestionImage({
  src,
  alt = 'Hình minh họa cho câu hỏi',
  compact = false,
}: QuestionImageProps) {
  if (!src) return null;

  return (
    <figure
      className={`overflow-hidden rounded-2xl border border-border bg-white ${
        compact ? 'max-w-md' : 'mx-auto w-full max-w-2xl'
      }`}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`w-full object-contain p-2 ${compact ? 'max-h-48' : 'max-h-[360px]'}`}
      />
    </figure>
  );
}
