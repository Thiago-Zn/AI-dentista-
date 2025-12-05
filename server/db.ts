import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, patients, InsertPatient, consultations, InsertConsultation, consultationTemplates, InsertConsultationTemplate, patientConsents, InsertPatientConsent, auditLogs, InsertAuditLog } from "../drizzle/schema";
import { ENV } from './_core/env';
import { encryptField, decryptField, PATIENT_ENCRYPTED_FIELDS, CONSULTATION_ENCRYPTED_FIELDS } from './_core/encryption';

let _db: ReturnType<typeof drizzle> | null = null;
let _dbInitializationFailed = false;

/**
 * Get database instance with fail-fast behavior
 * Throws error if DATABASE_URL is missing or connection fails
 * This prevents the app from silently continuing with broken DB
 */
export async function getDb() {
  // If initialization already failed, throw immediately
  if (_dbInitializationFailed) {
    throw new Error(
      "[Database] Database initialization failed previously. Cannot proceed without database connection."
    );
  }

  // If already initialized, return it
  if (_db) {
    return _db;
  }

  // DATABASE_URL is required
  if (!process.env.DATABASE_URL) {
    _dbInitializationFailed = true;
    const error = new Error(
      "[Database] FATAL: DATABASE_URL environment variable is not set. Application cannot start without database."
    );
    console.error(error.message);
    throw error;
  }

  // Try to initialize connection
  try {
    _db = drizzle(process.env.DATABASE_URL);
    console.log("[Database] Connection established successfully");
    return _db;
  } catch (error) {
    _dbInitializationFailed = true;
    const enhancedError = new Error(
      `[Database] FATAL: Failed to connect to database. Application cannot start. Original error: ${error instanceof Error ? error.message : String(error)}`
    );
    console.error(enhancedError.message);

    // In production, we want to crash the process so orchestration tools (Docker, K8s) can restart
    if (process.env.NODE_ENV === "production") {
      console.error("[Database] Exiting process due to database connection failure in production");
      process.exit(1);
    }

    throw enhancedError;
  }
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb(); // Will throw if DB unavailable

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "croNumber"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); // Will throw if DB unavailable
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Patient management functions
export async function createPatient(patient: InsertPatient) {
  const db = await getDb(); // Will throw if DB unavailable
  const encryptedPatient = encryptPatientData(patient);
  const result = await db.insert(patients).values(encryptedPatient);
  return result;
}

export async function getPatientsByDentist(dentistId: number) {
  const db = await getDb(); // Will throw if DB unavailable
  const encryptedPatients = await db.select().from(patients)
    .where(eq(patients.dentistId, dentistId))
    .orderBy(desc(patients.createdAt));
  return encryptedPatients.map(decryptPatientData);
}

export async function getPatientById(id: number) {
  const db = await getDb(); // Will throw if DB unavailable
  const result = await db.select().from(patients).where(eq(patients.id, id)).limit(1);
  if (result.length === 0) return undefined;
  return decryptPatientData(result[0]);
}

export async function updatePatient(id: number, data: Partial<InsertPatient>) {
  const db = await getDb(); // Will throw if DB unavailable
  const encryptedData = encryptPatientData(data as InsertPatient);
  return await db.update(patients).set(encryptedData).where(eq(patients.id, id));
}

// Consultation management functions
export async function createConsultation(consultation: InsertConsultation) {
  const db = await getDb(); // Will throw if DB unavailable
  const result = await db.insert(consultations).values(consultation);
  const insertId = Number(result[0].insertId);
  return { id: insertId };
}

export async function getConsultationsByDentist(dentistId: number) {
  const db = await getDb(); // Will throw if DB unavailable
  const encryptedConsultations = await db.select().from(consultations)
    .where(eq(consultations.dentistId, dentistId))
    .orderBy(desc(consultations.createdAt));
  return encryptedConsultations.map(decryptConsultationData);
}

export async function getConsultationById(id: number) {
  const db = await getDb(); // Will throw if DB unavailable
  const result = await db.select().from(consultations).where(eq(consultations.id, id)).limit(1);
  if (result.length === 0) return undefined;
  return decryptConsultationData(result[0]);
}

export async function updateConsultation(id: number, data: Partial<InsertConsultation>) {
  const db = await getDb(); // Will throw if DB unavailable
  const encryptedData = encryptConsultationData(data);
  return await db.update(consultations).set(encryptedData).where(eq(consultations.id, id));
}

export async function getConsultationsByPatient(patientId: number, dentistId: number) {
  const db = await getDb(); // Will throw if DB unavailable

  const encryptedConsultations = await db.select().from(consultations)
    .where(and(eq(consultations.patientId, patientId), eq(consultations.dentistId, dentistId)))
    .orderBy(desc(consultations.createdAt));

  // Decrypt sensitive fields before returning
  return encryptedConsultations.map(decryptConsultationData);
}

// Template management functions
export async function getDefaultTemplates() {
  const db = await getDb(); // Will throw if DB unavailable
  
  return await db.select().from(consultationTemplates).where(eq(consultationTemplates.isDefault, true));
}

export async function getTemplatesByDentist(dentistId: number) {
  const db = await getDb(); // Will throw if DB unavailable
  
  return await db.select().from(consultationTemplates).where(eq(consultationTemplates.dentistId, dentistId));
}

export async function createTemplate(template: InsertConsultationTemplate) {
  const db = await getDb(); // Will throw if DB unavailable

  return await db.insert(consultationTemplates).values(template);
}

// ============================================================================
// LGPD COMPLIANCE FUNCTIONS
// ============================================================================

/**
 * Create an audit log entry
 * Call this function to record any access or modification to patient data
 */
export async function createAuditLog(log: InsertAuditLog) {
  const db = await getDb();
  if (!db) {
    console.warn("[Audit] Cannot create audit log: database not available");
    return;
  }

  try {
    await db.insert(auditLogs).values(log);
  } catch (error) {
    console.error("[Audit] Failed to create audit log:", error);
    // Don't throw - audit failures should not break the application
  }
}

/**
 * Get audit logs for a specific patient
 */
export async function getAuditLogsByPatient(patientId: number) {
  const db = await getDb(); // Will throw if DB unavailable

  return await db.select().from(auditLogs)
    .where(eq(auditLogs.patientId, patientId))
    .orderBy(desc(auditLogs.createdAt));
}

/**
 * Get audit logs for a specific user (dentist)
 */
export async function getAuditLogsByUser(userId: number) {
  const db = await getDb(); // Will throw if DB unavailable

  return await db.select().from(auditLogs)
    .where(eq(auditLogs.userId, userId))
    .orderBy(desc(auditLogs.createdAt));
}

/**
 * Create or update a patient consent
 */
export async function upsertConsent(consent: InsertPatientConsent) {
  const db = await getDb(); // Will throw if DB unavailable

  return await db.insert(patientConsents).values(consent);
}

/**
 * Get all consents for a patient
 */
export async function getConsentsByPatient(patientId: number) {
  const db = await getDb(); // Will throw if DB unavailable

  return await db.select().from(patientConsents)
    .where(eq(patientConsents.patientId, patientId))
    .orderBy(desc(patientConsents.createdAt));
}

/**
 * Check if patient has granted a specific consent
 * @returns true if consent is granted and not revoked
 */
export async function hasConsent(
  patientId: number,
  consentType: 'data_processing' | 'sensitive_health_data' | 'audio_recording' | 'ai_processing'
): Promise<boolean> {
  const db = await getDb(); // Will throw if DB unavailable

  const consents = await db.select().from(patientConsents)
    .where(
      and(
        eq(patientConsents.patientId, patientId),
        eq(patientConsents.consentType, consentType),
        eq(patientConsents.granted, true)
      )
    )
    .orderBy(desc(patientConsents.createdAt))
    .limit(1);

  if (consents.length === 0) return false;

  const consent = consents[0];
  // Consent is valid if granted and not revoked
  return consent.granted && !consent.revokedAt;
}

/**
 * Revoke a consent
 */
export async function revokeConsent(consentId: number) {
  const db = await getDb(); // Will throw if DB unavailable

  return await db.update(patientConsents)
    .set({
      granted: false,
      revokedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(patientConsents.id, consentId));
}

// ============================================================================
// ENCRYPTION HELPERS - Apply encryption to sensitive fields
// ============================================================================

/**
 * Encrypt sensitive fields in patient data before storing
 */
function encryptPatientData(patient: InsertPatient): InsertPatient {
  const encrypted = { ...patient };

  // Encrypt CPF
  if (patient.cpf) {
    encrypted.cpf = encryptField(patient.cpf) as string;
  }

  // Encrypt medical history
  if (patient.medicalHistory) {
    encrypted.medicalHistory = encryptField(patient.medicalHistory) as string;
  }

  // Encrypt allergies
  if (patient.allergies) {
    encrypted.allergies = encryptField(patient.allergies) as string;
  }

  // Encrypt medications
  if (patient.medications) {
    encrypted.medications = encryptField(patient.medications) as string;
  }

  return encrypted;
}

/**
 * Decrypt sensitive fields in patient data after retrieving
 */
function decryptPatientData(patient: any): any {
  const decrypted = { ...patient };

  // Decrypt CPF
  if (patient.cpf) {
    try {
      decrypted.cpf = decryptField(patient.cpf);
    } catch (error) {
      console.error("[Encryption] Failed to decrypt patient CPF:", error);
      decrypted.cpf = '[ENCRYPTED]';
    }
  }

  // Decrypt medical history
  if (patient.medicalHistory) {
    try {
      decrypted.medicalHistory = decryptField(patient.medicalHistory);
    } catch (error) {
      console.error("[Encryption] Failed to decrypt patient medicalHistory:", error);
      decrypted.medicalHistory = '[ENCRYPTED]';
    }
  }

  // Decrypt allergies
  if (patient.allergies) {
    try {
      decrypted.allergies = decryptField(patient.allergies);
    } catch (error) {
      console.error("[Encryption] Failed to decrypt patient allergies:", error);
      decrypted.allergies = '[ENCRYPTED]';
    }
  }

  // Decrypt medications
  if (patient.medications) {
    try {
      decrypted.medications = decryptField(patient.medications);
    } catch (error) {
      console.error("[Encryption] Failed to decrypt patient medications:", error);
      decrypted.medications = '[ENCRYPTED]';
    }
  }

  return decrypted;
}

/**
 * Encrypt sensitive fields in consultation data before storing
 */
function encryptConsultationData(consultation: Partial<InsertConsultation>): Partial<InsertConsultation> {
  const encrypted = { ...consultation };

  // Encrypt transcript
  if (consultation.transcript) {
    encrypted.transcript = encryptField(consultation.transcript) as string;
  }

  return encrypted;
}

/**
 * Decrypt sensitive fields in consultation data after retrieving
 */
function decryptConsultationData(consultation: any): any {
  const decrypted = { ...consultation };

  // Decrypt transcript
  if (consultation.transcript) {
    try {
      decrypted.transcript = decryptField(consultation.transcript);
    } catch (error) {
      console.error("[Encryption] Failed to decrypt consultation transcript:", error);
      decrypted.transcript = '[ENCRYPTED]';
    }
  }

  return decrypted;
}
