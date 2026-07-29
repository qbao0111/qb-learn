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

  // Some Quizlet exports print the key, repeat the correct option text, then
  // continue with an explanation on the following rows:
  // "D. Wrong option: B. Correct option text"
  const answerWithText = fullText.match(/^(.*):\s*([A-Z])\.\s*(.+)$/i);
  if (answerWithText) {
    return {
      line: answerWithText[1].trim(),
      answer: answerWithText[2].toUpperCase(),
      supplement: answerWithText[3].trim(),
    };
  }

  const keyWithPeriod = fullText.match(/^(.*):\s*([A-Z])\.\s*$/i);
  if (keyWithPeriod) {
    return {
      line: keyWithPeriod[1].trim(),
      answer: keyWithPeriod[2].toUpperCase(),
      supplement: "",
    };
  }

  const keyOnly =
    fullText.match(/^(.*):\s*([A-Z]{1,26})$/)
    ?? fullText.match(
      /^(.*):\s*([A-Z](?:\s*[,;/]\s*[A-Z]|\s+[A-Z]){0,25})$/i,
    );
  if (keyOnly) {
    return {
      line: keyOnly[1].trim(),
      answer: keyOnly[2].trim(),
      supplement: "",
    };
  }

  return null;
}

export function parseAnswerKeys(answer: string) {
  const compactAnswer = cleanText(answer).replace(/[.,;:]/g, " ");
  const answerKeys =
    compactAnswer.match(/^[A-Z](?:\s+[A-Z]){0,25}(?=\s|$)/i)?.[0].toUpperCase().match(/[A-Z]/g) ||
    compactAnswer.match(/^[A-Z]{1,26}(?=\s|$)/)?.[0].split("") ||
    [];
  return [...new Set(answerKeys)];
}

export function parseQuizletRows(allRows: any[]) {
  const answerByNumber = new Map<number, string>();
  const supplementByNumber = new Map<number, string[]>();
  const leftLines: string[] = [];
  let pendingAnswerNumber: number | null = null;
  let pendingSupplementNumber: number | null = null;

  const appendSupplement = (questionNumber: number, value: string) => {
    const text = cleanText(value);
    if (!text) return;
    const current = supplementByNumber.get(questionNumber) || [];
    current.push(text);
    supplementByNumber.set(questionNumber, current);
  };

  for (const row of allRows) {
    const fullLine = joinLine(row.parts);
    const questionStart = fullLine.match(/^\W*(\d+)\.\s*(.*)$/);

    // A numbered question always ends any answer/explanation block, including
    // when the explanation flowed onto the next PDF page.
    if (questionStart) {
      pendingAnswerNumber = Number(questionStart[1]);
      pendingSupplementNumber = null;
      leftLines.push(fullLine);
      continue;
    }

    const inlineAnswer = splitInlineAnswer(row.parts);

    if (inlineAnswer) {
      if (inlineAnswer.line) leftLines.push(inlineAnswer.line);
      if (pendingAnswerNumber) {
        answerByNumber.set(pendingAnswerNumber, inlineAnswer.answer);
        pendingSupplementNumber = pendingAnswerNumber;
        appendSupplement(pendingAnswerNumber, inlineAnswer.supplement);
      }
      continue;
    }

    // After an inline answer, every non-numbered row belongs to the repeated
    // answer text or its explanation. Do not append those rows to option D.
    if (pendingSupplementNumber) {
      appendSupplement(pendingSupplementNumber, fullLine);
      continue;
    }

    const leftParts = row.parts.filter((part: any) => part.x < 420);
    const rightParts = row.parts.filter((part: any) => part.x >= 420);
    
    let leftLine = joinLine(leftParts);
    let rightLine = joinLine(rightParts);

    // If rightLine doesn't look like an answer key, this is likely a single-column layout
    const trimmedRightLine = rightLine.trim();
    const isRightColumnAnswer = rightLine && (
      /^[A-Z]{1,26}$/.test(trimmedRightLine)
      || /^[A-Z](?:\s*[,;/]\s*[A-Z]|\s+[A-Z]){0,25}$/i.test(trimmedRightLine)
    );

    if (!isRightColumnAnswer) {
      leftLine = fullLine;
      rightLine = "";
    }

    if (leftLine) leftLines.push(leftLine);
    if (rightLine && pendingAnswerNumber) {
      const current = answerByNumber.get(pendingAnswerNumber);
      answerByNumber.set(pendingAnswerNumber, current ? `${current} ${rightLine}` : rightLine);
    }
  }

  const questions: any[] = [];
  let current: any = null;
  let currentOption: any = null;

  const extractExplanation = (question: any, answerKey: string) => {
    const supplement = cleanText((supplementByNumber.get(question.id) || []).join(" "));
    if (!supplement) return "";

    const correctOptionText = cleanText(
      question.options.find((option: any) => option.key.toUpperCase() === answerKey)?.text || "",
    );
    let explanation = supplement;

    if (
      correctOptionText &&
      explanation.toLocaleLowerCase().startsWith(correctOptionText.toLocaleLowerCase())
    ) {
      explanation = explanation.slice(correctOptionText.length).trim();
    }

    return cleanText(explanation)
      .replace(/^\(\s*(?:giải\s*thích\s*:)?\s*/i, "")
      .replace(/\)\s*$/, "")
      .trim();
  };

  const pushCurrent = () => {
    if (!current) return;
    current.question = cleanText(current.question);
    current.options = current.options.map((option: any) => ({
      key: option.key,
      text: cleanText(option.text),
    }));
    let rawAnswer = cleanText(answerByNumber.get(current.id) || "");
    if (!rawAnswer && answerByNumber.has(current.id + 1) && current.options.length >= 2) {
      const nextAnswer = cleanText(answerByNumber.get(current.id + 1) || "");
      if (/^[A-Z](?:\.|\b)/i.test(nextAnswer)) rawAnswer = nextAnswer;
    }
    const validOptionKeys = new Set(current.options.map((option: any) => option.key));
    current.answerKeys = parseAnswerKeys(rawAnswer).filter((key) => validOptionKeys.has(key));
    current.answerKey = current.answerKeys[0] || "";
    current.answer = current.answerKey || rawAnswer;
    current.explanation = extractExplanation(current, current.answerKey);
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
    const optionMatch = line.match(/^\W*([A-Z])\.\s*(.*)$/i);
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
