import { z } from "zod";
import { soapNoteSchema } from "./soap";

/**
 * Audio constraints (Whisper API limits)
 */
const MAX_AUDIO_SIZE_MB = 25; // Whisper limit is 25MB
const MAX_AUDIO_SIZE_BYTES = MAX_AUDIO_SIZE_MB * 1024 * 1024;
const MAX_AUDIO_DURATION_SECONDS = 3600; // 1 hour max
const MAX_AUDIO_DURATION_MINUTES = 60;

/**
 * Base64 size calculator (base64 is ~33% larger than binary)
 */
const MAX_BASE64_SIZE = Math.ceil(MAX_AUDIO_SIZE_BYTES * 1.4); // Add overhead

/**
 * Allowed audio MIME types
 */
const ALLOWED_AUDIO_TYPES = [
  "audio/webm",
  "audio/mp3",
  "audio/mpeg",
  "audio/wav",
  "audio/wave",
  "audio/m4a",
  "audio/mp4",
  "audio/ogg",
] as const;

/**
 * Create consultation schema
 */
export const createConsultationSchema = z.object({
  patientId: z.number().int().positive("ID do paciente inválido"),
  patientName: z.string().min(2).max(255),
  templateUsed: z.string().max(50).optional(),
});

/**
 * Upload audio metadata schema (file is uploaded via multipart endpoint)
 */
export const uploadAudioSchema = z.object({
  consultationId: z.number().int().positive(),

  fileKey: z
    .string()
    .min(10, "File key inválida")
    .max(500, "File key muito longa"),

  audioUrl: z
    .string()
    .url("URL de áudio inválida")
    .max(2000, "URL muito longa"),

  mimeType: z.enum(ALLOWED_AUDIO_TYPES, {
    errorMap: () => ({
      message: `Tipo de áudio não suportado. Use: ${ALLOWED_AUDIO_TYPES.join(", ")}`,
    }),
  }),

  durationSeconds: z
    .number()
    .min(1, "Duração do áudio inválida")
    .max(
      MAX_AUDIO_DURATION_SECONDS,
      `Áudio muito longo (máx ${MAX_AUDIO_DURATION_MINUTES} minutos)`
    ),

  sizeBytes: z
    .number()
    .int()
    .positive("Tamanho de arquivo inválido")
    .max(MAX_AUDIO_SIZE_BYTES, `Arquivo muito grande (máx ${MAX_AUDIO_SIZE_MB}MB)`),
});

/**
 * Update transcript schema
 */
export const updateTranscriptSchema = z.object({
  consultationId: z.number().int().positive(),
  transcript: z.string().min(1).max(50000, "Transcrição muito longa (máx 50000 caracteres)"),
});

/**
 * Transcribe audio schema
 */
export const transcribeAudioSchema = z.object({
  consultationId: z.number().int().positive(),
});

/**
 * Analyze and generate SOAP schema
 */
export const analyzeAndGenerateSOAPSchema = z.object({
  consultationId: z.number().int().positive(),
});

/**
 * Update SOAP schema (STRICT - replaces z.any())
 */
export const updateSOAPSchema = z.object({
  consultationId: z.number().int().positive(),
  soapNote: soapNoteSchema, // ← NOW STRICT, NO MORE z.any()
});

/**
 * Finalize consultation schema
 */
export const finalizeConsultationSchema = z.object({
  consultationId: z.number().int().positive(),
});

/**
 * Export PDF schema
 */
export const exportPDFSchema = z.object({
  consultationId: z.number().int().positive(),
});

/**
 * Get consultation by ID schema
 */
export const getConsultationByIdSchema = z.object({
  id: z.number().int().positive(),
});

/**
 * Get consultations by patient schema
 */
export const getConsultationsByPatientSchema = z.object({
  patientId: z.number().int().positive(),
});

// Type exports
export type CreateConsultationInput = z.infer<typeof createConsultationSchema>;
export type UploadAudioInput = z.infer<typeof uploadAudioSchema>;
export type UpdateTranscriptInput = z.infer<typeof updateTranscriptSchema>;
export type UpdateSOAPInput = z.infer<typeof updateSOAPSchema>;
export type GetConsultationByIdInput = z.infer<typeof getConsultationByIdSchema>;

// Export constants for use in frontend
export const AUDIO_CONSTRAINTS = {
  MAX_SIZE_MB: MAX_AUDIO_SIZE_MB,
  MAX_SIZE_BYTES: MAX_AUDIO_SIZE_BYTES,
  MAX_DURATION_SECONDS: MAX_AUDIO_DURATION_SECONDS,
  MAX_DURATION_MINUTES: MAX_AUDIO_DURATION_MINUTES,
  ALLOWED_TYPES: ALLOWED_AUDIO_TYPES,
} as const;
