# 📊 Estado Atual do Projeto - Assistente de IA Local

**Data de Geração:** 2024
**Versão do Projeto:** 1.0.0 (Estável)
**Status:** ✅ Completo e Funcional

---

## 1. Visão Geral Executiva

Este projeto consiste em uma aplicação web full-stack minimalista, desenvolvida em **Python (FastAPI)** para o backend e **HTML/CSS/JS Vanilla** para o frontend. O objetivo principal é fornecer uma interface amigável e responsiva para interação com Modelos de Linguagem (LLMs) rodando localmente via **LM Studio**, eliminando a necessidade de chaves de API externas ou dependência de nuvem.

A arquitetura segue o padrão **Cliente-Servidor** com comunicação assíncrona, garantindo baixa latência e privacidade total dos dados, uma vez que todo o processamento de inferência ocorre na máquina do usuário.

### Destaques da Arquitetura
- **Backend:** Assíncrono (AsyncIO), tipado estaticamente com Pydantic, servindo tanto API REST quanto arquivos estáticos.
- **Frontend:** Single Page Application (SPA) leve, sem frameworks pesados (React/Vue), focada em performance e acessibilidade.
- **Integração:** Compatível com o padrão OpenAI API (`/v1/chat/completions`), permitindo troca fácil de backends de LLM.
- **UI/UX:** Design moderno com Sidemenu de navegação, tema escuro/claro via variáveis CSS, e feedback visual imediato.

---

## 2. Estrutura de Diretórios e Arquivos

A estrutura do projeto é flat e organizada dentro do diretório `app/`, facilitando a portabilidade e o deploy.

```text
app/
├── main.py              # Ponto de entrada da aplicação FastAPI
├── config.json          # Armazenamento persistente de configurações (JSON)
├── requirements.txt     # Dependências Python
├── README.md            # Documentação de uso e instalação
├── stats.md             # Este arquivo: Estado detalhado do projeto
└── static/              # Raiz dos arquivos estáticos servidos pelo frontend
    ├── index.html       # Estrutura semântica da interface (Sidemenu + Painéis)
    ├── style.css        # Folha de estilos (Variáveis, Layout Flex/Grid, Responsividade)
    └── app.js           # Lógica de negócio do cliente (Fetch API, Gerenciamento de Estado)
```

### Detalhamento dos Arquivos Principais

#### `main.py` (Backend)
- **Framework:** FastAPI
- **Porta Padrão:** 7777
- **Host:** 127.0.0.1 (Localhost apenas)
- **Funcionalidades Chave:**
  - Inicialização automática de `config.json` se ausente.
  - Servidor de arquivos estáticos (`StaticFiles`) para o frontend.
  - **Endpoints de Configuração:**
    - `GET /api/config`: Retorna o estado atual das configurações.
    - `POST /api/config`: Valida e salva novas configurações atomicamente.
  - **Endpoint de Chat:**
    - `POST /api/chat`: Proxy assíncrono para o LM Studio.
    - Implementa tratamento robusto de erros (Timeout, Connection Error, JSON Decode Error).
    - Logs detalhados de requisição/resposta no console do servidor.
  - **Segurança:** Não expõe a API Key nos logs; valida tipos de dados de entrada.

#### `static/index.html` (Frontend Estrutural)
- **Layout:** Baseado em Flexbox com container principal `.app-container`.
- **Navegação:** Sidemenu fixa à esquerda (`.sidemenu`) com links para "Chat" e "Configurações".
- **Áreas de Conteúdo:**
  - `#chat-panel`: Container de mensagens rolável, área de input e indicador de status.
  - `#config-panel`: Formulário completo para ajuste de parâmetros da LLM.
- **Acessibilidade:** Uso correto de tags semânticas (`aside`, `main`, `nav`, `button`, `label`).

#### `static/style.css` (Estilização)
- **Design System:** Baseado em variáveis CSS (`--bg`, `--card`, `--primary`, `--text`, `--border`).
- **Responsividade:**
  - Desktop: Sidemenu lateral fixa (260px).
  - Mobile (<768px): Sidemenu converte-se para menu horizontal no topo.
- **Componentes:**
  - Balões de chat distintos para usuário (direita) e assistente (esquerda).
  - Inputs estilizados com foco visível.
  - Animações suaves para transição de abas e hover.
  - Indicador de "Processando..." com animação de pulso.

#### `static/app.js` (Lógica Cliente)
- **Padrão:** IIFE (Immediately Invoked Function Expression) para evitar poluição do escopo global.
- **Gerenciamento de Estado:**
  - `sessionHistory`: Array em memória mantendo o contexto da conversa (formato OpenAI).
  - Estado da UI (aba ativa, status de loading).
- **Comunicação:**
  - Uso nativo de `fetch` API com `async/await`.
  - Validação de URL e campos obrigatórios antes do envio.
  - Tratamento de erros de rede com feedback visual ao usuário.
- **Fluxo de Chat:**
  1. Usuário envia mensagem -> Adiciona ao histórico visual e lógico.
  2. Bloqueia input e mostra loader.
  3. Envia POST para `/api/chat`.
  4. Recebe resposta -> Renderiza mensagem -> Desbloqueia input.

#### `config.json` (Persistência)
Arquivo gerado automaticamente. Estrutura atual:
```json
{
  "base_url": "http://localhost:1234/v1",
  "model": "",
  "api_key": "",
  "temperature": 0.7,
  "max_tokens": 1024
}
```

---

## 3. Stack Tecnológico Detalhado

| Componente | Tecnologia | Versão Mínima | Função |
| :--- | :--- | :--- | :--- |
| **Linguagem Backend** | Python | 3.8+ | Lógica de servidor e integração HTTP |
| **Framework Web** | FastAPI | 0.100+ | Roteamento, validação Pydantic, Async |
| **Servidor ASGI** | Uvicorn | 0.20+ | Execução do aplicativo Python |
| **Cliente HTTP** | httpx | 0.24+ | Requisições assíncronas para o LM Studio |
| **Validação** | Pydantic | 2.0+ | Tipagem e validação de schemas JSON |
| **Frontend Core** | HTML5/CSS3 | N/A | Estrutura e estilo |
| **Scripting** | JavaScript | ES6+ | Interatividade e chamadas de API |
| **Motor de IA** | LM Studio | Latest | Inferência local de LLMs |

---

## 4. Fluxo de Dados e Integração

### 4.1. Fluxo de Configuração
1. **Inicialização:** Ao carregar a página, o JS chama `GET /api/config`.
2. **Preenchimento:** O backend lê `config.json` e retorna os valores. O JS preenche os inputs do formulário.
3. **Edição:** O usuário altera parâmetros (ex: Temperatura, Modelo).
4. **Salvaguarda:** Ao clicar em "Salvar", o JS valida os dados e envia `POST /api/config`.
5. **Persistência:** O backend valida o schema Pydantic e sobrescreve `config.json` atomicamente (write-temp-rename).

### 4.2. Fluxo de Chat (Request/Response)
1. **Input:** Usuário digita texto e clica em enviar.
2. **Contexto:** O JS adiciona a mensagem do usuário ao array `sessionHistory`.
3. **Requisição:**
   - Método: `POST`
   - Endpoint: `/api/chat`
   - Payload: `{ "messages": [...] }`
4. **Processamento Backend:**
   - Lê `config.json` fresco (sem cache).
   - Constrói payload compatível com OpenAI.
   - Insere header `Authorization` se `api_key` existir.
   - Dispara requisição assíncrona para `base_url/chat/completions` (Timeout: 60s).
5. **Resposta:**
   - Sucesso: Extrai o conteúdo da resposta da LLM e retorna `{ "reply": "..." }`.
   - Erro: Captura exceções e retorna `{ "error": "..." }` com HTTP status apropriado.
6. **Renderização:** O JS exibe a resposta ou erro no balão de chat e atualiza o histórico.

---

## 5. Funcionalidades Implementadas

### ✅ Backend
- [x] Servidor FastAPI configurado com título e descrição.
- [x] Servir arquivos estáticos da pasta `./static`.
- [x] Criação automática de `config.json` com defaults seguros.
- [x] Endpoint `GET /` servindo `index.html`.
- [x] API RESTful para configurações (`GET`/`POST` `/api/config`).
- [x] Proxy de Chat (`POST `/api/chat`) com tratamento de erros completo.
- [x] Logs de console detalhados (método, tempo de resposta, status).
- [x] Validação de tipos com Pydantic.
- [x] Salvamento atômico de arquivos.

### ✅ Frontend (UI/UX)
- [x] Layout com Sidemenu lateral responsiva.
- [x] Navegação entre painéis (Chat/Config) sem recarregar página.
- [x] Design limpo com variáveis CSS e modo escuro implícito.
- [x] Distinção visual clara entre mensagens do usuário e assistente.
- [x] Indicador visual de "Processando..." (loading state).
- [x] Feedback de sucesso/erro nas ações de configuração.
- [x] Validação de campos no lado do cliente.
- [x] Histórico de conversa mantido em memória durante a sessão.
- [x] Código modular sem dependências externas.

---

## 6. Configurações e Parâmetros Ajustáveis

O sistema permite ajustar os seguintes parâmetros via interface gráfica, que são persistidos no `config.json`:

| Parâmetro | Tipo | Faixa/Formato | Descrição |
| :--- | :--- | :--- | :--- |
| **Base URL** | String | URL válida | Endereço do servidor de inferência (padrão: `http://localhost:1234/v1`) |
| **Modelo** | String | Texto livre | Nome exato do modelo carregado no LM Studio |
| **API Key** | String | Texto (Password) | Chave de autenticação (opcional, usada se não vazia) |
| **Temperatura** | Float | 0.0 - 1.0 | Controla a criatividade/aleatoriedade da resposta |
| **Max Tokens** | Inteiro | > 0 | Limite máximo de tokens na resposta gerada |

---

## 7. Segurança e Robustez

### Medidas de Segurança
- **Localhost Only:** O servidor uvicorn é instruído a rodar apenas em `127.0.0.1`, impedindo acesso externo direto.
- **Sanitização de Logs:** A API Key é explicitamente excluída dos logs de debug do backend.
- **Validação de Entrada:** Todos os inputs de configuração passam por validação de tipo rigorosa via Pydantic antes de serem escritos em disco.
- **CORS:** Não requer configuração complexa de CORS pois frontend e backend compartilham a mesma origem (same-origin policy).

### Tratamento de Erros
- **Timeout:** Requisições à LLM falham graciosamente após 60s, evitando travamento do servidor.
- **Conexão:** Erros de conexão (LM Studio desligado) retornam mensagens amigáveis ao usuário.
- **JSON Malformado:** Erros de parse na resposta da LLM são capturados e reportados.
- **Arquivo Corrompido:** O sistema tende a recriar configs padrão em caso de falha crítica de leitura (dependendo da implementação de fallback).

---

## 8. Requisitos de Sistema e Dependências

### Ambiente de Execução
- **Python:** 3.8 ou superior recomendado.
- **Sistema Operacional:** Windows, Linux ou macOS.
- **Memória RAM:** Depende do modelo LLM carregado no LM Studio (mínimo 8GB recomendado para o SO + App).

### Instalação de Dependências
O arquivo `requirements.txt` contém:
```text
fastapi
uvicorn
httpx
pydantic
```

Comando de instalação:
```bash
pip install -r requirements.txt
```

---

## 9. Guia de Operação (Passo a Passo)

1. **Preparação do Ambiente:**
   - Criar e ativar venv.
   - Instalar requisitos.
2. **Configuração do LM Studio:**
   - Carregar modelo.
   - Iniciar Server Local na porta 1234.
   - Verificar endpoint `http://localhost:1234/v1/models`.
3. **Início do Servidor:**
   - Executar: `uvicorn main:app --host 127.0.0.1 --port 7777 --reload`
4. **Uso da Interface:**
   - Acessar `http://127.0.0.1:7777`.
   - Ir em **Configurações**.
   - Preencher "Modelo" com o nome exato do LM Studio.
   - Salvar.
   - Ir em **Chat** e iniciar conversa.

---

## 10. Limitações Conhecidas

1. **Histórico Volátil:** O histórico de chat (`sessionHistory`) é armazenado apenas na memória do navegador. Recarregar a página limpa a conversa atual.
2. **Sem Streaming:** A resposta da LLM é exibida apenas após a geração completa do texto (não há efeito de digitação em tempo real via SSE).
3. **Single-User:** Projetado para uso local individual. Não possui autenticação de usuários múltiplos.
4. **Sem Persistência de Chat:** Conversas anteriores não são salvas em banco de dados.

---

## 11. Roadmap e Extensões Futuras

Para evoluções futuras do projeto, as seguintes funcionalidades foram identificadas como prioridades:

### Curto Prazo
- [ ] **Streaming de Resposta:** Implementar Server-Sent Events (SSE) para exibir tokens conforme são gerados.
- [ ] **Persistência de Histórico:** Integrar SQLite para salvar conversas e permitir retomada.
- [ ] **Exportação:** Botão para exportar chat em Markdown ou TXT.

### Médio Prazo
- [ ] **Múltiplos Perfis:** Permitir salvar diferentes configurações de "Agentes" (ex: Programador, Tradutor, Criativo).
- [ ] **Upload de Documentos:** Capacidade de enviar arquivos para RAG (Retrieval-Augmented Generation) básico.
- [ ] **Dark/Light Mode Toggle:** Botão explícito para troca de tema.

### Longo Prazo
- [ ] **Dockerização:** Criar `Dockerfile` e `docker-compose.yml` para deploy facilitado.
- [ ] **Autenticação:** Adicionar login simples ou JWT para proteger o acesso à interface.
- [ ] **Suporte a Imagens:** Integração com modelos multimodais (Vision) se suportado pelo backend local.

---

## 12. Conclusão Técnica

O projeto encontra-se em um estado **estável e funcional**, atendendo plenamente aos requisitos de criar um cliente local para LLMs com interface moderna e backend robusto. A separação clara de responsabilidades (frontend estático vs. backend assíncrono) facilita a manutenção e a expansão futura. A escolha por tecnologias leves (FastAPI + Vanilla JS) garante que a aplicação permaneça rápida e com baixa pegada de recursos, ideal para execução em máquinas locais onde os recursos de GPU/CPU já estão sendo demandados pelo modelo de IA.

A documentação (`README.md` e este `stats.md`) cobre todos os aspectos necessários para instalação, operação e entendimento da arquitetura atual.
