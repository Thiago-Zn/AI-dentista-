import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { 
  createPatient, 
  getPatientsByDentist, 
  getPatientById,
  updatePatient,
  createConsultation,
  getConsultationsByDentist,
  getConsultationById,
  updateConsultation,
  getConsultationsByPatient,
  getDefaultTemplates,
  getTemplatesByDentist,
  createTemplate
} from "./db";
import { storagePut } from "./storage";
import { transcribeAudio } from "./_core/voiceTranscription";
import { invokeLLM } from "./_core/llm";
import { SOAPNote } from "../drizzle/schema";
import { nanoid } from "nanoid";
import { generateConsultationPDF } from "./pdfGenerator";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  patients: router({
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        birthDate: z.string().optional(),
        medicalHistory: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createPatient({
          dentistId: ctx.user.id,
          name: input.name,
          birthDate: input.birthDate,
          medicalHistory: input.medicalHistory,
        });
        return { success: true };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return await getPatientsByDentist(ctx.user.id);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const patient = await getPatientById(input.id);
        if (!patient || patient.dentistId !== ctx.user.id) {
          throw new Error("Patient not found or access denied");
        }
        return patient;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        birthDate: z.string().optional(),
        medicalHistory: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const patient = await getPatientById(input.id);
        if (!patient || patient.dentistId !== ctx.user.id) {
          throw new Error("Patient not found or access denied");
        }
        
        const { id, ...updateData } = input;
        await updatePatient(id, updateData);
        return { success: true };
      }),
  }),

  consultations: router({
    create: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        patientName: z.string(),
        templateUsed: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await createConsultation({
          dentistId: ctx.user.id,
          patientId: input.patientId,
          patientName: input.patientName,
          templateUsed: input.templateUsed,
          status: "draft",
        });
        return { success: true, consultationId: result.id };
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      return await getConsultationsByDentist(ctx.user.id);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const consultation = await getConsultationById(input.id);
        if (!consultation || consultation.dentistId !== ctx.user.id) {
          throw new Error("Consultation not found or access denied");
        }
        return consultation;
      }),

    getByPatient: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ ctx, input }) => {
        return await getConsultationsByPatient(input.patientId, ctx.user.id);
      }),

    uploadAudio: protectedProcedure
      .input(z.object({
        consultationId: z.number(),
        audioData: z.string(), // base64 encoded audio
        mimeType: z.string(),
        durationSeconds: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const consultation = await getConsultationById(input.consultationId);
        if (!consultation || consultation.dentistId !== ctx.user.id) {
          throw new Error("Consultation not found or access denied");
        }

        // Convert base64 to buffer
        const audioBuffer = Buffer.from(input.audioData, 'base64');
        
        // Upload to S3
        const fileKey = `consultations/${ctx.user.id}/${input.consultationId}/audio-${nanoid()}.webm`;
        const { url } = await storagePut(fileKey, audioBuffer, input.mimeType);

        // Update consultation with audio URL
        await updateConsultation(input.consultationId, {
          audioUrl: url,
          audioFileKey: fileKey,
          audioDurationSeconds: input.durationSeconds,
        });

        return { success: true, audioUrl: url };
      }),

    transcribe: protectedProcedure
      .input(z.object({
        consultationId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const consultation = await getConsultationById(input.consultationId);
        if (!consultation || consultation.dentistId !== ctx.user.id) {
          throw new Error("Consultation not found or access denied");
        }

        if (!consultation.audioUrl) {
          throw new Error("No audio file found for this consultation");
        }

        // Transcribe audio using Whisper
        const result = await transcribeAudio({
          audioUrl: consultation.audioUrl,
          language: "pt",
          prompt: "Consulta odontológica. Termos técnicos: cárie, gengivite, canal, restauração, periodontia, dente, molar, incisivo.",
        });

        if ('error' in result) {
          throw new Error(result.error);
        }

        // Update consultation with transcript
        await updateConsultation(input.consultationId, {
          transcript: result.text,
        });

        return { success: true, transcript: result.text };
      }),

    analyzeAndGenerateSOAP: protectedProcedure
      .input(z.object({
        consultationId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const consultation = await getConsultationById(input.consultationId);
        if (!consultation || consultation.dentistId !== ctx.user.id) {
          throw new Error("Consultation not found or access denied");
        }

        if (!consultation.transcript) {
          throw new Error("No transcript found for this consultation");
        }

        // Dental AI analysis prompt
        const prompt = `Você é um assistente de IA especializado em documentação odontológica brasileira.

TRANSCRIÇÃO DA CONSULTA:
${consultation.transcript}

INSTRUÇÕES:
1. Analise a transcrição e extraia informações clínicas relevantes
2. Identifique automaticamente:
   - Queixa principal (QP)
   - História da doença atual (HDA)
   - Histórico médico e odontológico
   - Medicações em uso
   - Exame clínico (achados objetivos)
   - Diagnóstico odontológico
   - Plano de tratamento proposto

3. Use nomenclatura técnica odontológica brasileira:
   - Sistema de numeração FDI (dente 16, 21, etc.)
   - Faces: oclusal, mesial, distal, vestibular, lingual/palatina
   - Diagnósticos: cárie classe I/II, gengivite localizada, periodontite, etc.

4. Identifique RED FLAGS (sinais de alerta):
   - Dor intensa ou persistente
   - Sangramento excessivo
   - Edema/tumefação
   - Lesões suspeitas de malignidade
   - Contraindicações para procedimentos (anticoagulantes, gravidez, etc.)

5. Gere LEMBRETES clínicos se aplicável:
   - Necessidade de profilaxia antibiótica (cardiopatias, próteses articulares)
   - Ajuste de anticoagulante antes de cirurgia
   - Atenção especial para diabéticos/hipertensos
   - Verificar vacinação (hepatite B) se exposição a sangue

FORMATO DE SAÍDA (JSON):
{
  "subjective": {
    "queixa_principal": "string",
    "historia_doenca_atual": "string",
    "historico_medico": ["string"],
    "medicacoes": [
      {"nome": "string", "dose": "string", "frequencia": "string"}
    ]
  },
  "objective": {
    "exame_clinico_geral": "string",
    "exame_clinico_especifico": ["string"],
    "dentes_afetados": ["16", "21"]
  },
  "assessment": {
    "diagnosticos": ["string"],
    "red_flags": ["string"]
  },
  "plan": {
    "tratamentos": [
      {"procedimento": "string", "dente": "string", "urgencia": "baixa|media|alta"}
    ],
    "orientacoes": ["string"],
    "lembretes_clinicos": ["string"]
  }
}

Seja preciso, conciso e use terminologia clínica apropriada.`;

        // Call LLM for analysis
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Você é um assistente especializado em documentação odontológica brasileira." },
            { role: "user", content: prompt }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "soap_note",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  subjective: {
                    type: "object",
                    properties: {
                      queixa_principal: { type: "string" },
                      historia_doenca_atual: { type: "string" },
                      historico_medico: { type: "array", items: { type: "string" } },
                      medicacoes: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            nome: { type: "string" },
                            dose: { type: "string" },
                            frequencia: { type: "string" }
                          },
                          required: ["nome", "dose", "frequencia"],
                          additionalProperties: false
                        }
                      }
                    },
                    required: ["queixa_principal", "historia_doenca_atual", "historico_medico", "medicacoes"],
                    additionalProperties: false
                  },
                  objective: {
                    type: "object",
                    properties: {
                      exame_clinico_geral: { type: "string" },
                      exame_clinico_especifico: { type: "array", items: { type: "string" } },
                      dentes_afetados: { type: "array", items: { type: "string" } }
                    },
                    required: ["exame_clinico_geral", "exame_clinico_especifico", "dentes_afetados"],
                    additionalProperties: false
                  },
                  assessment: {
                    type: "object",
                    properties: {
                      diagnosticos: { type: "array", items: { type: "string" } },
                      red_flags: { type: "array", items: { type: "string" } }
                    },
                    required: ["diagnosticos", "red_flags"],
                    additionalProperties: false
                  },
                  plan: {
                    type: "object",
                    properties: {
                      tratamentos: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            procedimento: { type: "string" },
                            dente: { type: "string" },
                            urgencia: { type: "string", enum: ["baixa", "media", "alta"] }
                          },
                          required: ["procedimento", "dente", "urgencia"],
                          additionalProperties: false
                        }
                      },
                      orientacoes: { type: "array", items: { type: "string" } },
                      lembretes_clinicos: { type: "array", items: { type: "string" } }
                    },
                    required: ["tratamentos", "orientacoes", "lembretes_clinicos"],
                    additionalProperties: false
                  }
                },
                required: ["subjective", "objective", "assessment", "plan"],
                additionalProperties: false
              }
            }
          }
        });

        const content = response.choices[0].message.content;
        const soapNote: SOAPNote = JSON.parse(typeof content === 'string' ? content : JSON.stringify(content));

        // Update consultation with SOAP note
        await updateConsultation(input.consultationId, {
          soapNote: soapNote,
        });

        return { success: true, soapNote };
      }),

    updateSOAP: protectedProcedure
      .input(z.object({
        consultationId: z.number(),
        soapNote: z.any(),
      }))
      .mutation(async ({ ctx, input }) => {
        const consultation = await getConsultationById(input.consultationId);
        if (!consultation || consultation.dentistId !== ctx.user.id) {
          throw new Error("Consultation not found or access denied");
        }

        await updateConsultation(input.consultationId, {
          soapNote: input.soapNote,
        });

        return { success: true };
      }),

    finalize: protectedProcedure
      .input(z.object({
        consultationId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const consultation = await getConsultationById(input.consultationId);
        if (!consultation || consultation.dentistId !== ctx.user.id) {
          throw new Error("Consultation not found or access denied");
        }

        await updateConsultation(input.consultationId, {
          status: "finalized",
          finalizedAt: new Date(),
        });

        return { success: true };
      }),

    exportPDF: protectedProcedure
      .input(z.object({
        consultationId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const consultation = await getConsultationById(input.consultationId);
        if (!consultation || consultation.dentistId !== ctx.user.id) {
          throw new Error("Consultation not found or access denied");
        }

        if (!consultation.soapNote) {
          throw new Error("No SOAP note available for this consultation");
        }

        const pdfBuffer = await generateConsultationPDF({
          patientName: consultation.patientName,
          consultationDate: consultation.createdAt,
          dentistName: ctx.user.name || "Dentista",
          dentistCRO: ctx.user.croNumber || undefined,
          soapNote: consultation.soapNote,
        });

        // Convert buffer to base64 for transmission
        const base64PDF = pdfBuffer.toString('base64');

        return { success: true, pdfData: base64PDF };
      }),
  }),

  templates: router({
    listDefault: publicProcedure.query(async () => {
      return await getDefaultTemplates();
    }),

    listMine: protectedProcedure.query(async ({ ctx }) => {
      return await getTemplatesByDentist(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        promptCustomization: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await createTemplate({
          dentistId: ctx.user.id,
          name: input.name,
          description: input.description,
          icon: input.icon,
          color: input.color,
          promptCustomization: input.promptCustomization,
          isDefault: false,
        });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
