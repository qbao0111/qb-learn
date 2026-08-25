const PDF_DOT_BELOW_MAP: Record<string, string> = {
  a: 'ạ',
  ă: 'ặ',
  â: 'ậ',
  e: 'ẹ',
  ê: 'ệ',
  i: 'ị',
  o: 'ọ',
  ô: 'ộ',
  ơ: 'ợ',
  u: 'ụ',
  ư: 'ự',
  y: 'ỵ',
  A: 'Ạ',
  Ă: 'Ặ',
  Â: 'Ậ',
  E: 'Ẹ',
  Ê: 'Ệ',
  I: 'Ị',
  O: 'Ọ',
  Ô: 'Ộ',
  Ơ: 'Ợ',
  U: 'Ụ',
  Ư: 'Ự',
  Y: 'Ỵ',
};

const EMAIL_ADDRESS = /^[^\s@]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

/**
 * Some Vietnamese fonts embedded by Quizlet map the dot-below glyph to "@"
 * or ";" in the PDF text layer (for example "giá tri@" / "giá tri;" instead
 * of "giá trị"). Restore only vowel+glyph sequences and leave real email
 * addresses untouched.
 */
export function restoreVietnamesePdfDiacritics(value = '') {
  return String(value).replace(/\S*[@;]\S*/g, (token) => {
    const emailCandidate = token.replace(/^[([{<'"]+|[\])}>,'";!?]+$/g, '');
    if (EMAIL_ADDRESS.test(emailCandidate)) return token;

    return token.replace(
      /([aăâeêioôơuưyAĂÂEÊIOÔƠUƯY])[@;]/gu,
      (glyph, vowel: string) => PDF_DOT_BELOW_MAP[vowel] || glyph,
    );
  });
}
