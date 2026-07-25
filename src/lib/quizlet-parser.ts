export const cleanText = (value = "") =>
  String(value)
    // PDF.js 3 emits question numbers as separate items ("1", ".", "Question").
    // Normalize spaces before punctuation so both old and new PDF.js output parse alike.
    .replace(/\s+([.,:;?!])/g, "$1")
    // oxlint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u200b-\u200f\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const joinLine = (parts: any[]) =>
  cleanText(
    [...parts]
      .sort((a, b) => a.x - b.x)
      .map((part) => part.text)
      .join(" "),
  );

export function splitInlineAnswer(parts: any[]) {
  const fullText = joinLine(parts);
  const match = fullText.match(/^(.*):\s*([A-D](?:\s*[,;/]\s*[A-D]|\s+[A-D]){0,3})$/i);
  if (match) {
    return {
      line: match[1].trim(),
      answer: match[2].trim(),
    };
  }
  return null;
}

export function parseAnswerKeys(answer: string) {
  const compactAnswer = cleanText(answer).toUpperCase().replace(/[.,;:]/g, " ");
  const answerKeys =
    compactAnswer.match(/^[A-D](?:\s+[A-D]){0,3}(?=\s|$)/)?.[0].match(/[A-D]/g) ||
    compactAnswer.match(/^[A-D]{1,4}(?=\s|$)/)?.[0].split("") ||
    [];
  return [...new Set(answerKeys)];
}

export function parseQuizletRows(allRows: any[]) {
  const answerByNumber = new Map();
  const leftLines = [];
  let pendingAnswerNumber: number | null = null;

  for (const row of allRows) {
    const inlineAnswer = splitInlineAnswer(row.parts);

    if (inlineAnswer) {
      const numberMatch = inlineAnswer.line.match(/^(\d+)\.\s*(.*)$/);
      if (numberMatch) pendingAnswerNumber = Number(numberMatch[1]);
      if (inlineAnswer.line) leftLines.push(inlineAnswer.line);
      if (pendingAnswerNumber) answerByNumber.set(pendingAnswerNumber, inlineAnswer.answer);
      continue;
    }

    const fullLine = joinLine(row.parts);
    const leftParts = row.parts.filter((part: any) => part.x < 420);
    const rightParts = row.parts.filter((part: any) => part.x >= 420);
    
    let leftLine = joinLine(leftParts);
    let rightLine = joinLine(rightParts);

    // If rightLine doesn't look like an answer key, this is likely a single-column layout
    const isRightColumnAnswer = rightLine && /^[A-D](?:\s*[,;/]\s*[A-D]|\s+[A-D]){0,3}$/i.test(rightLine.trim());

    if (!isRightColumnAnswer) {
      leftLine = fullLine;
      rightLine = "";
    }

    const numberMatch = leftLine.match(/^\W*(\d+)\.\s*(.*)$/);
    if (numberMatch) pendingAnswerNumber = Number(numberMatch[1]);
    
    if (leftLine) leftLines.push(leftLine);
    if (rightLine && pendingAnswerNumber) {
      const current = answerByNumber.get(pendingAnswerNumber);
      answerByNumber.set(pendingAnswerNumber, current ? `${current} ${rightLine}` : rightLine);
    }
  }

  const questions: any[] = [];
  let current: any = null;
  let currentOption: any = null;

  const pushCurrent = () => {
    if (!current) return;
    current.question = cleanText(current.question);
    current.options = current.options.map((option: any) => ({
      key: option.key,
      text: cleanText(option.text),
    }));
    current.answer = cleanText(answerByNumber.get(current.id) || "");
    if (!current.answer && answerByNumber.has(current.id + 1) && current.options.length === 4) {
      const nextAnswer = cleanText(answerByNumber.get(current.id + 1) || "");
      if (/^[A-D](?:\.|\b)/i.test(nextAnswer)) current.answer = nextAnswer;
    }
    current.answerKeys = parseAnswerKeys(current.answer);
    current.answerKey = current.answerKeys[0] || "";
    questions.push(current);
  };

  for (const line of leftLines) {
    const numberMatch = line.match(/^\W*(\d+)\.\s*(.*)$/);
    if (numberMatch) {
      pushCurrent();
      current = {
        id: Number(numberMatch[1]),
        question: numberMatch[2] || "",
        options: [],
        answer: "",
        answerKey: "",
        answerKeys: [],
      };
      currentOption = null;
      continue;
    }

    if (!current) continue;
    const optionMatch = line.match(/^\W*([A-D])\.\s*(.*)$/i);
    if (optionMatch) {
      currentOption = { key: optionMatch[1], text: optionMatch[2] };
      current.options.push(currentOption);
    } else if (currentOption) {
      currentOption.text = `${currentOption.text} ${line}`;
    } else {
      current.question = `${current.question} ${line}`;
    }
  }
  pushCurrent();

  const result = questions.filter((question) => question.id && question.question && question.options.length);
  (result as any)._debugLines = leftLines;
  return result;
}
