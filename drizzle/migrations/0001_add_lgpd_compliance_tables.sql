-- Migration: Add LGPD compliance tables (consents and audit logs)
-- Created: 2025-12-05
-- Purpose: Enable LGPD compliance with explicit consent tracking and access auditing

-- Create patientConsents table
CREATE TABLE IF NOT EXISTS `patientConsents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `patientId` INT NOT NULL,
  `dentistId` INT NOT NULL,
  `consentType` ENUM('data_processing', 'sensitive_health_data', 'audio_recording', 'ai_processing') NOT NULL,
  `granted` BOOLEAN NOT NULL DEFAULT FALSE,
  `termsVersion` VARCHAR(50) NOT NULL,
  `ipAddress` VARCHAR(45),
  `userAgent` TEXT,
  `grantedAt` TIMESTAMP NULL,
  `revokedAt` TIMESTAMP NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_patientId` (`patientId`),
  INDEX `idx_dentistId` (`dentistId`),
  INDEX `idx_consentType` (`consentType`),
  INDEX `idx_granted` (`granted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create auditLogs table
CREATE TABLE IF NOT EXISTS `auditLogs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `userEmail` VARCHAR(320),
  `userName` VARCHAR(255),
  `action` ENUM(
    'patient_created',
    'patient_viewed',
    'patient_updated',
    'patient_deleted',
    'consultation_created',
    'consultation_viewed',
    'consultation_updated',
    'consultation_deleted',
    'consultation_exported_pdf',
    'audio_uploaded',
    'audio_transcribed',
    'soap_generated',
    'soap_updated',
    'consent_granted',
    'consent_revoked'
  ) NOT NULL,
  `patientId` INT,
  `consultationId` INT,
  `ipAddress` VARCHAR(45),
  `userAgent` TEXT,
  `requestPath` VARCHAR(500),
  `metadata` JSON,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_userId` (`userId`),
  INDEX `idx_action` (`action`),
  INDEX `idx_patientId` (`patientId`),
  INDEX `idx_consultationId` (`consultationId`),
  INDEX `idx_createdAt` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comments for documentation
ALTER TABLE `patientConsents` COMMENT = 'LGPD compliance: Stores explicit consent records for data processing';
ALTER TABLE `auditLogs` COMMENT = 'LGPD compliance: Audit trail of all access to patient data';
