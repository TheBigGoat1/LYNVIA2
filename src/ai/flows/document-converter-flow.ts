
'use server';
/**
 * @fileOverview A server action for converting HTML/plain-text content to a DOCX file.
 * Fix #30: Replaced ai.defineFlow wrapper with a plain server action so Next.js
 *           correctly treats it as a server action (callable from client components).
 * Fix #31: Re-written HTML→DOCX pipeline to preserve paragraph breaks and
 *           inline line-breaks from the original document templates.
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';

export type DocumentConverterInput = { htmlString: string };
export type DocumentConverterOutput = { docxBase64: string };

/**
 * Converts an HTML string (or plain text wrapped in a div) into a DOCX buffer
 * encoded as a base64 string.
 *
 * Formatting rules:
 *  - Double (or more) newlines  → separate Word paragraphs with spacing after.
 *  - Single newlines             → soft line-break (Shift+Enter) inside the same paragraph.
 *  - Lines that are ALL-CAPS, ≤60 chars, no sentence punctuation → Heading 1 style.
 *  - **bold markers**            → bold TextRun.
 *  - HTML entities               → decoded.
 */
export async function convertHtmlToDocx(
  input: DocumentConverterInput,
): Promise<DocumentConverterOutput> {
  const { htmlString } = input;

  // ── 1. Normalise HTML → plain text while keeping structure ──────────────────
  const plainText = htmlString
    // Block-level tags that represent paragraph boundaries
    .replace(/<\/p\s*>/gi, '\n\n')
    .replace(/<\/h[1-6]\s*>/gi, '\n\n')
    .replace(/<\/div\s*>/gi, '\n')
    .replace(/<\/li\s*>/gi, '\n')
    // Inline line-breaks
    .replace(/<br\s*\/?>/gi, '\n')
    // Strip all remaining tags
    .replace(/<[^>]+>/g, '')
    // HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // Collapse runs of spaces (but keep newlines)
    .replace(/[ \t]+/g, ' ')
    // Normalise line-endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();

  // ── 2. Split into paragraph blocks (separated by ≥2 consecutive newlines) ───
  const blocks = plainText.split(/\n{2,}/);

  const docParagraphs: Paragraph[] = [];

  for (const block of blocks) {
    const trimmedBlock = block.trim();

    if (!trimmedBlock) {
      // Empty block → blank paragraph for visual spacing
      docParagraphs.push(
        new Paragraph({ children: [new TextRun({ text: '' })], spacing: { after: 120 } }),
      );
      continue;
    }

    // ── 3. Detect heading: ALL-CAPS, short, no trailing sentence punctuation ──
    const isHeading =
      trimmedBlock === trimmedBlock.toUpperCase() &&
      trimmedBlock.length <= 80 &&
      !/[.?!]$/.test(trimmedBlock) &&
      trimmedBlock.split('\n').length === 1;

    if (isHeading) {
      docParagraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: trimmedBlock,
              bold: true,
              font: 'Arial',
              size: 28, // 14pt
            }),
          ],
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.LEFT,
          spacing: { before: 240, after: 160 },
        }),
      );
      continue;
    }

    // ── 4. Regular paragraph – split on single newlines for soft-breaks ───────
    const lines = trimmedBlock.split('\n');
    const children: TextRun[] = [];

    lines.forEach((line, lineIdx) => {
      // Add a carriage-return (soft line-break) before every line after the first
      if (lineIdx > 0) {
        children.push(new TextRun({ break: 1 }));
      }

      // Parse **bold** markers within the line
      const boldPattern = /\*\*(.*?)\*\*/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = boldPattern.exec(line)) !== null) {
        // Text before the bold marker
        if (match.index > lastIndex) {
          children.push(
            new TextRun({ text: line.slice(lastIndex, match.index), font: 'Arial', size: 24 }),
          );
        }
        // Bold text
        children.push(
          new TextRun({ text: match[1], bold: true, font: 'Arial', size: 24 }),
        );
        lastIndex = boldPattern.lastIndex;
      }

      // Remaining text after last bold marker
      if (lastIndex < line.length) {
        children.push(
          new TextRun({ text: line.slice(lastIndex), font: 'Arial', size: 24 }),
        );
      }

      // If the line had no content at all, push an empty run so the paragraph exists
      if (children.length === (lineIdx > 0 ? children.length : 0) && line.trim() === '') {
        children.push(new TextRun({ text: '', font: 'Arial', size: 24 }));
      }
    });

    docParagraphs.push(
      new Paragraph({
        children,
        spacing: { after: 200 },
      }),
    );
  }

  // ── 5. Build and serialise the DOCX document ─────────────────────────────────
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 24 },
        },
      },
    },
    sections: [
      {
        properties: {},
        children: docParagraphs.length > 0
          ? docParagraphs
          : [new Paragraph({ children: [new TextRun({ text: '' })] })],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const base64 = buffer.toString('base64');

  return { docxBase64: base64 };
}
