# 🦷 DentScribe AI

**Assistente de IA para Consultas Odontológicas**

DentScribe AI é uma aplicação web completa que revoluciona a documentação de consultas odontológicas através de inteligência artificial. O sistema permite que dentistas gravem consultas, obtenham transcrições automáticas em português e gerem notas clínicas estruturadas no formato SOAP adaptado para odontologia.

---

## ✨ Funcionalidades Principais

### 📝 Múltiplas Formas de Entrada
- **Gravação ao Vivo**: Interface elegante com visualização de forma de onda em tempo real
- **Upload de Áudio**: Suporte para arquivos MP3, WAV, M4A e WebM
- **Entrada de Texto**: Digite diretamente a transcrição da consulta

### 🎙️ Transcrição Inteligente
- Transcrição automática usando **Whisper API** da OpenAI
- Detecção automática de falantes (Dentista e Paciente)
- Visualização em estilo chat com blocos de fala distintos
- Timestamps clicáveis sincronizados com áudio
- Player de áudio integrado para revisão

### 🤖 Análise com IA Especializada
- Geração automática de notas SOAP usando **GPT-4**
- Prompt especializado em terminologia odontológica brasileira
- Identificação de sinais de alerta (red flags)
- Classificação de urgência dos tratamentos
- Sugestões de procedimentos baseadas em evidências

### 📋 Gestão Completa
- **Pacientes**: Cadastro completo com histórico médico, alergias e dados pessoais
- **Consultas**: Histórico completo de todas as consultas por paciente
- **Edição de Notas**: Revisão e edição manual de todas as seções SOAP
- **Exportação PDF**: Documentos profissionais formatados para prontuários

### 🔒 Segurança e Privacidade
- Autenticação OAuth integrada
- Controle de acesso por usuário
- Comunicação via HTTPS (dados criptografados em trânsito)

---

## 🏗️ Arquitetura Técnica

### Stack Tecnológico

**Frontend**
- React 19 com TypeScript
- Tailwind CSS 4 para estilização
- Wouter para roteamento
- shadcn/ui para componentes
- tRPC React Query para comunicação com backend

**Backend**
- Node.js 22 com Express 4
- tRPC 11 para APIs type-safe
- Drizzle ORM para banco de dados
- MySQL/TiDB para persistência

**Integrações de IA**
- OpenAI Whisper API para transcrição de áudio
- OpenAI GPT-4 para análise clínica e geração de notas SOAP
- Prompts especializados em odontologia

**Infraestrutura**
- S3 para armazenamento de arquivos de áudio
- PDFKit para geração de documentos
- Vitest para testes automatizados

### Estrutura do Projeto

```
dentscribe_ai/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── lib/           # Utilitários e configurações
│   │   └── contexts/      # Contextos React
│   └── public/            # Arquivos estáticos
├── server/                # Backend Node.js
│   ├── routers.ts         # Definição de rotas tRPC
│   ├── db.ts              # Helpers de banco de dados
│   ├── pdfGenerator.ts    # Geração de PDFs
│   └── _core/             # Infraestrutura (OAuth, LLM, etc)
├── drizzle/               # Schemas e migrações do banco
│   └── schema.ts          # Definição de tabelas
└── shared/                # Código compartilhado
```

---

## 🚀 Instalação e Configuração

### Pré-requisitos

- Node.js 22+
- pnpm 10+
- Banco de dados MySQL ou TiDB
- Conta OpenAI com acesso às APIs Whisper e GPT-4
- Bucket S3 para armazenamento de áudio

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```bash
# Banco de Dados
DATABASE_URL=mysql://user:password@host:port/database

# Autenticação
JWT_SECRET=seu-secret-jwt-aqui
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://login.manus.im

# APIs de IA (Manus Built-in)
BUILT_IN_FORGE_API_URL=https://forge-api.manus.im
BUILT_IN_FORGE_API_KEY=sua-chave-api-aqui
VITE_FRONTEND_FORGE_API_KEY=sua-chave-frontend-aqui
VITE_FRONTEND_FORGE_API_URL=https://forge-api.manus.im

# Aplicação
VITE_APP_ID=seu-app-id
VITE_APP_TITLE=DentScribe AI
VITE_APP_LOGO=/logo.png
OWNER_OPEN_ID=seu-open-id
OWNER_NAME=Seu Nome

# =============================================================================
# CRIPTOGRAFIA DE DADOS SENSÍVEIS (OBRIGATÓRIO PARA SEGURANÇA)
# =============================================================================
# Chave de criptografia AES-256 (32 bytes = 64 caracteres hexadecimais)
# CRÍTICO: Nunca commite esta chave no Git!
# CRÍTICO: Perder esta chave = perder TODOS os dados criptografados!
#
# Gere uma chave única com:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=sua-chave-de-64-caracteres-hex-aqui
```

**⚠️ IMPORTANTE - ENCRYPTION_KEY**:
- Esta chave é **OBRIGATÓRIA** para criptografar dados sensíveis de pacientes
- Cada ambiente (dev, staging, produção) deve ter chaves diferentes
- **Faça backup seguro** da chave (perder = perder dados)
- **Nunca** compartilhe ou commite no Git
- Em produção, use secrets manager (AWS Secrets Manager, Azure Key Vault, etc.)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/Thiago-Zn/AI-dentista-.git
cd AI-dentista-

# Instale as dependências
pnpm install

# Configure o banco de dados
pnpm db:push

# Inicie o servidor de desenvolvimento
pnpm dev
```

O aplicativo estará disponível em `http://localhost:3000`

### Build para Produção

```bash
# Gere o build otimizado
pnpm build

# Inicie o servidor de produção
pnpm start
```

---

## 📖 Como Usar

### 1. Criar Nova Consulta

1. Acesse o dashboard e clique em **"Iniciar Gravação"**
2. Selecione o paciente (ou crie um novo)
3. Escolha o método de entrada:
   - **Gravação ao Vivo**: Clique no botão de gravar e fale naturalmente
   - **Upload de Áudio**: Arraste um arquivo de áudio existente
   - **Texto**: Digite ou cole a transcrição manualmente

### 2. Revisar Transcrição

1. Após a transcrição, você será redirecionado para a página de revisão
2. Visualize a transcrição em formato de chat com falas separadas
3. Clique nos timestamps para ouvir momentos específicos do áudio
4. Edite qualquer erro de transcrição no modo de edição
5. Clique em **"Confirmar e Analisar com IA"** quando estiver satisfeito

### 3. Revisar e Editar Nota SOAP

1. A IA gerará automaticamente a nota clínica estruturada
2. Revise todas as seções:
   - **Subjetivo**: Queixa principal, história da doença atual, histórico médico
   - **Objetivo**: Exames clínicos, dentes afetados
   - **Avaliação**: Diagnósticos, sinais de alerta
   - **Plano**: Tratamentos propostos, orientações, lembretes clínicos
3. Clique em **"Editar"** para fazer ajustes manuais
4. Salve as alterações

### 4. Exportar PDF

1. Na página de detalhes da consulta, clique em **"Exportar PDF"**
2. O documento será gerado com formatação profissional
3. Inclui dados do dentista, paciente e nota SOAP completa
4. Pronto para impressão ou envio digital

---

## 🧪 Testes

O projeto inclui testes automatizados abrangentes:

```bash
# Execute todos os testes
pnpm test

# Verificação de tipos TypeScript
pnpm check
```

**Cobertura de Testes:**
- ✅ Autenticação e logout
- ✅ Gestão de pacientes (criar, listar, buscar)
- ✅ Gestão de consultas (criar, listar, atualizar)
- ✅ Edição de notas SOAP
- ✅ Exportação de PDF
- ✅ Fluxo completo de consulta

---

## 🎨 Design e UX

O DentScribe AI foi projetado com foco em usabilidade e eficiência para profissionais de saúde:

- **Interface Limpa**: Design minimalista que não distrai do conteúdo clínico
- **Feedback Visual**: Animações suaves e indicadores de progresso claros
- **Cores Profissionais**: Paleta azul e verde que transmite confiança
- **Responsivo**: Funciona perfeitamente em desktop, tablet e mobile
- **Acessibilidade**: Contraste adequado e navegação por teclado

---

## ⚠️ **AVISO IMPORTANTE - LIMITAÇÕES DO MVP**

**🔴 ESTE SISTEMA É UM MVP (MINIMUM VIABLE PRODUCT) E NÃO DEVE SER USADO COM DADOS REAIS DE PACIENTES EM AMBIENTE DE PRODUÇÃO.**

### Limitações Atuais de Segurança e LGPD

❌ **Dados sensíveis NÃO estão criptografados em repouso** (CPF, histórico médico, alergias, transcrições de consultas)
❌ **Não há coleta de consentimento explícito** dos pacientes para processamento de dados de saúde
❌ **Não há auditoria de acesso** a dados de pacientes
❌ **Não há mecanismos de portabilidade** (exportar dados do paciente)
❌ **Não há mecanismos completos de exclusão** (direito ao esquecimento - LGPD Art. 18)

### Uso Recomendado

✅ **Demonstrações** com dados fictícios
✅ **Desenvolvimento e testes** em ambiente controlado
✅ **Avaliação de viabilidade** técnica e clínica

❌ **NÃO usar** com dados reais de pacientes sem implementar todas as proteções legais obrigatórias
❌ **NÃO usar** em ambientes de produção sem consultoria jurídica especializada em LGPD

---

## 🔐 Segurança

### Medidas Implementadas

- **Autenticação OAuth**: Login seguro via Manus
- **Autorização por Usuário**: Cada dentista acessa apenas seus próprios dados
- **HTTPS Obrigatório**: Todas as comunicações criptografadas em trânsito
- **Validação de Entrada**: Proteção contra injeção de SQL e XSS
- **Armazenamento Seguro**: Arquivos de áudio em S3 com URLs não enumeráveis

### Próximas Implementações de Segurança (Roadmap)

- [ ] Criptografia de dados sensíveis em repouso (AES-256-GCM)
- [ ] Sistema de consentimento explícito para LGPD
- [ ] Auditoria completa de acesso a dados de pacientes
- [ ] Mecanismos de portabilidade de dados
- [ ] Mecanismos de exclusão completa (direito ao esquecimento)
- [ ] Rate limiting para proteção de APIs de IA
- [ ] Validação completa de schemas (substituir `z.any()` por Zod schemas reais)

---

## 🛣️ Roadmap

### Próximas Funcionalidades

- [ ] Dashboard com estatísticas e métricas de produtividade
- [ ] Configurações do dentista (CRO, assinatura digital, logo)
- [ ] Templates personalizados por especialidade odontológica
- [ ] Controles de velocidade no player de áudio
- [ ] Atalhos de teclado para navegação rápida
- [ ] Exportação em múltiplos formatos (DOCX, TXT)
- [ ] Integração com sistemas de gestão odontológica
- [ ] Análise de imagens radiográficas com IA
- [ ] Suporte a múltiplos idiomas

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

### Diretrizes

- Mantenha o código limpo e bem documentado
- Adicione testes para novas funcionalidades
- Siga os padrões de código existentes (TypeScript, ESLint)
- Atualize a documentação quando necessário

---

## 📄 Licença

Este projeto é licenciado sob a licença MIT - veja o arquivo LICENSE para detalhes.

---

## 👨‍💻 Autor

**Thiago Zanatta**

- GitHub: [@Thiago-Zn](https://github.com/Thiago-Zn)
- Email: thiagozanatta02@gmail.com

---

## 🙏 Agradecimentos

- **OpenAI** pelas APIs Whisper e GPT-4
- **Manus** pela plataforma de desenvolvimento e infraestrutura
- **Comunidade Open Source** pelas bibliotecas e ferramentas utilizadas

---

## 📞 Suporte

Para questões, sugestões ou reportar bugs:

- Abra uma [issue no GitHub](https://github.com/Thiago-Zn/AI-dentista-/issues)
- Entre em contato via email: thiagozanatta02@gmail.com

---

**Desenvolvido com ❤️ para dentistas que valorizam tecnologia e eficiência**
