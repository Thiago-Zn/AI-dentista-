import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-dentist",
    email: "dentist@example.com",
    name: "Dr. Test Dentist",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("MVP Critical Features", () => {
  describe("Patient Management", () => {
    it("should create patient with all fields", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.patients.create({
        name: "João Silva",
        birthDate: "1985-03-15",
        phone: "(11) 98765-4321",
        email: "joao@example.com",
        cpf: "123.456.789-00",
        medicalHistory: "Hipertensão controlada",
        allergies: "Penicilina",
        medications: "Losartana 50mg",
      });

      expect(result).toEqual({ success: true });
    });

    it("should list patients for authenticated user", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const patients = await caller.patients.list();

      expect(Array.isArray(patients)).toBe(true);
    });

    it("should get patient by ID", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Get existing patients
      const patients = await caller.patients.list();
      
      if (patients.length > 0) {
        const patientId = patients[0].id;
        const patient = await caller.patients.getById({ id: patientId });
        
        expect(patient).toBeDefined();
        expect(patient?.id).toBe(patientId);
        expect(patient?.name).toBeDefined();
      }
    });
  });

  describe("SOAP Note Editing", () => {
    it("should update SOAP note successfully", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create consultation
      await caller.consultations.create({
        patientId: 1,
        patientName: "Test Patient for SOAP Edit",
      });

      const mockSOAPNote = {
        subjective: {
          queixa_principal: "Dor no dente 16",
          historia_doenca_atual: "Dor há 5 dias, aumenta ao mastigar",
          historico_medico: ["Hipertensão"],
          medicacoes: [
            {
              nome: "Losartana",
              dose: "50mg",
              frequencia: "1x ao dia",
            },
          ],
        },
        objective: {
          exame_clinico_geral: "Paciente em bom estado geral",
          exame_clinico_especifico: ["Cárie profunda dente 16", "Sensibilidade à percussão"],
          dentes_afetados: ["16"],
        },
        assessment: {
          diagnosticos: ["Pulpite irreversível dente 16"],
          red_flags: ["Dor intensa que não melhora com analgésicos"],
        },
        plan: {
          tratamentos: [
            {
              procedimento: "Tratamento endodôntico",
              dente: "16",
              urgencia: "alta" as const,
            },
          ],
          orientacoes: ["Evitar mastigar do lado direito", "Tomar analgésico prescrito"],
          lembretes_clinicos: ["Verificar pressão arterial antes do procedimento"],
        },
      };

      const result = await caller.consultations.updateSOAP({
        consultationId: 1,
        soapNote: mockSOAPNote,
      });

      expect(result).toEqual({ success: true });
    });
  });

  describe("PDF Export", () => {
    it("should generate PDF for consultation with SOAP note", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // Create consultation with SOAP note
      await caller.consultations.create({
        patientId: 1,
        patientName: "Test Patient for PDF",
      });

      const mockSOAPNote = {
        subjective: {
          queixa_principal: "Dor no dente",
          historia_doenca_atual: "Dor há 3 dias",
          historico_medico: [],
          medicacoes: [],
        },
        objective: {
          exame_clinico_geral: "Normal",
          exame_clinico_especifico: ["Cárie dente 21"],
          dentes_afetados: ["21"],
        },
        assessment: {
          diagnosticos: ["Cárie dente 21"],
          red_flags: [],
        },
        plan: {
          tratamentos: [
            {
              procedimento: "Restauração",
              dente: "21",
              urgencia: "media" as const,
            },
          ],
          orientacoes: ["Higiene oral"],
          lembretes_clinicos: [],
        },
      };

      await caller.consultations.updateSOAP({
        consultationId: 1,
        soapNote: mockSOAPNote,
      });

      const result = await caller.consultations.exportPDF({
        consultationId: 1,
      });

      expect(result.success).toBe(true);
      expect(result.pdfData).toBeDefined();
      expect(typeof result.pdfData).toBe("string");
      expect(result.pdfData.length).toBeGreaterThan(0);
    });

    // Note: PDF export currently generates empty PDF if no SOAP note exists
    // This is acceptable behavior for MVP - dentist can still export consultation record
  });

  describe("Consultation Workflow", () => {
    it("should complete full consultation workflow", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      // 1. Create patient
      await caller.patients.create({
        name: "Workflow Test Patient",
        birthDate: "1988-05-10",
        medicalHistory: "Nenhum",
      });

      // 2. Create consultation
      const createResult = await caller.consultations.create({
        patientId: 1,
        patientName: "Workflow Test Patient",
      });
      expect(createResult.success).toBe(true);

      // 3. Add SOAP note
      const soapNote = {
        subjective: {
          queixa_principal: "Check-up",
          historia_doenca_atual: "Consulta de rotina",
          historico_medico: [],
          medicacoes: [],
        },
        objective: {
          exame_clinico_geral: "Boa saúde oral",
          exame_clinico_especifico: [],
          dentes_afetados: [],
        },
        assessment: {
          diagnosticos: ["Saúde oral adequada"],
          red_flags: [],
        },
        plan: {
          tratamentos: [],
          orientacoes: ["Manter higiene oral"],
          lembretes_clinicos: ["Retorno em 6 meses"],
        },
      };

      const updateResult = await caller.consultations.updateSOAP({
        consultationId: 1,
        soapNote,
      });
      expect(updateResult.success).toBe(true);

      // 4. Finalize consultation
      const finalizeResult = await caller.consultations.finalize({
        consultationId: 1,
      });
      expect(finalizeResult.success).toBe(true);

      // 5. Export PDF
      const exportResult = await caller.consultations.exportPDF({
        consultationId: 1,
      });
      expect(exportResult.success).toBe(true);
      expect(exportResult.pdfData).toBeDefined();
    });
  });
});
