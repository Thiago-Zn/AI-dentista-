import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  // Dental-specific fields
  croNumber: varchar("croNumber", { length: 50 }),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Patients table - stores patient information
 */
export const patients = mysqlTable("patients", {
  id: int("id").autoincrement().primaryKey(),
  dentistId: int("dentistId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  birthDate: varchar("birthDate", { length: 10 }),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 320 }),
  cpf: varchar("cpf", { length: 14 }),
  medicalHistory: text("medicalHistory"),
  allergies: text("allergies"),
  medications: text("medications"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Patient = typeof patients.$inferSelect;
export type InsertPatient = typeof patients.$inferInsert;

/**
 * Consultations table - stores consultation records
 */
export const consultations = mysqlTable("consultations", {
  id: int("id").autoincrement().primaryKey(),
  dentistId: int("dentistId").notNull(),
  patientId: int("patientId").notNull(),
  patientName: varchar("patientName", { length: 255 }).notNull(),
  
  // Audio data
  audioUrl: text("audioUrl"),
  audioFileKey: text("audioFileKey"),
  audioDurationSeconds: int("audioDurationSeconds"),
  
  // Transcription
  transcript: text("transcript"),
  transcriptSegments: json("transcriptSegments"),  // Whisper API segments with timestamps
  
  // AI Analysis and SOAP note
  soapNote: json("soapNote").$type<SOAPNote>(),
  
  // Metadata
  templateUsed: varchar("templateUsed", { length: 50 }),
  status: mysqlEnum("status", ["draft", "finalized", "exported"]).default("draft").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  finalizedAt: timestamp("finalizedAt"),
});

export type Consultation = typeof consultations.$inferSelect;
export type InsertConsultation = typeof consultations.$inferInsert;

/**
 * Consultation templates - predefined templates for different consultation types
 */
export const consultationTemplates = mysqlTable("consultationTemplates", {
  id: int("id").autoincrement().primaryKey(),
  dentistId: int("dentistId"),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }),
  color: varchar("color", { length: 50 }),
  promptCustomization: text("promptCustomization"),
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConsultationTemplate = typeof consultationTemplates.$inferSelect;
export type InsertConsultationTemplate = typeof consultationTemplates.$inferInsert;

/**
 * Patient consents table - LGPD compliance
 * Stores explicit consent records for data processing
 */
export const patientConsents = mysqlTable("patientConsents", {
  id: int("id").autoincrement().primaryKey(),
  patientId: int("patientId").notNull(),
  dentistId: int("dentistId").notNull(),

  // Type of consent given
  consentType: mysqlEnum("consentType", [
    "data_processing",      // General data processing consent (LGPD Art. 7)
    "sensitive_health_data", // Explicit consent for health data (LGPD Art. 11)
    "audio_recording",       // Consent to record consultations
    "ai_processing"          // Consent for AI analysis of health data
  ]).notNull(),

  // Consent details
  granted: boolean("granted").notNull().default(false),
  termsVersion: varchar("termsVersion", { length: 50 }).notNull(), // e.g., "1.0", "2023-12-05"
  ipAddress: varchar("ipAddress", { length: 45 }), // IPv4 or IPv6
  userAgent: text("userAgent"),

  // Timestamps for audit trail
  grantedAt: timestamp("grantedAt"),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PatientConsent = typeof patientConsents.$inferSelect;
export type InsertPatientConsent = typeof patientConsents.$inferInsert;

/**
 * Audit logs table - LGPD compliance
 * Records all access and modifications to patient data
 */
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),

  // Who performed the action
  userId: int("userId").notNull(), // dentist ID
  userEmail: varchar("userEmail", { length: 320 }),
  userName: varchar("userName", { length: 255 }),

  // What was accessed/modified
  action: mysqlEnum("action", [
    "patient_created",
    "patient_viewed",
    "patient_updated",
    "patient_deleted",
    "consultation_created",
    "consultation_viewed",
    "consultation_updated",
    "consultation_deleted",
    "consultation_exported_pdf",
    "audio_uploaded",
    "audio_transcribed",
    "soap_generated",
    "soap_updated",
    "consent_granted",
    "consent_revoked"
  ]).notNull(),

  // Related entities
  patientId: int("patientId"), // null if action doesn't involve a patient
  consultationId: int("consultationId"), // null if action doesn't involve a consultation

  // Request metadata for forensics
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  requestPath: varchar("requestPath", { length: 500 }),

  // Additional context (JSON)
  metadata: json("metadata"), // e.g., { "fields_changed": ["name", "cpf"], "old_values": {...} }

  // Timestamp
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

/**
 * SOAP Note structure for dental consultations
 */
export interface SOAPNote {
  urgency?: "high" | "medium" | "low";
  subjective: {
    queixa_principal: string;
    historia_doenca_atual: string;
    historico_medico: string[];
    medicacoes: Array<{
      nome: string;
      dose: string;
      frequencia: string;
    }>;
  };
  objective: {
    exame_clinico_geral: string;
    exame_clinico_especifico: string[];
    dentes_afetados: string[];
  };
  assessment: {
    diagnosticos: string[];
    red_flags: string[];
  };
  plan: {
    tratamentos: Array<{
      procedimento: string;
      dente: string;
      urgencia: "alta" | "media" | "baixa";
    }>;
    orientacoes: string[];
    lembretes_clinicos: string[];
  };
}
