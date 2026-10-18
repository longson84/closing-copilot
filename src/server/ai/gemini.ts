import { GoogleGenAI, type Part } from '@google/genai';
import { z } from 'zod';
import { config } from '../config.js';

let client: GoogleGenAI | null = null;
function ai(): GoogleGenAI {
    client ??= new GoogleGenAI({ vertexai: true, project: config.project, location: config.location });
    return client;
}

/** One Gemini call with schema-constrained JSON output, validated again with Zod. */
export async function generateJson<T extends z.ZodType>(opts: {
    schema: T;
    prompt: string;
    file?: { mimeType: string; data: Buffer };
    files?: Array<{ mimeType: string; data: Buffer }>;
    system?: string;
}): Promise<z.infer<T>> {
    const parts: Part[] = [];
    for (const f of [...(opts.file ? [opts.file] : []), ...(opts.files ?? [])]) {
        parts.push({ inlineData: { mimeType: f.mimeType, data: f.data.toString('base64') } });
    }
    parts.push({ text: opts.prompt });
    const res = await ai().models.generateContent({
        model: config.model,
        contents: [{ role: 'user', parts }],
        config: {
            systemInstruction: opts.system,
            responseMimeType: 'application/json',
            responseJsonSchema: z.toJSONSchema(opts.schema),
            temperature: 0.2,
        },
    });
    const text = res.text;
    if (!text) throw new Error('Gemini returned no content');
    return opts.schema.parse(JSON.parse(text));
}

/** Gemini answer grounded with Google Search; returns the text and the web sources it used. */
export async function generateGrounded(opts: { prompt: string; system?: string }): Promise<{ text: string; sources: Array<{ title: string; url: string }> }> {
    const res = await ai().models.generateContent({
        model: config.model,
        contents: [{ role: 'user', parts: [{ text: opts.prompt }] }],
        config: { systemInstruction: opts.system, tools: [{ googleSearch: {} }], temperature: 0.2 },
    });
    const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const seen = new Set<string>();
    const sources = chunks.flatMap((c) => {
        const url = c.web?.uri;
        if (!url || seen.has(url)) return [];
        seen.add(url);
        return [{ title: c.web?.title ?? url, url }];
    });
    return { text: res.text ?? '', sources };
}
