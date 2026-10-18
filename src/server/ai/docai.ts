// Document AI OCR. Optional: without DOCAI_PROCESSOR the pipeline falls back to Gemini reading the file alone.

import { DocumentProcessorServiceClient } from '@google-cloud/documentai';
import { config } from '../config.js';

let client: DocumentProcessorServiceClient | null = null;

export async function ocr(file: { mimeType: string; data: Buffer }): Promise<string | null> {
    if (!config.docaiProcessor) return null;
    client ??= new DocumentProcessorServiceClient({
        apiEndpoint: `${config.docaiLocation}-documentai.googleapis.com`,
    });
    const [result] = await client.processDocument({
        name: config.docaiProcessor,
        rawDocument: { content: file.data, mimeType: file.mimeType },
    });
    return result.document?.text ?? null;
}
