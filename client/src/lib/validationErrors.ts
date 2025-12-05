/**
 * User-friendly error messages for Zod validation errors
 * Maps technical Zod errors to Portuguese messages
 */

export function getValidationErrorMessage(error: any): string {
  // If error is a tRPC error with Zod validation details
  if (error?.data?.zodError?.fieldErrors) {
    const fieldErrors = error.data.zodError.fieldErrors;
    const firstField = Object.keys(fieldErrors)[0];
    const firstError = fieldErrors[firstField]?.[0];
    return firstError || "Dados inválidos";
  }

  // If error has a message field
  if (error?.message) {
    // Map common backend error messages to Portuguese
    const message = error.message;

    if (message.includes("CPF")) return message;
    if (message.includes("Email")) return message;
    if (message.includes("Telefone")) return message;
    if (message.includes("Áudio")) return message;
    if (message.includes("Transcrição")) return message;

    // Generic messages
    if (message.includes("too large")) return "Arquivo muito grande";
    if (message.includes("too long")) return "Texto muito longo";
    if (message.includes("invalid format")) return "Formato inválido";
    if (message.includes("not found")) return "Não encontrado";
    if (message.includes("access denied")) return "Acesso negado";

    return message;
  }

  return "Erro ao processar dados. Verifique os campos e tente novamente.";
}

/**
 * Display size limit errors in Portuguese
 */
export function getSizeLimitError(field: string, maxSize: number): string {
  return `${field} muito longo (máximo ${maxSize} caracteres)`;
}

/**
 * Format CPF validation error
 */
export function getCPFError(cpf: string): string {
  if (!cpf) return "CPF é obrigatório";
  if (cpf.replace(/\D/g, "").length !== 11) {
    return "CPF deve ter 11 dígitos";
  }
  return "CPF inválido (dígitos verificadores incorretos)";
}

/**
 * Format phone validation error
 */
export function getPhoneError(): string {
  return "Telefone inválido. Use formato: (11) 98765-4321";
}

/**
 * Format email validation error
 */
export function getEmailError(): string {
  return "Email inválido";
}
