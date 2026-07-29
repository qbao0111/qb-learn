export interface ParsedImageOption {
  key: string;
  text: string;
}

export interface ParsedImageQuestion {
  question: string;
  options: ParsedImageOption[];
  rawText: string;
  warnings: string[];
}

const OPTION_LINE = /^\s*([A-Z])\s*(?:[.):]|[-–—])\s*(.*)$/i;
const LOOSE_OPTION_LINE = /^\s*([A-Z])\s+(.+)$/;
const LEADING_QUESTION_NUMBER = /^\s*(?:question|câu)?\s*\d+\s*[.):\-–—]\s*/i;

function cleanLine(line: string) {
  return line
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

export function parseQuestionImageText(rawText: string): ParsedImageQuestion {
  const lines = rawText
    .replace(/\r/g, '')
    .split('\n')
    .map(cleanLine)
    .filter(Boolean);

  const optionCandidates = lines.flatMap((line, index) => {
    const strictMatch = line.match(OPTION_LINE);
    const match = strictMatch ?? line.match(LOOSE_OPTION_LINE);
    return match
      ? [{ index, key: match[1].toUpperCase(), match, strict: Boolean(strictMatch) }]
      : [];
  });
  const aCandidates = optionCandidates.filter((candidate) => candidate.key === 'A');
  const likelyFirstA = [...aCandidates].reverse().find((candidate) =>
    optionCandidates.some(
      (nextCandidate) =>
        nextCandidate.index > candidate.index && nextCandidate.key === 'B',
    ),
  );
  const optionStartIndex =
    likelyFirstA?.index
    ?? optionCandidates.find((candidate) => candidate.strict)?.index
    ?? (new Set(optionCandidates.map((candidate) => candidate.key)).size >= 2
      ? optionCandidates[0]?.index
      : undefined);

  const questionLines: string[] = [];
  const options: ParsedImageOption[] = [];
  let currentOption: ParsedImageOption | undefined;

  for (const [index, line] of lines.entries()) {
    const optionMatch =
      optionStartIndex !== undefined && index >= optionStartIndex
        ? line.match(OPTION_LINE) ?? line.match(LOOSE_OPTION_LINE)
        : null;

    if (optionMatch) {
      const key = optionMatch[1].toUpperCase();
      const existingOption = options.find((option) => option.key === key);

      if (existingOption) {
        currentOption = existingOption;
        if (optionMatch[2]) {
          currentOption.text = `${currentOption.text} ${optionMatch[2]}`.trim();
        }
      } else {
        currentOption = { key, text: optionMatch[2].trim() };
        options.push(currentOption);
      }
      continue;
    }

    if (currentOption) {
      currentOption.text = `${currentOption.text} ${line}`.trim();
    } else {
      questionLines.push(line);
    }
  }

  const question = questionLines
    .join(' ')
    .replace(LEADING_QUESTION_NUMBER, '')
    .trim();
  const cleanedOptions = options
    .map((option) => ({ ...option, text: option.text.trim() }))
    .filter((option) => option.text);
  const warnings: string[] = [];

  if (!question) {
    warnings.push('Không nhận diện được nội dung câu hỏi.');
  }
  if (cleanedOptions.length < 2) {
    warnings.push('Không nhận diện đủ các lựa chọn. Hãy kiểm tra và nhập bổ sung.');
  }

  return {
    question,
    options: cleanedOptions,
    rawText,
    warnings,
  };
}
