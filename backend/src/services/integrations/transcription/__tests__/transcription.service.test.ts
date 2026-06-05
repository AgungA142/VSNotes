import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@services/integrations/gemini/gemini.service', () => ({
  transcribeAudio: vi.fn(),
  generateText: vi.fn(),
}));

vi.mock('@services/integrations/transcription/groq.provider', () => ({
  transcribeAudio: vi.fn(),
}));

vi.mock('@config/env', () => ({
  env: {
    GEMINI_API_KEY: 'test-gemini-key',
    GROQ_API_KEY: 'test-groq-key',
    TRANSCRIPTION_PROVIDER: 'gemini',
  },
}));

vi.mock('@config/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { transcribeAudio } from '../transcription.service';
import { transcribeAudio as geminiTranscribe } from '@services/integrations/gemini/gemini.service';
import { transcribeAudio as groqTranscribe } from '@services/integrations/transcription/groq.provider';
import { env } from '@config/env';

const fakeAudio = Buffer.from('fake-audio-data');
const geminiResult = { text: 'Halo dari Gemini', language: 'id' };
const groqResult = { text: 'Halo dari Groq', language: 'id' };

describe('TranscriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(env).TRANSCRIPTION_PROVIDER = 'gemini';
    vi.mocked(env).GEMINI_API_KEY = 'test-gemini-key';
    vi.mocked(env).GROQ_API_KEY = 'test-groq-key';
  });

  // =========================================================================
  // Provider: gemini (default)
  // =========================================================================

  describe('provider = gemini', () => {
    it('menggunakan Gemini saat provider gemini dan API key tersedia', async () => {
      vi.mocked(geminiTranscribe).mockResolvedValue(geminiResult);

      const result = await transcribeAudio(fakeAudio);

      expect(geminiTranscribe).toHaveBeenCalledWith(fakeAudio);
      expect(groqTranscribe).not.toHaveBeenCalled();
      expect(result).toEqual(geminiResult);
    });

    it('fallback ke Groq saat Gemini mengembalikan error 429', async () => {
      vi.mocked(geminiTranscribe).mockRejectedValue(new Error('429 Too Many Requests'));
      vi.mocked(groqTranscribe).mockResolvedValue(groqResult);

      const result = await transcribeAudio(fakeAudio);

      expect(geminiTranscribe).toHaveBeenCalledWith(fakeAudio);
      expect(groqTranscribe).toHaveBeenCalledWith(fakeAudio);
      expect(result).toEqual(groqResult);
    });

    it('fallback ke Groq saat Gemini mengembalikan RESOURCE_EXHAUSTED', async () => {
      vi.mocked(geminiTranscribe).mockRejectedValue(new Error('RESOURCE_EXHAUSTED: quota exceeded'));
      vi.mocked(groqTranscribe).mockResolvedValue(groqResult);

      const result = await transcribeAudio(fakeAudio);

      expect(groqTranscribe).toHaveBeenCalledWith(fakeAudio);
      expect(result).toEqual(groqResult);
    });

    it('tidak fallback ke Groq saat GROQ_API_KEY kosong', async () => {
      vi.mocked(env).GROQ_API_KEY = '';
      vi.mocked(geminiTranscribe).mockRejectedValue(new Error('429 Too Many Requests'));

      await expect(transcribeAudio(fakeAudio)).rejects.toThrow('429 Too Many Requests');
      expect(groqTranscribe).not.toHaveBeenCalled();
    });

    it('meneruskan error non-rate-limit tanpa fallback ke Groq', async () => {
      vi.mocked(geminiTranscribe).mockRejectedValue(new Error('Network timeout'));

      await expect(transcribeAudio(fakeAudio)).rejects.toThrow('Network timeout');
      expect(groqTranscribe).not.toHaveBeenCalled();
    });

    it('melempar error jika GEMINI_API_KEY kosong', async () => {
      vi.mocked(env).GEMINI_API_KEY = '';

      await expect(transcribeAudio(fakeAudio)).rejects.toThrow('GEMINI_API_KEY tidak di-set');
      expect(geminiTranscribe).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Provider: groq
  // =========================================================================

  describe('provider = groq', () => {
    beforeEach(() => {
      vi.mocked(env).TRANSCRIPTION_PROVIDER = 'groq';
    });

    it('menggunakan Groq langsung tanpa memanggil Gemini', async () => {
      vi.mocked(groqTranscribe).mockResolvedValue(groqResult);

      const result = await transcribeAudio(fakeAudio);

      expect(groqTranscribe).toHaveBeenCalledWith(fakeAudio);
      expect(geminiTranscribe).not.toHaveBeenCalled();
      expect(result).toEqual(groqResult);
    });

    it('melempar error jika GROQ_API_KEY kosong', async () => {
      vi.mocked(env).GROQ_API_KEY = '';

      await expect(transcribeAudio(fakeAudio)).rejects.toThrow('GROQ_API_KEY tidak di-set');
      expect(groqTranscribe).not.toHaveBeenCalled();
    });
  });
});
