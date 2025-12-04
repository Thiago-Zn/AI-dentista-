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

describe("consultations router", () => {
  it("should create a new consultation", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.consultations.create({
      patientId: 1,
      patientName: "Test Patient",
      templateUsed: "general",
    });

    expect(result).toMatchObject({ success: true });
    expect(result.consultationId).toBeGreaterThan(0);
  });

  it("should list consultations for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const consultations = await caller.consultations.list();

    expect(Array.isArray(consultations)).toBe(true);
  });

  it("should update SOAP note for consultation", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a consultation first
    await caller.consultations.create({
      patientId: 1,
      patientName: "Test Patient",
    });

    // Mock SOAP note
    const mockSOAPNote = {
      subjective: {
        queixa_principal: "Dor no dente",
        historia_doenca_atual: "Dor há 3 dias",
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
        exame_clinico_especifico: ["Cárie profunda no dente 16"],
        dentes_afetados: ["16"],
      },
      assessment: {
        diagnosticos: ["Cárie profunda dente 16"],
        red_flags: [],
      },
      plan: {
        tratamentos: [
          {
            procedimento: "Tratamento de canal",
            dente: "16",
            urgencia: "alta" as const,
          },
        ],
        orientacoes: ["Evitar alimentos duros"],
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

describe("patients router", () => {
  it("should create a new patient", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.patients.create({
      name: "Maria Silva",
      birthDate: "1980-05-15",
      medicalHistory: "Hipertensão controlada",
    });

    expect(result).toEqual({ success: true });
  });

  it("should list patients for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const patients = await caller.patients.list();

    expect(Array.isArray(patients)).toBe(true);
  });
});

describe("templates router", () => {
  it("should list default templates", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const templates = await caller.templates.listDefault();

    expect(Array.isArray(templates)).toBe(true);
  });

  it("should create custom template", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.templates.create({
      name: "Consulta de Emergência",
      description: "Template para consultas de emergência",
      icon: "alert",
      color: "red",
    });

    expect(result).toEqual({ success: true });
  });
});
