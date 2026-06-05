import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Gemini SDK sebelum import modul yang menggunakannya
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn(),
    }),
  })),
}));

vi.mock('@config/env', () => ({
  env: {
    GEMINI_API_KEY: 'test-gemini-key',
    TRANSCRIPTION_PROVIDER: 'gemini',
  },
}));

vi.mock('@config/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { GoogleGenerativeAI } from '@google/generative-ai';
import { transcribeAudio, generateText } from '../gemini.service';

function mockGenerateContent(responseText: string) {
  const generateContent = vi.fn().mockResolvedValue({
    response: { text: () => responseText },
  });
  vi.mocked(GoogleGenerativeAI).mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({ generateContent }),
  }) as never);
  return generateContent;
}

describe('GeminiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // transcribeAudio — parsing response
  // =========================================================================

  describe('transcribeAudio() — parsing response', () => {
    it('mem-parse response JSON valid dengan text dan language', async () => {
      mockGenerateContent('{"text":"Halo dunia","language":"id"}');

      const result = await transcribeAudio(Buffer.from('fake-audio'));

      expect(result.text).toBe('Halo dunia');
      expect(result.language).toBe('id');
    });

    it('mem-parse response JSON yang dibungkus markdown code block', async () => {
      mockGenerateContent('```json\n{"text":"Hello world","language":"en"}\n```');

      const result = await transcribeAudio(Buffer.from('fake-audio'));

      expect(result.text).toBe('Hello world');
      expect(result.language).toBe('en');
    });

    it('mem-parse response JSON yang dibungkus code block tanpa label bahasa', async () => {
      mockGenerateContent('```\n{"text":"Bonjour","language":"fr"}\n```');

      const result = await transcribeAudio(Buffer.from('fake-audio'));

      expect(result.text).toBe('Bonjour');
      expect(result.language).toBe('fr');
    });

    it('fallback ke raw text jika response bukan JSON valid', async () => {
      mockGenerateContent('Ini bukan JSON, ini teks biasa.');

      const result = await transcribeAudio(Buffer.from('fake-audio'));

      expect(result.text).toBe('Ini bukan JSON, ini teks biasa.');
      expect(result.language).toBe('id');
    });

    it('fallback ke raw text jika JSON tidak memiliki field text/language', async () => {
      mockGenerateContent('{"content":"Transkripsi","lang":"id"}');

      const result = await transcribeAudio(Buffer.from('fake-audio'));

      expect(result.text).toBe('{"content":"Transkripsi","lang":"id"}');
      expect(result.language).toBe('id');
    });

    it('meneruskan audio buffer ke Gemini sebagai base64', async () => {
      const generateContent = mockGenerateContent('{"text":"test","language":"id"}');
      const audioBuffer = Buffer.from('audio-data');

      await transcribeAudio(audioBuffer);

      const callArgs = generateContent.mock.calls[0][0] as Array<{ inlineData?: { data: string; mimeType: string } }>;
      expect(callArgs[0].inlineData?.data).toBe(audioBuffer.toString('base64'));
      expect(callArgs[0].inlineData?.mimeType).toBe('audio/wav');
    });

    it('melempar error jika Gemini API gagal', async () => {
      vi.mocked(GoogleGenerativeAI).mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockRejectedValue(new Error('API Error')),
        }),
      }) as never);

      await expect(transcribeAudio(Buffer.from('fake-audio'))).rejects.toThrow('API Error');
    });
  });

  // =========================================================================
  // generateText
  // =========================================================================

  describe('generateText()', () => {
    it('mengembalikan teks dari response Gemini', async () => {
      mockGenerateContent('Ini adalah rangkuman dari video.');

      const result = await generateText('Buat rangkuman dari: ...');

      expect(result).toBe('Ini adalah rangkuman dari video.');
    });

    it('melempar error jika Gemini API gagal', async () => {
      vi.mocked(GoogleGenerativeAI).mockImplementation(() => ({
        getGenerativeModel: vi.fn().mockReturnValue({
          generateContent: vi.fn().mockRejectedValue(new Error('Rate limit exceeded')),
        }),
      }) as never);

      await expect(generateText('prompt')).rejects.toThrow('Rate limit exceeded');
    });
  });
});
