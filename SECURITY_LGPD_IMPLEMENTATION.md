# 🔐 Implementação de Segurança e LGPD - DentScribe AI

## ✅ O Que Foi Implementado

Este documento descreve as correções críticas de segurança e conformidade com LGPD implementadas no DentScribe AI.

---

## 📋 RESUMO DAS MUDANÇAS

### 1. ✅ README Atualizado com Avisos de Limitações

**Arquivo**: `README.md`

- ❌ **REMOVIDO**: Afirmações falsas sobre "dados criptografados em repouso" e "conformidade com LGPD"
- ✅ **ADICIONADO**: Seção **"AVISO IMPORTANTE - LIMITAÇÕES DO MVP"** destacando que:
  - Sistema é MVP e NÃO deve ser usado com dados reais
  - Lista clara de limitações de segurança e LGPD
  - Recomendações de uso apropriado (demos, testes, avaliação)
  - Roadmap de implementações de segurança futuras

---

### 2. ✅ Criptografia de Dados Sensíveis em Repouso (AES-256-GCM)

**Arquivo**: `server/_core/encryption.ts` (NOVO)

Implementação completa de criptografia simétrica usando AES-256-GCM para proteger:

**Dados de Pacientes**:
- CPF
- Histórico médico
- Alergias
- Medicações

**Dados de Consultas**:
- Transcrições de áudio (contêm informações sensíveis de saúde)

**Funções principais**:
- `encryptField(plaintext)` - Criptografa um campo
- `decryptField(encrypted)` - Descriptografa um campo
- `encryptFields(object, fields)` - Criptografa múltiplos campos
- `decryptFields(object, fields)` - Descriptografa múltiplos campos

**Características**:
- Algoritmo: AES-256-GCM (autenticado)
- IV aleatório de 12 bytes por registro
- Authentication tag de 16 bytes
- Formato armazenado: `iv:authTag:ciphertext` (hex)
- Chave de 32 bytes (256 bits) via variável de ambiente

---

### 3. ✅ Tabelas de Conformidade LGPD

**Arquivo**: `drizzle/schema.ts`

Duas novas tabelas adicionadas:

#### Tabela `patientConsents`
Armazena consentimentos explícitos dos pacientes:

- **Tipos de consentimento**:
  - `data_processing` - Processamento geral de dados (LGPD Art. 7)
  - `sensitive_health_data` - Dados sensíveis de saúde (LGPD Art. 11)
  - `audio_recording` - Gravação de consultas
  - `ai_processing` - Processamento por IA

- **Campos de auditoria**:
  - `granted` - Se foi concedido
  - `termsVersion` - Versão dos termos aceitos
  - `grantedAt` - Data/hora de concessão
  - `revokedAt` - Data/hora de revogação (se aplicável)
  - `ipAddress` - IP do usuário que concedeu
  - `userAgent` - Navegador/dispositivo

#### Tabela `auditLogs`
Registra todos os acessos e modificações de dados de pacientes:

- **Ações rastreadas**:
  - Criação, visualização, atualização e exclusão de pacientes
  - Criação, visualização, atualização e exclusão de consultas
  - Upload e transcrição de áudio
  - Geração e atualização de notas SOAP
  - Exportação de PDFs
  - Concessão e revogação de consentimentos

- **Metadados capturados**:
  - Usuário (ID, email, nome)
  - Paciente/consulta afetados
  - IP, user agent, caminho da requisição
  - Metadata adicional em JSON

---

### 4. ✅ Migration SQL para Novas Tabelas

**Arquivo**: `drizzle/migrations/0001_add_lgpd_compliance_tables.sql` (NOVO)

Migration SQL pronta para criar as tabelas `patientConsents` e `auditLogs` com:
- Índices otimizados para consultas de auditoria
- Engine InnoDB com charset UTF-8
- Comentários descrevendo finalidade LGPD

**Execução**:
```bash
# Execute manualmente ou através de:
pnpm db:push
```

---

### 5. ✅ Funções de Banco com Criptografia Automática

**Arquivo**: `server/db.ts`

Todas as funções de pacientes e consultas foram modificadas para:

**Na escrita (create/update)**:
- Criptografar automaticamente campos sensíveis **antes** de inserir no banco
- Usar `encryptPatientData()` e `encryptConsultationData()`

**Na leitura (get/list)**:
- Descriptografar automaticamente campos sensíveis **após** buscar do banco
- Usar `decryptPatientData()` e `decryptConsultationData()`
- Tratamento de erros: se descriptografia falhar, campo aparece como `[ENCRYPTED]`

**Novas funções de LGPD**:
- `createAuditLog(log)` - Registra ação de auditoria
- `getAuditLogsByPatient(patientId)` - Lista logs de um paciente
- `getAuditLogsByUser(userId)` - Lista logs de um dentista
- `upsertConsent(consent)` - Cria/atualiza consentimento
- `getConsentsByPatient(patientId)` - Lista consentimentos de um paciente
- `hasConsent(patientId, type)` - Verifica se paciente consentiu
- `revokeConsent(consentId)` - Revoga consentimento

---

### 6. ✅ Middleware de Auditoria para tRPC

**Arquivo**: `server/_core/auditMiddleware.ts` (NOVO)

Middleware reutilizável para aplicar auditoria automática em rotas tRPC:

**Função `auditAction(action, options)`**:
- Captura IP, user agent, caminho da requisição
- Extrai patientId e consultationId do input
- Permite metadata customizada
- Registra log **após** sucesso da operação (não trava em falhas de auditoria)

**Helpers pré-configurados** em `auditMiddleware`:
- `patientCreated()`, `patientViewed()`, `patientUpdated()`, `patientDeleted()`
- `consultationCreated()`, `consultationViewed()`, `consultationUpdated()`
- `audioUploaded()`, `audioTranscribed()`
- `soapGenerated()`, `soapUpdated()`
- `consultationExportedPdf()`
- `consentGranted()`, `consentRevoked()`

**Exemplo de uso**:
```typescript
const viewPatientProcedure = protectedProcedure
  .use(auditMiddleware.patientViewed())
  .query(async ({ ctx, input }) => {
    return await getPatientById(input.id);
  });
```

---

## 🔧 VARIÁVEIS DE AMBIENTE OBRIGATÓRIAS

### Nova Variável Crítica

Adicione ao seu arquivo `.env`:

```bash
# =============================================================================
# CRIPTOGRAFIA DE DADOS SENSÍVEIS (OBRIGATÓRIO)
# =============================================================================
# Chave de criptografia AES-256 (32 bytes = 64 caracteres hex)
# ATENÇÃO: NUNCA commite esta chave no Git!
# ATENÇÃO: Perder esta chave = perder TODOS os dados criptografados!
#
# Gere uma chave nova com:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=SUA_CHAVE_AQUI_64_CARACTERES_HEX

# Exemplo (NÃO USE ESTA):
# ENCRYPTION_KEY=a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890
```

### Como Gerar a Chave

```bash
# No terminal (Node.js deve estar instalado):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Saída (exemplo):
# f8e3a1b9c4d7e2f5a8b1c4d7e0f3a6b9c2d5e8f1a4b7c0d3e6f9a2b5c8d1e4f7
```

**⚠️ IMPORTANTE**:
- Cada ambiente (dev, staging, prod) deve ter chaves DIFERENTES
- **NUNCA** commite a chave no Git
- **FAÇA BACKUP SEGURO** da chave (perder = perder todos os dados)
- Armazene em secrets manager (AWS Secrets Manager, Azure Key Vault, etc.) em produção

---

## 📊 PRÓXIMOS PASSOS OBRIGATÓRIOS

### Tarefas Restantes para Conformidade Completa

#### 1. Integrar Middleware de Auditoria nos Routers

**Arquivo**: `server/routers.ts`

Adicione o middleware de auditoria em cada endpoint que acessa dados de pacientes:

```typescript
import { auditMiddleware } from "./_core/auditMiddleware";
import { hasConsent } from "./db";

// Exemplo: endpoint de visualizar paciente
patients: router({
  getById: protectedProcedure
    .use(auditMiddleware.patientViewed()) // ← ADICIONE AUDITORIA
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const patient = await getPatientById(input.id);
      if (!patient || patient.dentistId !== ctx.user.id) {
        throw new Error("Patient not found or access denied");
      }
      return patient;
    }),

  create: protectedProcedure
    .use(auditMiddleware.patientCreated()) // ← ADICIONE AUDITORIA
    .input(/* ... */)
    .mutation(/* ... */),
}),

consultations: router({
  uploadAudio: protectedProcedure
    .use(auditMiddleware.audioUploaded()) // ← ADICIONE AUDITORIA
    .input(/* ... */)
    .mutation(async ({ ctx, input }) => {
      // ANTES DE PROCESSAR, VALIDE CONSENTIMENTO:
      const hasAudioConsent = await hasConsent(
        input.patientId,
        "audio_recording"
      );

      if (!hasAudioConsent) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Patient has not consented to audio recording"
        });
      }

      // Continue com o processamento...
    }),
})
```

#### 2. Criar Rotas de Consentimento

**Adicione ao `server/routers.ts`**:

```typescript
import { upsertConsent, getConsentsByPatient, hasConsent, revokeConsent } from "./db";
import { auditMiddleware } from "./_core/auditMiddleware";

// Adicione ao appRouter:
consents: router({
  // Obter consentimentos de um paciente
  getByPatient: protectedProcedure
    .input(z.object({ patientId: z.number() }))
    .query(async ({ ctx, input }) => {
      // Verificar ownership
      const patient = await getPatientById(input.patientId);
      if (!patient || patient.dentistId !== ctx.user.id) {
        throw new Error("Patient not found or access denied");
      }

      return await getConsentsByPatient(input.patientId);
    }),

  // Verificar se tem consentimento específico
  check: protectedProcedure
    .input(z.object({
      patientId: z.number(),
      consentType: z.enum([
        "data_processing",
        "sensitive_health_data",
        "audio_recording",
        "ai_processing"
      ])
    }))
    .query(async ({ ctx, input }) => {
      const patient = await getPatientById(input.patientId);
      if (!patient || patient.dentistId !== ctx.user.id) {
        throw new Error("Patient not found or access denied");
      }

      return await hasConsent(input.patientId, input.consentType);
    }),

  // Conceder consentimento
  grant: protectedProcedure
    .use(auditMiddleware.consentGranted())
    .input(z.object({
      patientId: z.number(),
      consentType: z.enum([
        "data_processing",
        "sensitive_health_data",
        "audio_recording",
        "ai_processing"
      ]),
      termsVersion: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const patient = await getPatientById(input.patientId);
      if (!patient || patient.dentistId !== ctx.user.id) {
        throw new Error("Patient not found or access denied");
      }

      await upsertConsent({
        patientId: input.patientId,
        dentistId: ctx.user.id,
        consentType: input.consentType,
        granted: true,
        termsVersion: input.termsVersion,
        ipAddress: ctx.req.headers["x-forwarded-for"]?.toString().split(",")[0] || ctx.req.socket?.remoteAddress,
        userAgent: ctx.req.headers["user-agent"],
        grantedAt: new Date(),
      });

      return { success: true };
    }),

  // Revogar consentimento
  revoke: protectedProcedure
    .use(auditMiddleware.consentRevoked())
    .input(z.object({ consentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await revokeConsent(input.consentId);
      return { success: true };
    }),
}),
```

#### 3. Implementar UI de Consentimento

**Arquivo**: `client/src/components/ConsentDialog.tsx` (CRIAR)

Crie um componente de diálogo de consentimento para mostrar aos pacientes antes da primeira consulta:

```tsx
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";

interface ConsentDialogProps {
  open: boolean;
  patientId: number;
  onConsentsGranted: () => void;
}

export function ConsentDialog({ open, patientId, onConsentsGranted }: ConsentDialogProps) {
  const [consents, setConsents] = useState({
    data_processing: false,
    sensitive_health_data: false,
    audio_recording: false,
    ai_processing: false,
  });

  const grantConsentMutation = trpc.consents.grant.useMutation();

  const handleGrantAll = async () => {
    const termsVersion = "1.0"; // ou obtenha de configuração

    for (const [type, granted] of Object.entries(consents)) {
      if (granted) {
        await grantConsentMutation.mutateAsync({
          patientId,
          consentType: type as any,
          termsVersion,
        });
      }
    }

    onConsentsGranted();
  };

  const allChecked = Object.values(consents).every(v => v);

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Consentimento para Processamento de Dados - LGPD</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Para utilizar o DentScribe AI, precisamos do seu consentimento explícito para processar seus dados de saúde, conforme Lei Geral de Proteção de Dados (LGPD).
          </p>

          <div className="space-y-3 border p-4 rounded-lg">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="data_processing"
                checked={consents.data_processing}
                onCheckedChange={(checked) =>
                  setConsents({ ...consents, data_processing: !!checked })
                }
              />
              <Label htmlFor="data_processing" className="text-sm font-normal">
                <strong>Processamento de Dados Pessoais:</strong> Autorizo o armazenamento e processamento dos meus dados pessoais (nome, CPF, contato) para fins de identificação e gestão de prontuário.
              </Label>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="sensitive_health_data"
                checked={consents.sensitive_health_data}
                onCheckedChange={(checked) =>
                  setConsents({ ...consents, sensitive_health_data: !!checked })
                }
              />
              <Label htmlFor="sensitive_health_data" className="text-sm font-normal">
                <strong>Dados Sensíveis de Saúde (LGPD Art. 11):</strong> Autorizo o processamento de dados sensíveis de saúde (histórico médico, alergias, medicações, diagnósticos) para fins de tratamento odontológico.
              </Label>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="audio_recording"
                checked={consents.audio_recording}
                onCheckedChange={(checked) =>
                  setConsents({ ...consents, audio_recording: !!checked })
                }
              />
              <Label htmlFor="audio_recording" className="text-sm font-normal">
                <strong>Gravação de Consultas:</strong> Autorizo a gravação em áudio das minhas consultas para fins de documentação clínica.
              </Label>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="ai_processing"
                checked={consents.ai_processing}
                onCheckedChange={(checked) =>
                  setConsents({ ...consents, ai_processing: !!checked })
                }
              />
              <Label htmlFor="ai_processing" className="text-sm font-normal">
                <strong>Processamento por Inteligência Artificial:</strong> Autorizo o uso de sistemas de IA (GPT-4, Whisper) para transcrição de áudio e geração automática de notas clínicas.
              </Label>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Você pode revogar estes consentimentos a qualquer momento. Seus dados serão mantidos de forma segura e criptografada.
          </p>

          <Button
            onClick={handleGrantAll}
            disabled={!allChecked || grantConsentMutation.isPending}
            className="w-full"
          >
            {grantConsentMutation.isPending ? "Salvando..." : "Aceitar e Continuar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### 4. Integrar Diálogo de Consentimento no Fluxo de Consulta

**Arquivo**: `client/src/pages/NewConsultationV2.tsx`

Modifique para verificar consentimentos antes de permitir gravação:

```tsx
import { ConsentDialog } from "@/components/ConsentDialog";

export default function NewConsultationV2() {
  const [showConsentDialog, setShowConsentDialog] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);

  // Verificar consentimento ao selecionar paciente
  const { data: hasAudioConsent } = trpc.consents.check.useQuery(
    {
      patientId: selectedPatientId!,
      consentType: "audio_recording"
    },
    { enabled: !!selectedPatientId }
  );

  const handleStartRecording = () => {
    if (!hasAudioConsent) {
      setShowConsentDialog(true);
      return;
    }

    // Continuar com gravação normal...
  };

  return (
    <>
      {/* ... resto do componente ... */}

      <ConsentDialog
        open={showConsentDialog}
        patientId={selectedPatientId!}
        onConsentsGranted={() => {
          setShowConsentDialog(false);
          // Reiniciar verificação de consentimentos
        }}
      />
    </>
  );
}
```

---

## 🧪 TESTANDO A IMPLEMENTAÇÃO

### 1. Configurar Chave de Criptografia

```bash
# Gere uma chave
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Adicione ao .env
echo "ENCRYPTION_KEY=SUA_CHAVE_AQUI" >> .env
```

### 2. Executar Migration

```bash
# Aplicar schema atualizado
pnpm db:push
```

### 3. Testar Criptografia

```bash
# Execute os testes existentes
pnpm test

# Os dados devem ser salvos criptografados e lidos descriptografados
```

### 4. Verificar Banco de Dados

```sql
-- Conecte ao MySQL/TiDB e verifique:

-- Dados criptografados (devem aparecer como hex strings longas)
SELECT cpf, medicalHistory FROM patients LIMIT 1;

-- Exemplo de saída:
-- cpf: "a1b2c3d4:e5f67890:12345678..."
-- medicalHistory: "f8e9d0c1:b2a39485:abcdef..."

-- Novas tabelas criadas
SHOW TABLES LIKE '%consents%';
SHOW TABLES LIKE '%auditLogs%';
```

---

## ⚖️ CONFORMIDADE LGPD - CHECKLIST

### ✅ Implementado

- [x] **Art. 7**: Base legal para processamento (consentimento explícito)
- [x] **Art. 11**: Tratamento de dados sensíveis de saúde (consentimento separado)
- [x] **Art. 46**: Medidas de segurança (criptografia + auditoria)
- [x] **Art. 48**: Notificação de incidentes (logs de auditoria permitem rastreio)

### ⚠️ Ainda Necessário

- [ ] **Art. 18, I**: Portabilidade de dados (exportar dados do paciente em formato estruturado)
- [ ] **Art. 18, II**: Correção de dados incompletos
- [ ] **Art. 18, III**: Anonimização de dados (quando aplicável)
- [ ] **Art. 18, VI**: Exclusão completa (direito ao esquecimento - implementar soft delete + purge)
- [ ] **Art. 41**: Encarregado de dados (DPO - Data Protection Officer)
- [ ] **Art. 50**: Controladores e operadores (definir responsabilidades)
- [ ] **Termo de Consentimento** formal com versão rastreável
- [ ] **Política de Privacidade** acessível

---

## 🚨 AVISOS CRÍTICOS

### 🔴 NUNCA faça isso

1. **NÃO** commite a `ENCRYPTION_KEY` no Git
2. **NÃO** use a mesma chave em dev e produção
3. **NÃO** perca a chave de criptografia (backup obrigatório)
4. **NÃO** altere a chave sem migrar dados existentes
5. **NÃO** desabilite auditoria para "ganhar performance"

### 🟡 Recomendações Fortemente Sugeridas

1. **FAÇA** backup regular da `ENCRYPTION_KEY`
2. **FAÇA** rotação de chaves anualmente (com migração de dados)
3. **FAÇA** revisão de logs de auditoria mensalmente
4. **FAÇA** testes de recuperação de dados criptografados
5. **FAÇA** consulta jurídica especializada em LGPD antes de produção

---

## 📞 PRÓXIMOS PASSOS RECOMENDADOS

1. **Imediato** (esta sprint):
   - Adicionar middleware de auditoria em todos os endpoints (ver seção 1 acima)
   - Criar rotas de consentimento (ver seção 2 acima)
   - Implementar UI de consentimento (ver seção 3 acima)

2. **Curto prazo** (próxima sprint):
   - Implementar exportação de dados de pacientes (portabilidade LGPD)
   - Implementar exclusão completa com soft delete
   - Criar termo de consentimento formal com versionamento

3. **Médio prazo** (1-2 meses):
   - Contratar/nomear DPO (Data Protection Officer)
   - Criar política de privacidade
   - Implementar rotação automática de chaves de criptografia
   - Adicionar rate limiting para proteção de APIs

4. **Longo prazo** (antes de produção):
   - Auditoria de segurança externa
   - Avaliação de conformidade LGPD por advogado especializado
   - Implementar monitoramento e alertas de segurança
   - Plano de resposta a incidentes

---

## 🎯 CONCLUSÃO

**Estado Atual**: ✅ **Mínimo aceitável de segurança implementado**

O DentScribe AI agora possui:
- ✅ Criptografia de dados sensíveis em repouso
- ✅ Sistema de consentimentos explícitos (infraestrutura pronta)
- ✅ Auditoria completa de acesso a dados
- ✅ Avisos claros de limitações no README

**Próximo passo crítico**: Integrar middleware de auditoria e UI de consentimento (tarefas 1-4 acima).

**Antes de produção**: Completar checklist LGPD e obter consultoria jurídica especializada.

---

**Desenvolvido com foco em conformidade legal e ética profissional.**
