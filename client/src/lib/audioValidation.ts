import { AUDIO_CONSTRAINTS } from "@shared/schemas/consultation";

/**
 * Validate audio file size and duration before upload
 */
export function validateAudioFile(
  blob: Blob,
  durationSeconds: number
): { valid: boolean; error?: string } {
  // Check file size
  const sizeInMB = blob.size / (1024 * 1024);
  if (sizeInMB > AUDIO_CONSTRAINTS.MAX_SIZE_MB) {
    return {
      valid: false,
      error: `Áudio muito grande (${sizeInMB.toFixed(1)}MB). Máximo permitido: ${AUDIO_CONSTRAINTS.MAX_SIZE_MB}MB`,
    };
  }

  // Check duration
  if (durationSeconds > AUDIO_CONSTRAINTS.MAX_DURATION_SECONDS) {
    const durationMinutes = Math.floor(durationSeconds / 60);
    return {
      valid: false,
      error: `Áudio muito longo (${durationMinutes} minutos). Máximo permitido: ${AUDIO_CONSTRAINTS.MAX_DURATION_MINUTES} minutos`,
    };
  }

  // Check mime type
  if (!AUDIO_CONSTRAINTS.ALLOWED_TYPES.includes(blob.type as any)) {
    return {
      valid: false,
      error: `Formato de áudio não suportado: ${blob.type}. Use: ${AUDIO_CONSTRAINTS.ALLOWED_TYPES.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Get audio constraints for display in UI
 */
export function getAudioConstraintsText(): string {
  return `Máximo: ${AUDIO_CONSTRAINTS.MAX_SIZE_MB}MB, ${AUDIO_CONSTRAINTS.MAX_DURATION_MINUTES} minutos`;
}
