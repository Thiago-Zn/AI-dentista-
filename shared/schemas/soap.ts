import { z } from "zod";

/**
 * Strict Zod schemas for SOAP Note validation
 * Prevents injection attacks and ensures data integrity
 */

// Medication schema
export const medicationSchema = z.object({
  nome: z.string().min(1).max(200),
  dose: z.string().min(1).max(100),
  frequencia: z.string().min(1).max(100),
});

// Treatment schema
export const treatmentSchema = z.object({
  procedimento: z.string().min(1).max(300),
  dente: z.string().min(1).max(10), // e.g., "16", "21-22"
  urgencia: z.enum(["alta", "media", "baixa"]),
});

// Subjective section
export const subjectiveSchema = z.object({
  queixa_principal: z.string().min(1).max(1000),
  historia_doenca_atual: z.string().min(1).max(5000),
  historico_medico: z.array(z.string().max(500)).max(50),
  medicacoes: z.array(medicationSchema).max(30),
});

// Objective section
export const objectiveSchema = z.object({
  exame_clinico_geral: z.string().min(1).max(2000),
  exame_clinico_especifico: z.array(z.string().max(500)).max(100),
  dentes_afetados: z.array(z.string().max(10)).max(32), // max 32 teeth
});

// Assessment section
export const assessmentSchema = z.object({
  diagnosticos: z.array(z.string().max(500)).max(50),
  red_flags: z.array(z.string().max(500)).max(50),
});

// Plan section
export const planSchema = z.object({
  tratamentos: z.array(treatmentSchema).max(100),
  orientacoes: z.array(z.string().max(500)).max(100),
  lembretes_clinicos: z.array(z.string().max(500)).max(100),
});

// Complete SOAP Note schema
export const soapNoteSchema = z.object({
  urgency: z.enum(["high", "medium", "low"]).optional(),
  subjective: subjectiveSchema,
  objective: objectiveSchema,
  assessment: assessmentSchema,
  plan: planSchema,
});

// Type inference
export type SOAPNoteInput = z.infer<typeof soapNoteSchema>;
export type MedicationInput = z.infer<typeof medicationSchema>;
export type TreatmentInput = z.infer<typeof treatmentSchema>;
