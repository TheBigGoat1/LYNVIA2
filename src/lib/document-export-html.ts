/**
 * Convert plain-text document content (paragraphs separated by \n\n) into minimal
 * HTML suitable for DOCX conversion, preserving paragraph breaks.
 */
export function plainTextToDocxHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const paragraphs = escaped.split(/\n\n+/);
  const htmlParagraphs = paragraphs
    .map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');
  return `<!DOCTYPE html><html><body>${htmlParagraphs}</body></html>`;
}
