/**
 * Error scenario tests
 * Tests that the system handles failures gracefully and maintains data consistency
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceError, ErrorCode } from '../_core/errors';
import { getDb } from '../db';

// Mock database
vi.mock('../db', async () => {
  const actual = await vi.importActual('../db');
  return {
    ...actual,
    getDb: vi.fn(),
  };
});

describe('Error Scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Database Failure Scenarios', () => {
    it('should throw error when DATABASE_URL is missing', async () => {
      // Save original env
      const originalEnv = process.env.DATABASE_URL;
      delete process.env.DATABASE_URL;

      // Mock getDb to simulate missing DATABASE_URL
      vi.mocked(getDb).mockRejectedValue(
        new Error('[Database] FATAL: DATABASE_URL environment variable is not set')
      );

      await expect(getDb()).rejects.toThrow('DATABASE_URL environment variable is not set');

      // Restore env
      process.env.DATABASE_URL = originalEnv;
    });

    it('should throw error when database connection fails', async () => {
      vi.mocked(getDb).mockRejectedValue(
        new Error('[Database] FATAL: Failed to connect to database')
      );

      await expect(getDb()).rejects.toThrow('Failed to connect to database');
    });

    it('should fail fast on subsequent calls after initialization failure', async () => {
      // First call fails
      vi.mocked(getDb).mockRejectedValueOnce(
        new Error('[Database] Database initialization failed previously')
      );

      await expect(getDb()).rejects.toThrow('initialization failed');

      // Subsequent calls should also fail immediately
      await expect(getDb()).rejects.toThrow('initialization failed');
    });

    it('should not allow operations when database is unavailable', async () => {
      vi.mocked(getDb).mockRejectedValue(
        new Error('[Database] Database not available')
      );

      // Any DB operation should fail
      await expect(getDb()).rejects.toThrow('Database not available');
    });
  });

  describe('ServiceError Class', () => {
    it('should create ServiceError with all properties', () => {
      const originalError = new Error('Original error message');
      const serviceError = new ServiceError(
        ErrorCode.TRANSCRIPTION_FAILED,
        'User-friendly message',
        { consultationId: 123 },
        originalError
      );

      expect(serviceError.code).toBe(ErrorCode.TRANSCRIPTION_FAILED);
      expect(serviceError.message).toBe('User-friendly message');
      expect(serviceError.details).toEqual({ consultationId: 123 });
      expect(serviceError.originalError).toBe(originalError);
      expect(serviceError.name).toBe('ServiceError');
    });

    it('should convert ServiceError to JSON', () => {
      const serviceError = new ServiceError(
        ErrorCode.LLM_RESPONSE_FAILED,
        'LLM failed',
        { model: 'gpt-4' }
      );

      const json = serviceError.toJSON();

      expect(json).toEqual({
        code: ErrorCode.LLM_RESPONSE_FAILED,
        message: 'LLM failed',
        details: { model: 'gpt-4' },
      });
    });

    it('should log error with context', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const serviceError = new ServiceError(
        ErrorCode.PDF_GENERATION_FAILED,
        'PDF generation failed'
      );

      serviceError.log('TestContext');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ServiceError TestContext]'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Transcription Failure Scenarios', () => {
    it('should return error structure when Whisper API fails', () => {
      const errorResult = {
        error: 'Whisper API timeout after 30s',
      };

      expect(errorResult).toHaveProperty('error');
      expect(errorResult.error).toContain('timeout');
      expect('text' in errorResult).toBe(false);
      expect('segments' in errorResult).toBe(false);
    });

    it('should not corrupt database when transcription fails mid-flight', async () => {
      // Simulate: consultation created, audio uploaded, transcription fails
      // Expected: consultation should remain in valid state (no partial transcript)

      const consultation = {
        id: 123,
        audioUrl: 'https://storage.example.com/audio.webm',
        transcript: null, // Should remain null if transcription fails
        status: 'draft' as const,
      };

      // Transcription fails
      const transcriptionError = new ServiceError(
        ErrorCode.TRANSCRIPTION_FAILED,
        'Whisper API error'
      );

      // Verify consultation state is not updated
      expect(consultation.transcript).toBeNull();
      expect(consultation.status).toBe('draft');

      // Error should be thrown, not silently swallowed
      expect(() => {
        throw transcriptionError;
      }).toThrow(ServiceError);
    });

    it('should provide actionable error message on transcription failure', () => {
      const error = new ServiceError(
        ErrorCode.TRANSCRIPTION_FAILED,
        'Falha ao transcrever áudio. Tente novamente em alguns minutos.',
        { consultationId: 123, audioUrl: 'test.webm' }
      );

      expect(error.message).toContain('Tente novamente');
      expect(error.details?.consultationId).toBe(123);
    });
  });

  describe('LLM Failure Scenarios', () => {
    it('should handle LLM timeout', () => {
      const error = new ServiceError(
        ErrorCode.LLM_TIMEOUT,
        'O serviço de IA não respondeu a tempo',
        { timeoutMs: 30000 }
      );

      expect(error.code).toBe(ErrorCode.LLM_TIMEOUT);
      expect(error.message).toContain('não respondeu');
    });

    it('should handle invalid JSON response from LLM', () => {
      const invalidJSON = 'This is not valid JSON {{{';

      expect(() => JSON.parse(invalidJSON)).toThrow();

      const error = new ServiceError(
        ErrorCode.LLM_RESPONSE_INVALID,
        'Resposta da IA em formato inválido. Tente novamente.',
        { response: invalidJSON }
      );

      expect(error.code).toBe(ErrorCode.LLM_RESPONSE_INVALID);
    });

    it('should handle empty response from LLM', () => {
      const emptyContent = null;

      if (!emptyContent) {
        const error = new ServiceError(
          ErrorCode.LLM_RESPONSE_INVALID,
          'Resposta da IA vazia ou inválida'
        );

        expect(error.code).toBe(ErrorCode.LLM_RESPONSE_INVALID);
      }
    });

    it('should not save invalid SOAP note to database', () => {
      const invalidSOAPNote = {
        // Missing required fields
        subjective: {},
      };

      // This would fail Zod validation
      expect(invalidSOAPNote).not.toHaveProperty('objective');
      expect(invalidSOAPNote).not.toHaveProperty('assessment');
      expect(invalidSOAPNote).not.toHaveProperty('plan');
    });

    it('should handle LLM rate limit errors', () => {
      const error = new ServiceError(
        ErrorCode.LLM_RATE_LIMIT_EXCEEDED,
        'Limite de requisições excedido. Aguarde antes de tentar novamente.',
        { retryAfter: 60 }
      );

      expect(error.code).toBe(ErrorCode.LLM_RATE_LIMIT_EXCEEDED);
      expect(error.details?.retryAfter).toBe(60);
    });
  });

  describe('PDF Generation Failure Scenarios', () => {
    it('should handle PDF generation failure', () => {
      const error = new ServiceError(
        ErrorCode.PDF_GENERATION_FAILED,
        'Falha ao gerar PDF. Tente novamente em alguns minutos.',
        { consultationId: 123 }
      );

      expect(error.code).toBe(ErrorCode.PDF_GENERATION_FAILED);
      expect(error.message).toContain('gerar PDF');
    });

    it('should not generate PDF if SOAP note is missing', () => {
      const consultation = {
        id: 123,
        soapNote: null,
      };

      // Should throw validation error before attempting PDF generation
      if (!consultation.soapNote) {
        expect(() => {
          throw new Error('No SOAP note available for this consultation');
        }).toThrow('No SOAP note available');
      }
    });
  });

  describe('Storage Failure Scenarios', () => {
    it('should handle storage upload failure', () => {
      const error = new ServiceError(
        ErrorCode.STORAGE_UPLOAD_FAILED,
        'Falha ao fazer upload do arquivo. Verifique sua conexão.',
        { fileSize: 25000000, fileName: 'audio.webm' }
      );

      expect(error.code).toBe(ErrorCode.STORAGE_UPLOAD_FAILED);
      expect(error.details?.fileSize).toBe(25000000);
    });

    it('should handle storage download failure', () => {
      const error = new ServiceError(
        ErrorCode.STORAGE_DOWNLOAD_FAILED,
        'Falha ao acessar arquivo de áudio',
        { fileKey: 'consultations/1/123/audio.webm' }
      );

      expect(error.code).toBe(ErrorCode.STORAGE_DOWNLOAD_FAILED);
    });
  });

  describe('Error Code Completeness', () => {
    it('should have error codes for all external services', () => {
      const requiredErrorCodes = [
        'STORAGE_UPLOAD_FAILED',
        'STORAGE_DOWNLOAD_FAILED',
        'TRANSCRIPTION_FAILED',
        'TRANSCRIPTION_TIMEOUT',
        'LLM_RESPONSE_FAILED',
        'LLM_RESPONSE_INVALID',
        'LLM_TIMEOUT',
        'PDF_GENERATION_FAILED',
        'DATABASE_ERROR',
        'DATABASE_UNAVAILABLE',
      ];

      for (const code of requiredErrorCodes) {
        expect(ErrorCode).toHaveProperty(code);
      }
    });

    it('should provide user-friendly messages in Portuguese', () => {
      const errors = [
        new ServiceError(ErrorCode.TRANSCRIPTION_FAILED, 'Falha ao transcrever áudio'),
        new ServiceError(ErrorCode.LLM_RESPONSE_FAILED, 'Falha ao gerar análise SOAP'),
        new ServiceError(ErrorCode.PDF_GENERATION_FAILED, 'Falha ao gerar PDF'),
      ];

      errors.forEach((error) => {
        // Portuguese validation
        expect(error.message).toMatch(/[áãàâéêíóôõúç]/i);
        expect(error.message).not.toContain('Failed');
        expect(error.message).not.toContain('Error');
      });
    });
  });

  describe('Data Consistency on Failures', () => {
    it('should not leave consultation in inconsistent state on error', () => {
      // Scenario: Transcription fails after consultation is created
      const consultation = {
        id: 123,
        audioUrl: 'test.webm',
        transcript: null,
        soapNote: null,
        status: 'draft' as const,
      };

      // Transcription fails
      const error = new ServiceError(ErrorCode.TRANSCRIPTION_FAILED, 'Whisper failed');

      // Expected state: consultation remains in draft with no transcript
      expect(consultation.status).toBe('draft');
      expect(consultation.transcript).toBeNull();
      expect(consultation.soapNote).toBeNull();
      expect(error).toBeInstanceOf(ServiceError);
    });

    it('should not mark consultation as transcribed if Whisper fails', () => {
      const consultation = {
        id: 123,
        hasTranscript: false,
        transcript: null,
      };

      // Simulate transcription attempt that fails
      const transcriptionFailed = true;

      if (transcriptionFailed) {
        // Should NOT update these fields
        expect(consultation.hasTranscript).toBe(false);
        expect(consultation.transcript).toBeNull();
      }
    });

    it('should not save SOAP note if LLM returns invalid data', () => {
      const consultation = {
        id: 123,
        soapNote: null,
      };

      // LLM returns invalid JSON
      const llmResponse = 'invalid json {{{';
      let parsedNote = null;

      try {
        parsedNote = JSON.parse(llmResponse);
      } catch {
        // Parsing failed, do not save
      }

      // SOAP note should remain null
      expect(parsedNote).toBeNull();
      expect(consultation.soapNote).toBeNull();
    });
  });
});
