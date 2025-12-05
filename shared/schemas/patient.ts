import { z } from "zod";

/**
 * CPF validation regex
 * Accepts formats: 123.456.789-00 or 12345678900
 */
const CPF_REGEX = /^(\d{3}\.?\d{3}\.?\d{3}-?\d{2})$/;

/**
 * Email validation (standard)
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Phone validation for Brazilian formats
 * Accepts: (11) 98765-4321, 11987654321, (11)987654321, etc.
 */
const PHONE_REGEX = /^(\+55\s?)?(\(?\d{2}\)?[\s-]?)?\d{4,5}[\s-]?\d{4}$/;

/**
 * Date validation (YYYY-MM-DD format)
 */
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Patient creation schema
 */
export const createPatientSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(255, "Nome muito longo"),

  birthDate: z
    .string()
    .regex(DATE_REGEX, "Data de nascimento inválida (use YYYY-MM-DD)")
    .optional()
    .refine(
      (date) => {
        if (!date) return true;
        const d = new Date(date);
        const now = new Date();
        const age = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        return age >= 0 && age <= 150;
      },
      { message: "Data de nascimento inválida" }
    ),

  phone: z
    .string()
    .regex(PHONE_REGEX, "Telefone inválido")
    .max(20)
    .optional(),

  email: z
    .string()
    .regex(EMAIL_REGEX, "Email inválido")
    .max(320)
    .optional(),

  cpf: z
    .string()
    .regex(CPF_REGEX, "CPF inválido (use formato 123.456.789-00)")
    .optional()
    .refine(
      (cpf) => {
        if (!cpf) return true;
        // Remove formatting
        const numbers = cpf.replace(/\D/g, "");
        if (numbers.length !== 11) return false;

        // Check for known invalid CPFs (all same digit)
        if (/^(\d)\1{10}$/.test(numbers)) return false;

        // Validate check digits
        let sum = 0;
        for (let i = 0; i < 9; i++) {
          sum += parseInt(numbers.charAt(i)) * (10 - i);
        }
        let digit1 = 11 - (sum % 11);
        if (digit1 > 9) digit1 = 0;

        if (parseInt(numbers.charAt(9)) !== digit1) return false;

        sum = 0;
        for (let i = 0; i < 10; i++) {
          sum += parseInt(numbers.charAt(i)) * (11 - i);
        }
        let digit2 = 11 - (sum % 11);
        if (digit2 > 9) digit2 = 0;

        return parseInt(numbers.charAt(10)) === digit2;
      },
      { message: "CPF inválido (dígitos verificadores incorretos)" }
    ),

  medicalHistory: z
    .string()
    .max(10000, "Histórico médico muito longo (máx 10000 caracteres)")
    .optional(),

  allergies: z
    .string()
    .max(5000, "Lista de alergias muito longa (máx 5000 caracteres)")
    .optional(),

  medications: z
    .string()
    .max(5000, "Lista de medicações muito longa (máx 5000 caracteres)")
    .optional(),
});

/**
 * Patient update schema (all fields optional except id)
 */
export const updatePatientSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2).max(255).optional(),
  birthDate: z
    .string()
    .regex(DATE_REGEX)
    .optional()
    .refine(
      (date) => {
        if (!date) return true;
        const d = new Date(date);
        const now = new Date();
        const age = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        return age >= 0 && age <= 150;
      },
      { message: "Data de nascimento inválida" }
    ),
  phone: z.string().regex(PHONE_REGEX).max(20).optional(),
  email: z.string().regex(EMAIL_REGEX).max(320).optional(),
  cpf: z.string().regex(CPF_REGEX).optional(),
  medicalHistory: z.string().max(10000).optional(),
  allergies: z.string().max(5000).optional(),
  medications: z.string().max(5000).optional(),
});

/**
 * Get patient by ID schema
 */
export const getPatientByIdSchema = z.object({
  id: z.number().int().positive(),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type GetPatientByIdInput = z.infer<typeof getPatientByIdSchema>;
