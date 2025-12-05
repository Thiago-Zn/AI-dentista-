/**
 * Audit middleware for tRPC - LGPD compliance
 *
 * Automatically logs access to patient data for audit trail purposes
 * Required by LGPD Article 46 - security measures and access logging
 */

import { TRPCError } from "@trpc/server";
import type { TrpcContext } from "./context";
import { createAuditLog } from "../db";
import type { InsertAuditLog } from "../../drizzle/schema";

/**
 * Extract IP address from request
 */
function getIpAddress(req: TrpcContext["req"]): string | undefined {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress;
}

/**
 * Extract user agent from request
 */
function getUserAgent(req: TrpcContext["req"]): string | undefined {
  const userAgent = req.headers["user-agent"];
  return typeof userAgent === "string" ? userAgent : undefined;
}

/**
 * Get request path from request
 */
function getRequestPath(req: TrpcContext["req"]): string {
  return req.url || req.path || "unknown";
}

/**
 * Create audit middleware that logs specific actions
 *
 * Usage:
 * ```ts
 * const viewPatientProcedure = protectedProcedure
 *   .use(auditAction("patient_viewed"))
 *   .query(async ({ ctx, input }) => {
 *     // Your logic here
 *   });
 * ```
 */
export function auditAction(
  action: InsertAuditLog["action"],
  options?: {
    extractPatientId?: (input: any) => number | undefined;
    extractConsultationId?: (input: any) => number | undefined;
    extractMetadata?: (input: any, result: any) => Record<string, any> | undefined;
  }
) {
  return async ({ ctx, next, input, path }: any) => {
    // Execute the procedure first
    const result = await next();

    // Only log if user is authenticated
    if (!ctx.user) {
      return result;
    }

    // Build audit log entry
    const patientId = options?.extractPatientId?.(input);
    const consultationId = options?.extractConsultationId?.(input);
    const metadata = options?.extractMetadata?.(input, result);

    const auditLog: InsertAuditLog = {
      userId: ctx.user.id,
      userEmail: ctx.user.email || undefined,
      userName: ctx.user.name || undefined,
      action,
      patientId,
      consultationId,
      ipAddress: getIpAddress(ctx.req),
      userAgent: getUserAgent(ctx.req),
      requestPath: getRequestPath(ctx.req),
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    };

    // Log audit entry (async, don't wait)
    createAuditLog(auditLog).catch((error) => {
      console.error("[Audit] Failed to log action:", action, error);
    });

    return result;
  };
}

/**
 * Simplified audit middleware for common patterns
 */
export const auditMiddleware = {
  /**
   * Audit patient creation
   */
  patientCreated: () =>
    auditAction("patient_created", {
      extractMetadata: (input) => ({
        patient_name: input.name,
        has_cpf: !!input.cpf,
        has_medical_history: !!input.medicalHistory,
      }),
    }),

  /**
   * Audit patient viewing
   */
  patientViewed: () =>
    auditAction("patient_viewed", {
      extractPatientId: (input) => input.id,
    }),

  /**
   * Audit patient update
   */
  patientUpdated: () =>
    auditAction("patient_updated", {
      extractPatientId: (input) => input.id,
      extractMetadata: (input) => ({
        fields_updated: Object.keys(input).filter((k) => k !== "id"),
      }),
    }),

  /**
   * Audit patient deletion
   */
  patientDeleted: () =>
    auditAction("patient_deleted", {
      extractPatientId: (input) => input.id,
    }),

  /**
   * Audit consultation creation
   */
  consultationCreated: () =>
    auditAction("consultation_created", {
      extractPatientId: (input) => input.patientId,
      extractMetadata: (input, result) => ({
        consultation_id: result?.consultationId,
        template_used: input.templateUsed,
      }),
    }),

  /**
   * Audit consultation viewing
   */
  consultationViewed: () =>
    auditAction("consultation_viewed", {
      extractConsultationId: (input) => input.id || input.consultationId,
    }),

  /**
   * Audit consultation update
   */
  consultationUpdated: () =>
    auditAction("consultation_updated", {
      extractConsultationId: (input) => input.id || input.consultationId,
    }),

  /**
   * Audit audio upload
   */
  audioUploaded: () =>
    auditAction("audio_uploaded", {
      extractConsultationId: (input) => input.consultationId,
      extractMetadata: (input) => ({
        audio_duration_seconds: input.durationSeconds,
        mime_type: input.mimeType,
      }),
    }),

  /**
   * Audit audio transcription
   */
  audioTranscribed: () =>
    auditAction("audio_transcribed", {
      extractConsultationId: (input) => input.consultationId,
    }),

  /**
   * Audit SOAP note generation
   */
  soapGenerated: () =>
    auditAction("soap_generated", {
      extractConsultationId: (input) => input.consultationId,
    }),

  /**
   * Audit SOAP note update
   */
  soapUpdated: () =>
    auditAction("soap_updated", {
      extractConsultationId: (input) => input.consultationId,
    }),

  /**
   * Audit PDF export
   */
  consultationExportedPdf: () =>
    auditAction("consultation_exported_pdf", {
      extractConsultationId: (input) => input.consultationId || input.id,
    }),

  /**
   * Audit consent granted
   */
  consentGranted: () =>
    auditAction("consent_granted", {
      extractPatientId: (input) => input.patientId,
      extractMetadata: (input) => ({
        consent_type: input.consentType,
        terms_version: input.termsVersion,
      }),
    }),

  /**
   * Audit consent revoked
   */
  consentRevoked: () =>
    auditAction("consent_revoked", {
      extractMetadata: (input) => ({
        consent_id: input.consentId,
      }),
    }),
};
