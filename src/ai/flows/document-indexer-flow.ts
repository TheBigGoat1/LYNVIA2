'use server';
/**
 * @fileOverview This file implements a flow for indexing uploaded documents (PDF, DOCX).
 * It extracts text, chunks it, and stores it in Firestore for the RAG system.
 */

import { z } from 'zod';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore } from '@/firebase/config';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

// Input Schema
const DocumentIndexerInputSchema = z.object({
  documentId: z.string().describe('The ID of the document in the legal_documents collection.'),
  downloadURL: z.string().url().describe('The public URL to the uploaded file in Firebase Storage.'),
  contentType: z.string().describe('The content type of the file (e.g., "application/pdf").'),
});
export type DocumentIndexerInput = z.infer<typeof DocumentIndexerInputSchema>;

// Output Schema
const DocumentIndexerOutputSchema = z.object({
  documentId: z.string(),
  chunks: z.number(),
  status: z.string(),
});
export type DocumentIndexerOutput = z.infer<typeof DocumentIndexerOutputSchema>;

// This function is what the frontend will call.
export async function indexDocument(input: DocumentIndexerInput): Promise<DocumentIndexerOutput> {
  const docRef = doc(firestore, 'legal_documents', input.documentId);

  try {
    // 1. Download the file content from the storage URL
    const response = await fetch(input.downloadURL);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    const fileBuffer = await response.arrayBuffer();

    // 2. Extract text based on the file's content type
    let textContent = '';
    if (input.contentType === 'application/pdf') {
      const data = await pdf(Buffer.from(fileBuffer));
      textContent = data.text;
    } else if (input.contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const { value } = await mammoth.extractRawText({ buffer: Buffer.from(fileBuffer) });
      textContent = value;
    } else {
      throw new Error(`Unsupported content type: ${input.contentType}`);
    }

    if (!textContent.trim()) {
      throw new Error("No text content could be extracted from the document.");
    }

    // 3. Clean the extracted text (remove PDF artifacts like URLs, page numbers, corrupted chars)
    const cleanedText = textContent
      .replace(/https?:\/\/\S+/g, ' ') // Remove URLs
      .replace(/Page\s+\d+\s+sur\s+\d+/gi, ' ') // Remove "Page X sur Y"
      .replace(/RS\s+\d+\.\d+/gi, ' ') // Remove "RS 641.20" patterns
      .replace(/fedlex\.admin\.ch\/[^\s]+/gi, ' ') // Remove Fedlex URLs
      .replace(/\d{2}\.\d{2}\.\d{2}\s+\d{2}:\d{2}/g, ' ') // Remove timestamps like "09.02.26 12:23"
      .replace(/Art\.?\s*\d+/gi, ' ') // Remove "Art. 66" patterns
      .replace(/[a-z]\.\s*/g, ' ') // Remove "a.", "b." list markers
      .replace(/\([^)]*\)/g, ' ') // Remove parenthetical content like "(LTVA)"
      .replace(/[^\w\s\u00C0-\u024F\u1E00-\u1EFF'-]/g, ' ') // Keep letters with diacritics, apostrophes, hyphens
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // 4. Split the cleaned text into meaningful chunks
    // A simple strategy: split by double newlines. More advanced strategies could use token size or sentence boundaries.
    const chunks = cleanedText.split(/\n\s*\n/).filter(chunk => chunk.trim().length > 50); // Only keep chunks with some substance
    const chunkCount = chunks.length;

    if (chunkCount === 0) {
      throw new Error("Document text could not be split into meaningful chunks.");
    }

    // 4. Store each chunk in a subcollection for later retrieval
    const chunksCollectionRef = collection(docRef, 'chunks');
    for (let i = 0; i < chunks.length; i++) {
      await addDoc(chunksCollectionRef, {
        chunkNumber: i + 1,
        text: chunks[i],
        charCount: chunks[i].length,
        indexedAt: serverTimestamp(),
      });
    }

    // 5. Update the main document's status to "Pending Approval"
    await updateDoc(docRef, {
        status: 'Pending Approval',
        chunks: chunkCount,
        lastUpdated: serverTimestamp(),
    });

    return {
      documentId: input.documentId,
      chunks: chunkCount,
      status: 'Pending Approval',
    };
  } catch (error: any) {
      // If any step fails, update the document to a "Failed" status with the error message
      await updateDoc(docRef, {
          status: 'Failed',
          error: error.message,
          lastUpdated: serverTimestamp(),
      });
      console.error("Document indexing failed:", error);
      // Re-throw the error to ensure the calling client knows about the failure
      throw error;
  }
}
