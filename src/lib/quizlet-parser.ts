import { restoreVietnamesePdfDiacritics } from './text-normalization.ts';

export const cleanText = (value = "") =>
  restoreVietnamesePdfDiacritics(value)
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
  // A colon can also introduce the first choice on a wrapped question row
  // ("... gồm: A. ..."). Only interpret it as a repeated answer when the
  // content before the colon already contains at least one choice marker.
  if (answerWithText && /(?:^|\s)[A-Z]\.\s*/i.test(answerWithText[1])) {
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

function parseTableAnswer(value: string) {
  return cleanText(value).match(/^([A-Z]{1,26})(?:\.|\s|$)/)?.[1] || '';
}

function parseInlineOptions(value: string) {
  const text = cleanText(value);
  const markerPattern = /(?:^|\s)([A-Z])\.\s*/g;
  const markers: Array<{ key: string; start: number; contentStart: number }> = [];
  let match: RegExpExecArray | null;

  while ((match = markerPattern.exec(text))) {
    const key = match[1].toUpperCase();
    const markerStart = match.index + (match[0].startsWith(' ') ? 1 : 0);
    const contentStart = match.index + match[0].length;

    if (!markers.length) {
      if (key === 'A') markers.push({ key, start: markerStart, contentStart });
      continue;
    }

    const expectedKey = String.fromCharCode(markers.at(-1)!.key.charCodeAt(0) + 1);
    if (key === expectedKey) markers.push({ key, start: markerStart, contentStart });
  }

  if (markers.length < 2) return null;

  const question = cleanText(text.slice(0, markers[0].start));
  const options = markers.map((marker, index) => ({
    key: marker.key,
    text: cleanText(text.slice(marker.contentStart, markers[index + 1]?.start ?? text.length)),
  }));

  if (!question || options.some((option) => !option.text)) return null;
  return { question, options };
}

function parseQuizletFlashcardTable(allRows: any[]) {
  const cards: Array<{ text: string; answer: string }> = [];
  let current: { page: number; lines: string[]; answer: string } | null = null;

  const pushCurrent = () => {
    if (!current) return;
    const text = cleanText(current.lines.join(' '));
    if (text) cards.push({ text, answer: current.answer });
  };

  for (const row of allRows) {
    const parts = [...row.parts].sort((a, b) => a.x - b.x);
    const answerPart = parts.find(
      (part: any) => part.x >= 360 && part.x <= 520 && parseTableAnswer(part.text),
    );
    const leftLine = joinLine(
      answerPart
        ? parts.filter((part: any) => part !== answerPart && part.x < answerPart.x - 20)
        : parts.filter((part: any) => part.x < 360),
    );

    // In the numbered Quizlet layout, a far-right key can share the final
    // option row (for example "D. Last option   B"). That is not a table-card
    // boundary; table cards put the question's first line beside the key.
    if (answerPart && leftLine && !/^\W*[A-Z]\.\s/.test(leftLine)) {
      pushCurrent();
      current = {
        page: row.page,
        lines: [leftLine],
        answer: parseTableAnswer(answerPart.text),
      };
      continue;
    }

    if (current && row.page === current.page && leftLine) current.lines.push(leftLine);
  }
  pushCurrent();

  return cards.flatMap((card) => {
    const parsed = parseInlineOptions(card.text);
    if (!parsed) return [];
    const parsedAnswerKeys = parseAnswerKeys(card.answer);
    const lastOption = parsed.options.at(-1);
    const missingNextAnswerKey = parsedAnswerKeys.find(
      (key) => lastOption && key.charCodeAt(0) === lastOption.key.charCodeAt(0) + 1,
    );

    // Some Quizlet sets omit the final option marker in the visible source.
    // Recover a missing correct option when the final text clearly contains
    // two semicolon-delimited choices, e.g. "C. X; Y D. Z; W" with "D."
    // absent from the exported PDF text.
    if (lastOption && missingNextAnswerKey) {
      const split = lastOption.text.match(/^(.+?;\s+.+?)\s+(\p{Lu}[^;]+;\s+.+)$/u);
      if (split) {
        lastOption.text = cleanText(split[1]);
        parsed.options.push({ key: missingNextAnswerKey, text: cleanText(split[2]) });
      }
    }

    const validKeys = new Set(parsed.options.map((option) => option.key));
    const answerKeys = parsedAnswerKeys.filter((key) => validKeys.has(key));
    return [{
      id: 0,
      question: parsed.question,
      options: parsed.options,
      answer: answerKeys[0] || card.answer,
      answerKey: answerKeys[0] || '',
      answerKeys,
      explanation: '',
    }];
  }).map((question, index) => ({ ...question, id: index + 1 }));
}

export function parseQuizletRows(allRows: any[]) {
  const numberedQuestionRows = allRows.filter(
    (row) => /^\W*\d+\.\s*/.test(joinLine(row.parts)),
  ).length;
  if (numberedQuestionRows < 2) {
    const tableQuestions = parseQuizletFlashcardTable(allRows);
    if (tableQuestions.length >= 2) return tableQuestions;
  }

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
      const finalColonIndex = fullLine.lastIndexOf(':');
      const hasOptionsBeforeFinalColon = finalColonIndex >= 0
        && /\sA\.\s*/.test(fullLine.slice(0, finalColonIndex));
      const numberedInlineAnswer = hasOptionsBeforeFinalColon
        ? splitInlineAnswer(row.parts)
        : null;
      if (numberedInlineAnswer) {
        answerByNumber.set(pendingAnswerNumber, numberedInlineAnswer.answer);
        pendingSupplementNumber = pendingAnswerNumber;
        appendSupplement(pendingAnswerNumber, numberedInlineAnswer.supplement);
        leftLines.push(numberedInlineAnswer.line);
      } else {
        leftLines.push(fullLine);
      }
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
    const inlineSource = cleanText([
      current.question,
      ...current.options.map((option: any) => `${option.key}. ${option.text}`),
    ].join(' '));
    if (
      !current.options.length
      || /\sA\.\s*/.test(current.question)
      || current.options.some(
        (option: any) => option.key === 'A' && /\sB\.\s*/.test(option.text),
      )
    ) {
      const inline = parseInlineOptions(inlineSource);
      if (inline) {
        current.question = inline.question;
        current.options = inline.options;
      }
    }
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
