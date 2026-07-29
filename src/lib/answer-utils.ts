export interface AnswerableQuestion {
  options: { key: string; text?: string }[];
  answer?: string;
  answerKey?: string;
  answerKeys?: string[];
}

export const isOptionKey = (value: string) => /^[A-Z]$/.test(value);

function parseKeyGroup(value: unknown, validKeys: Set<string>) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (!normalized) return [];

  const compact = normalized.replace(/[\s,;/]+/g, '');
  if (!/^[A-Z]+$/.test(compact)) return [];

  const keys = [...compact];
  if (keys.some((key) => !validKeys.has(key))) return [];
  return keys;
}

function normalizeAnswerText(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/g, '');
}

export function getQuestionAnswerKeys(question: AnswerableQuestion) {
  const validKeys = new Set(
    question.options
      .map((option) => option.key.trim().toUpperCase())
      .filter(isOptionKey),
  );
  const sources = [
    ...(question.answerKeys ?? []),
    question.answerKey,
    question.answer,
  ];
  const directKeys = [
    ...new Set(sources.flatMap((value) => parseKeyGroup(value, validKeys))),
  ];
  if (directKeys.length) return directKeys;

  const legacyAnswer = String(question.answer ?? '').trim();
  const prefixedKey = legacyAnswer.match(/^([A-Z])(?:[.)]|:|-)\s*/i)?.[1]?.toUpperCase();
  if (prefixedKey && validKeys.has(prefixedKey)) return [prefixedKey];
  const labeledKey = legacyAnswer
    .match(/(?:correct\s*answer|answer|đáp\s*án)\s*[:=-]\s*([A-Z])\b/i)?.[1]
    ?.toUpperCase();
  if (labeledKey && validKeys.has(labeledKey)) return [labeledKey];

  const spacedPrefix = legacyAnswer.match(/^([A-Z])\s+(.+)$/i);
  if (spacedPrefix) {
    const key = spacedPrefix[1].toUpperCase();
    const optionText = question.options.find(
      (option) => option.key.trim().toUpperCase() === key,
    )?.text;
    const normalizedRemainder = normalizeAnswerText(spacedPrefix[2]);
    const normalizedOption = normalizeAnswerText(optionText);
    if (
      validKeys.has(key)
      && normalizedOption
      && (
        normalizedRemainder === normalizedOption
        || normalizedRemainder.startsWith(`${normalizedOption} `)
      )
    ) {
      return [key];
    }
  }

  const normalizedLegacyAnswer = normalizeAnswerText(legacyAnswer);
  if (!normalizedLegacyAnswer) return [];
  const matchingOptions = question.options.filter((option) => {
    const optionText = normalizeAnswerText(option.text);
    return (
      optionText === normalizedLegacyAnswer
      || (optionText.length >= 4 && normalizedLegacyAnswer.startsWith(`${optionText} `))
    );
  });
  return matchingOptions.length === 1
    ? [matchingOptions[0].key.trim().toUpperCase()]
    : [];
}

export function areAnswerSetsEqual(
  selectedKeys: string[],
  correctKeys: string[],
) {
  const selected = [...new Set(selectedKeys.map((key) => key.toUpperCase()))].sort();
  const correct = [...new Set(correctKeys.map((key) => key.toUpperCase()))].sort();

  return (
    selected.length > 0
    && selected.length === correct.length
    && selected.every((key, index) => key === correct[index])
  );
}

export function formatAnswerKeys(keys: string[]) {
  return keys.join(', ');
}
