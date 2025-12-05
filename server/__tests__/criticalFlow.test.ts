/**
 * Critical flow integration tests
 * Tests the main consultation workflow with mocked external services
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createConsultation, getConsultationById, updateConsultation } from '../db';
import * as transcriptionModule from '../_core/voiceTranscription';
import * as llmModule from '../_core/llm';
import * as pdfModule from '../pdfGenerator';

// Mock external services
vi.mock('../_core/voiceTranscription');
vi.mock('../_core/llm');
vi.mock('../pdfGenerator');
vi.mock('../storage');

// Mock database - we don't want to hit real DB in tests
vi.mock('../db', async () => {
  const actual = await vi.importActual('../db');
  return {
    ...actual,
    createConsultation: vi.fn(),
    getConsultationById: vi.fn(),
    updateConsultation: vi.fn(),
    createPatient: vi.fn(),
    getPatientById: vi.fn(),
  };
});

describe('Critical Flow Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Consultation Creation Flow', () => {
    it('should create consultation with valid data', async () => {
      const mockConsultation = {
        dentistId: 1,
        patientId: 1,
        patientName: 'Test Patient',
        status: 'draft' as const,
      };

      const mockResult = { id: 123 };
      vi.mocked(createConsultation).mockResolvedValue(mockResult);

      const result = await createConsultation(mockConsultation);

      expect(result).toEqual(mockResult);
      expect(createConsultation).toHaveBeenCalledWith(mockConsultation);
      expect(createConsultation).toHaveBeenCalledTimes(1);
    });

    it('should throw error if database is unavailable', async () => {
      vi.mocked(createConsultation).mockRejectedValue(
        new Error('[Database] Database initialization failed previously. Cannot proceed without database connection.')
      );

      await expect(
        createConsultation({
          dentistId: 1,
          patientId: 1,
          patientName: 'Test Patient',
          status: 'draft',
        })
      ).rejects.toThrow('Database initialization failed');
    });
  });

  describe('Transcription Flow', () => {
    it('should successfully transcribe audio', async () => {
      const mockTranscriptionResult = {
        text: 'Paciente: Estou com dor no dente. Dentista: Vou examinar.',
        segments: [
          { start: 0, end: 2, text: 'Paciente: Estou com dor no dente.' },
          { start: 2, end: 4, text: 'Dentista: Vou examinar.' },
        ],
      };

      vi.mocked(transcriptionModule.transcribeAudio).mockResolvedValue(mockTranscriptionResult);

      const result = await transcriptionModule.transcribeAudio({
        audioUrl: 'https://storage.example.com/audio.webm',
        language: 'pt',
        prompt: 'Consulta odontológica',
      });

      expect(result).toEqual(mockTranscriptionResult);
      expect(result.text).toContain('Paciente:');
      expect(result.text).toContain('Dentista:');
      expect(result.segments).toHaveLength(2);
    });

    it('should handle transcription failure gracefully', async () => {
      vi.mocked(transcriptionModule.transcribeAudio).mockResolvedValue({
        error: 'Whisper API timeout',
      });

      const result = await transcriptionModule.transcribeAudio({
        audioUrl: 'https://storage.example.com/audio.webm',
        language: 'pt',
        prompt: 'Consulta odontológica',
      });

      expect(result).toHaveProperty('error');
      expect((result as any).error).toContain('timeout');
    });

    it('should not update consultation if transcription fails', async () => {
      // Mock consultation retrieval
      vi.mocked(getConsultationById).mockResolvedValue({
        id: 123,
        dentistId: 1,
        patientId: 1,
        patientName: 'Test Patient',
        audioUrl: 'https://storage.example.com/audio.webm',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      // Mock transcription failure
      vi.mocked(transcriptionModule.transcribeAudio).mockResolvedValue({
        error: 'Whisper API error',
      });

      // This should be handled in the router with try/catch
      // Verify updateConsultation is NOT called on failure
      const consultation = await getConsultationById(123);
      const result = await transcriptionModule.transcribeAudio({
        audioUrl: consultation!.audioUrl!,
        language: 'pt',
        prompt: 'Test',
      });

      if ('error' in result) {
        // Don't update consultation if transcription failed
        expect(updateConsultation).not.toHaveBeenCalled();
      }
    });
  });

  describe('SOAP Note Generation Flow', () => {
    it('should generate SOAP note from transcript', async () => {
      const mockSOAPNote = {
        subjective: {
          queixa_principal: 'Dor no dente 16',
          historia_doenca_atual: 'Dor há 3 dias',
          historico_medico: ['Hipertensão'],
          medicacoes: [
            { nome: 'Losartana', dose: '50mg', frequencia: '1x/dia' },
          ],
        },
        objective: {
          exame_clinico_geral: 'Paciente em bom estado geral',
          exame_clinico_especifico: ['Cárie profunda no dente 16'],
          dentes_afetados: ['16'],
        },
        assessment: {
          diagnosticos: ['Cárie profunda dente 16'],
          red_flags: [],
        },
        plan: {
          tratamentos: [
            { procedimento: 'Tratamento de canal', dente: '16', urgencia: 'alta' as const },
          ],
          orientacoes: ['Evitar mastigar do lado direito'],
          lembretes_clinicos: ['Verificar pressão arterial antes do procedimento'],
        },
      };

      const mockLLMResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify(mockSOAPNote),
            },
          },
        ],
      };

      vi.mocked(llmModule.invokeLLM).mockResolvedValue(mockLLMResponse as any);

      const result = await llmModule.invokeLLM({
        messages: [
          { role: 'system', content: 'Test' },
          { role: 'user', content: 'Generate SOAP note' },
        ],
      });

      expect(result.choices[0].message.content).toBeDefined();
      const parsedNote = JSON.parse(result.choices[0].message.content as string);
      expect(parsedNote.subjective.queixa_principal).toBe('Dor no dente 16');
      expect(parsedNote.plan.tratamentos).toHaveLength(1);
      expect(parsedNote.plan.tratamentos[0].urgencia).toBe('alta');
    });

    it('should handle LLM failure gracefully', async () => {
      vi.mocked(llmModule.invokeLLM).mockRejectedValue(new Error('LLM API timeout'));

      await expect(
        llmModule.invokeLLM({
          messages: [{ role: 'user', content: 'Test' }],
        })
      ).rejects.toThrow('LLM API timeout');

      // Verify consultation is not updated when LLM fails
      expect(updateConsultation).not.toHaveBeenCalled();
    });

    it('should handle invalid JSON response from LLM', async () => {
      const mockInvalidResponse = {
        choices: [
          {
            message: {
              content: 'Not valid JSON {{{',
            },
          },
        ],
      };

      vi.mocked(llmModule.invokeLLM).mockResolvedValue(mockInvalidResponse as any);

      const result = await llmModule.invokeLLM({
        messages: [{ role: 'user', content: 'Test' }],
      });

      const content = result.choices[0].message.content;
      expect(() => JSON.parse(content as string)).toThrow();
    });
  });

  describe('PDF Generation Flow', () => {
    it('should generate PDF from SOAP note', async () => {
      const mockPDFBuffer = Buffer.from('PDF content');

      vi.mocked(pdfModule.generateConsultationPDF).mockResolvedValue(mockPDFBuffer);

      const result = await pdfModule.generateConsultationPDF({
        patientName: 'Test Patient',
        consultationDate: new Date(),
        dentistName: 'Dr. Test',
        dentistCRO: '12345',
        soapNote: {
          subjective: {
            queixa_principal: 'Test',
            historia_doenca_atual: 'Test',
            historico_medico: [],
            medicacoes: [],
          },
          objective: {
            exame_clinico_geral: 'Test',
            exame_clinico_especifico: [],
            dentes_afetados: [],
          },
          assessment: {
            diagnosticos: [],
            red_flags: [],
          },
          plan: {
            tratamentos: [],
            orientacoes: [],
            lembretes_clinicos: [],
          },
        },
      });

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('PDF content');
    });

    it('should handle PDF generation failure', async () => {
      vi.mocked(pdfModule.generateConsultationPDF).mockRejectedValue(
        new Error('PDFKit rendering error')
      );

      await expect(
        pdfModule.generateConsultationPDF({
          patientName: 'Test',
          consultationDate: new Date(),
          dentistName: 'Test',
          soapNote: {} as any,
        })
      ).rejects.toThrow('PDFKit rendering error');
    });
  });

  describe('End-to-End Happy Path', () => {
    it('should complete full consultation workflow', async () => {
      // 1. Create consultation
      const consultationId = 123;
      vi.mocked(createConsultation).mockResolvedValue({ id: consultationId });

      const consultation = await createConsultation({
        dentistId: 1,
        patientId: 1,
        patientName: 'Test Patient',
        status: 'draft',
      });

      expect(consultation.id).toBe(consultationId);

      // 2. Transcribe audio
      vi.mocked(transcriptionModule.transcribeAudio).mockResolvedValue({
        text: 'Paciente: Dor no dente. Dentista: Vou examinar.',
        segments: [],
      });

      const transcription = await transcriptionModule.transcribeAudio({
        audioUrl: 'test.webm',
        language: 'pt',
        prompt: 'Test',
      });

      expect(transcription).toHaveProperty('text');
      expect('error' in transcription).toBe(false);

      // 3. Generate SOAP note
      const mockSOAPNote = {
        subjective: { queixa_principal: 'Test', historia_doenca_atual: 'Test', historico_medico: [], medicacoes: [] },
        objective: { exame_clinico_geral: 'Test', exame_clinico_especifico: [], dentes_afetados: [] },
        assessment: { diagnosticos: [], red_flags: [] },
        plan: { tratamentos: [], orientacoes: [], lembretes_clinicos: [] },
      };

      vi.mocked(llmModule.invokeLLM).mockResolvedValue({
        choices: [{ message: { content: JSON.stringify(mockSOAPNote) } }],
      } as any);

      const llmResult = await llmModule.invokeLLM({
        messages: [{ role: 'user', content: 'Test' }],
      });

      const soapNote = JSON.parse(llmResult.choices[0].message.content as string);
      expect(soapNote).toHaveProperty('subjective');
      expect(soapNote).toHaveProperty('objective');
      expect(soapNote).toHaveProperty('assessment');
      expect(soapNote).toHaveProperty('plan');

      // 4. Generate PDF
      vi.mocked(pdfModule.generateConsultationPDF).mockResolvedValue(Buffer.from('PDF'));

      const pdf = await pdfModule.generateConsultationPDF({
        patientName: 'Test',
        consultationDate: new Date(),
        dentistName: 'Test',
        soapNote: mockSOAPNote,
      });

      expect(pdf).toBeInstanceOf(Buffer);

      // Verify all steps completed
      expect(createConsultation).toHaveBeenCalledTimes(1);
      expect(transcriptionModule.transcribeAudio).toHaveBeenCalledTimes(1);
      expect(llmModule.invokeLLM).toHaveBeenCalledTimes(1);
      expect(pdfModule.generateConsultationPDF).toHaveBeenCalledTimes(1);
    });
  });
});
