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
 * Upload audio schema with strict size and duration limits
 */
export const uploadAudioSchema = z.object({
  consultationId: z.number().int().positive(),

  audioData: z
    .string()
    .min(100, "Áudio muito pequeno")
    .max(MAX_BASE64_SIZE, `Áudio muito grande (máx ${MAX_AUDIO_SIZE_MB}MB)`)
    .refine(
      (base64) => {
        // Validate base64 format
        const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
        return base64Regex.test(base64);
      },
      { message: "Formato de áudio inválido (base64 corrompido)" }
    ),

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
