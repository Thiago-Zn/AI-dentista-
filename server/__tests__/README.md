# DentScribe Backend Tests

Este diretório contém testes para o backend do DentScribe AI, focando em fluxos críticos e cenários de falha.

## 🎯 Objetivos dos Testes

1. **Validar fluxos críticos**: Criação de consultas, transcrição, geração de SOAP, export PDF
2. **Garantir robustez**: Sistema falha de forma controlada e previsível
3. **Prevenir corrupção de dados**: Estado do banco nunca fica inconsistente após falhas
4. **Testar tratamento de erros**: Todas as chamadas a serviços externos possuem error handling adequado

## 📁 Estrutura de Testes

### `criticalFlow.test.ts`
Testes de integração para o fluxo principal da aplicação:
- ✅ Criação de consultas
- ✅ Transcrição de áudio (mockando Whisper API)
- ✅ Geração de SOAP note (mockando GPT-4)
- ✅ Geração de PDF
- ✅ Fluxo end-to-end completo (happy path)

### `errorScenarios.test.ts`
Testes de cenários de falha e error handling:
- ⚠️ Falha de conexão com banco de dados
- ⚠️ Timeout/erro do Whisper API
- ⚠️ Resposta inválida do LLM (JSON corrompido)
- ⚠️ Falha na geração de PDF
- ⚠️ Falha no upload/download de storage
- ⚠️ Consistência de dados após falhas

## 🚀 Comandos de Teste

### Rodar todos os testes
```bash
pnpm test
```

### Rodar testes com coverage
```bash
pnpm test:coverage
```

### Rodar testes em modo watch (desenvolvimento)
```bash
pnpm test:watch
```

### Rodar apenas testes de fluxo crítico
```bash
pnpm test server/__tests__/criticalFlow.test.ts
```

### Rodar apenas testes de erro
```bash
pnpm test server/__tests__/errorScenarios.test.ts
```

### Rodar testes com output detalhado
```bash
pnpm test --reporter=verbose
```

## 📊 Output Esperado

### ✅ Testes de Sucesso (Happy Path)

```
✓ Critical Flow Tests (8)
  ✓ Consultation Creation Flow (2)
    ✓ should create consultation with valid data
    ✓ should throw error if database is unavailable
  ✓ Transcription Flow (3)
    ✓ should successfully transcribe audio
    ✓ should handle transcription failure gracefully
    ✓ should not update consultation if transcription fails
  ✓ SOAP Note Generation Flow (3)
    ✓ should generate SOAP note from transcript
    ✓ should handle LLM failure gracefully
    ✓ should handle invalid JSON response from LLM
  ✓ PDF Generation Flow (2)
    ✓ should generate PDF from SOAP note
    ✓ should handle PDF generation failure
  ✓ End-to-End Happy Path (1)
    ✓ should complete full consultation workflow

Test Files  1 passed (1)
     Tests  11 passed (11)
```

### ⚠️ Testes de Erro (Failure Scenarios)

```
✓ Error Scenarios (10)
  ✓ Database Failure Scenarios (4)
    ✓ should throw error when DATABASE_URL is missing
    ✓ should throw error when database connection fails
    ✓ should fail fast on subsequent calls after initialization failure
    ✓ should not allow operations when database is unavailable
  ✓ ServiceError Class (3)
    ✓ should create ServiceError with all properties
    ✓ should convert ServiceError to JSON
    ✓ should log error with context
  ✓ Transcription Failure Scenarios (3)
    ✓ should return error structure when Whisper API fails
    ✓ should not corrupt database when transcription fails mid-flight
    ✓ should provide actionable error message on transcription failure
  ✓ LLM Failure Scenarios (5)
    ✓ should handle LLM timeout
    ✓ should handle invalid JSON response from LLM
    ✓ should handle empty response from LLM
    ✓ should not save invalid SOAP note to database
    ✓ should handle LLM rate limit errors
  ✓ PDF Generation Failure Scenarios (2)
    ✓ should handle PDF generation failure
    ✓ should not generate PDF if SOAP note is missing
  ✓ Storage Failure Scenarios (2)
    ✓ should handle storage upload failure
    ✓ should handle storage download failure
  ✓ Error Code Completeness (2)
    ✓ should have error codes for all external services
    ✓ should provide user-friendly messages in Portuguese
  ✓ Data Consistency on Failures (3)
    ✓ should not leave consultation in inconsistent state on error
    ✓ should not mark consultation as transcribed if Whisper fails
    ✓ should not save SOAP note if LLM returns invalid data

Test Files  1 passed (1)
     Tests  24 passed (24)
```

## 🔧 Mocking Strategy

Os testes utilizam **mocks completos** para todos os serviços externos:

- **Database (`db.ts`)**: Mockado para evitar conexões reais
- **Whisper API (`voiceTranscription.ts`)**: Retorna transcrições mockadas
- **GPT-4 LLM (`llm.ts`)**: Retorna SOAP notes mockadas
- **Storage (`storage.ts`)**: Upload/download simulados
- **PDF Generator (`pdfGenerator.ts`)**: Retorna buffers mockados

**Importante**: Nenhum teste chama APIs reais ou acessa banco de dados real.

## 🎭 Cenários Cobertos

### Fluxos de Sucesso
1. ✅ Criação de consulta
2. ✅ Upload de áudio via multipart
3. ✅ Transcrição com segmentos e timestamps
4. ✅ Análise e geração de SOAP note estruturada
5. ✅ Export de PDF com dados completos

### Cenários de Falha
1. ⚠️ **DB unavailable**: Servidor não sobe se DATABASE_URL inválida
2. ⚠️ **Whisper timeout**: Retorna erro estruturado, não corrompe banco
3. ⚠️ **LLM retorna JSON inválido**: Detecta e rejeita antes de salvar
4. ⚠️ **PDF generation crash**: Erro controlado, não afeta consulta
5. ⚠️ **Storage upload falha**: Multipart upload interrompido com erro claro

## 📌 Observações Importantes

### Database Fail-Fast Behavior
Após as mudanças em `server/db.ts`, o comportamento é:
- ✅ Se `DATABASE_URL` está faltando → **processo encerra imediatamente**
- ✅ Se conexão falha → **processo encerra em produção** (via `process.exit(1)`)
- ✅ Chamadas subsequentes após falha → **throw imediato** (sem retry infinito)
- ✅ Funções do DB não retornam `undefined` silenciosamente → **throw explícito**

### Error Handling in Routers
As rotas críticas (`transcribe`, `analyzeAndGenerateSOAP`, `exportPDF`) agora:
- ✅ Envolvem chamadas externas em `try/catch`
- ✅ Usam `ServiceError` com códigos estruturados (`TRANSCRIPTION_FAILED`, `LLM_RESPONSE_INVALID`, etc.)
- ✅ Retornam mensagens amigáveis em português
- ✅ Incluem metadata útil para debugging (consultationId, timeouts, etc.)
- ✅ Não atualizam o banco se operação externa falhar

### Garantias de Consistência
- 🔒 **Transcrição falha → transcript permanece `null`**
- 🔒 **LLM retorna JSON inválido → soapNote não é salva**
- 🔒 **Upload S3 falha → audioUrl não é gravada no banco**
- 🔒 **Rate limit excedido → operação rejeitada antes de chamar API**

## 🔍 Coverage Esperado

Áreas críticas cobertas:
- ✅ `server/db.ts`: Comportamento de falha de conexão
- ✅ `server/routers.ts`: Error handling em `transcribe`, `analyzeAndGenerateSOAP`, `exportPDF`
- ✅ `server/_core/errors.ts`: Classe `ServiceError` e códigos de erro
- ✅ Fluxo end-to-end completo (criação → transcrição → SOAP → PDF)

Áreas **não** cobertas (intencionalmente):
- ❌ Integrações reais com APIs externas (Whisper, GPT-4, Manus Storage)
- ❌ Testes de autenticação OAuth (fora do escopo crítico)
- ❌ UI/Frontend (testes de integração backend apenas)

## 🐛 Debugging Tests

Se um teste falhar:

1. Rode com output detalhado:
```bash
pnpm test --reporter=verbose --no-coverage
```

2. Rode apenas o teste que falhou:
```bash
pnpm test -t "nome do teste"
```

3. Verifique os mocks:
```typescript
vi.clearAllMocks(); // Limpa mocks entre testes
vi.restoreAllMocks(); // Restaura implementações originais
```

4. Inspecione console.error:
```typescript
const spy = vi.spyOn(console, 'error');
// ... run test ...
expect(spy).toHaveBeenCalledWith(expect.stringContaining('erro'));
spy.mockRestore();
```

## 📚 Recursos

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [tRPC Testing Guide](https://trpc.io/docs/server/testing)
