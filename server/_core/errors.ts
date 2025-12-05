/**
 * Structured error codes for external service failures
 * Used to provide clear, actionable error messages to clients
 */

export enum ErrorCode {
  // Storage errors
  STORAGE_UPLOAD_FAILED = "STORAGE_UPLOAD_FAILED",
  STORAGE_DOWNLOAD_FAILED = "STORAGE_DOWNLOAD_FAILED",

  // Transcription errors
  TRANSCRIPTION_FAILED = "TRANSCRIPTION_FAILED",
  TRANSCRIPTION_TIMEOUT = "TRANSCRIPTION_TIMEOUT",
  AUDIO_FILE_INVALID = "AUDIO_FILE_INVALID",

  // LLM errors
  LLM_RESPONSE_FAILED = "LLM_RESPONSE_FAILED",
  LLM_RESPONSE_INVALID = "LLM_RESPONSE_INVALID",
  LLM_TIMEOUT = "LLM_TIMEOUT",
  LLM_RATE_LIMIT_EXCEEDED = "LLM_RATE_LIMIT_EXCEEDED",

  // PDF generation errors
  PDF_GENERATION_FAILED = "PDF_GENERATION_FAILED",

  // Database errors
  DATABASE_ERROR = "DATABASE_ERROR",
  DATABASE_UNAVAILABLE = "DATABASE_UNAVAILABLE",

  // Generic errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
}

/**
 * Structured error class for external service failures
 * Includes error code, user-friendly message, and optional metadata
 */
export class ServiceError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, any>,
    public originalError?: Error
  ) {
    super(message);
    this.name = "ServiceError";

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServiceError);
    }
  }

  /**
   * Convert error to JSON for API responses
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }

  /**
   * Log error with context
   */
  log(context?: string) {
    console.error(
      `[ServiceError${context ? ` ${context}` : ""}] ${this.code}: ${this.message}`,
      {
        details: this.details,
        originalError: this.originalError?.message,
        stack: this.originalError?.stack || this.stack,
      }
    );
  }
}

/**
 * Helper to wrap external service calls with error handling
 */
export async function wrapServiceCall<T>(
  serviceName: string,
  errorCode: ErrorCode,
  errorMessage: string,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const serviceError = new ServiceError(
      errorCode,
      errorMessage,
      { serviceName },
      error instanceof Error ? error : undefined
    );
    serviceError.log(serviceName);
    throw serviceError;
  }
}
