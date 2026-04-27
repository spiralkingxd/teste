# Chat Local com LLM (FastAPI + LM Studio)

Aplicação web minimalista para chat com modelos de linguagem locais (LLMs) utilizando FastAPI no backend e interface moderna em HTML/CSS/JS puro. Projetada para integrar-se facilmente com o **LM Studio** ou qualquer servidor compatível com a API OpenAI.

## 📋 Índice

- [Instalação](#instalação)
- [Configuração do LM Studio](#configuração-do-lm-studio)
- [Como Rodar](#como-rodar)
- [Teste Rápido](#teste-rápido)
- [Solução de Problemas](#solução-de-problemas)
- [Próximos Passos](#próximos-passos)

---

## 🛠️ Instalação

Siga os passos abaixo para configurar o ambiente de execução:

1. **Clone ou acesse o diretório do projeto:**
   ```bash
   cd app
   ```

2. **Crie um ambiente virtual Python:**
   ```bash
   python -m venv venv
   ```

3. **Ative o ambiente virtual:**
   - **Linux/macOS:**
     ```bash
     source venv/bin/activate
     ```
   - **Windows (PowerShell):**
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **Windows (CMD):**
     ```cmd
     venv\Scripts\activate.bat
     ```

4. **Instale as dependências:**
   ```bash
   pip install -r requirements.txt
   ```

---

## ⚙️ Configuração do LM Studio

Para utilizar esta aplicação com modelos locais, é necessário configurar o **LM Studio** como servidor local.

1. **Baixe e instale o LM Studio:**
   - Acesse [lmstudio.ai](https://lmstudio.ai) e instale a versão adequada para seu sistema operacional.

2. **Carregue um Modelo:**
   - Abra o LM Studio.
   - Na barra lateral esquerda, clique em "Discover" (lupa) e baixe um modelo (ex: `Llama 3`, `Mistral`, `Phi-3`).
   - Vá para a aba "My Models" (ícone de pasta) e selecione o modelo baixado para carregá-lo na memória.

3. **Ative o Servidor Local:**
   - Clique no ícone de **"Local Server"** (seta dupla `<->`) na barra lateral.
   - Configure a porta para **`1234`** (padrão esperado pela aplicação).
   - Clique em **"Start Server"**.
   - Aguarde a mensagem "Server is running".

4. **Verifique a Conexão:**
   - Abra seu navegador e acesse: `http://localhost:1234/v1/models`
   - Você deve receber um JSON listando o modelo carregado. Se funcionar, o LM Studio está pronto.

> **Nota:** A aplicação está configurada por padrão para usar `http://localhost:1234/v1`. Caso altere a porta no LM Studio, atualize o campo "Base URL" no painel de configurações da aplicação web.

---

## 🚀 Como Rodar

Com o ambiente virtual ativado e o LM Studio rodando:

1. **Inicie o servidor FastAPI:**
   ```bash
   uvicorn main:app --host 127.0.0.1 --port 7777 --reload
   ```
   *O parâmetro `--reload` reinicia automaticamente o servidor ao alterar o código.*

2. **Acesse a aplicação:**
   - Abra o navegador em: `http://localhost:7777`

---

## ✅ Teste Rápido

Valide o funcionamento completo com este fluxo:

1. **Acesse a Interface:**
   - Navegue até `http://localhost:7777`.

2. **Configure a Conexão:**
   - Clique na aba **⚙️ Configurações**.
   - Verifique se os campos estão preenchidos:
     - **Base URL:** `http://localhost:1234/v1`
     - **Modelo:** Digite exatamente o nome do modelo carregado no LM Studio (ex: `meta-llama-3-8b-instruct`). *Deixe vazio para usar o modelo padrão do servidor.*
     - **API Key:** Deixe em branco (não necessária para LM Studio local).
     - **Temperatura:** `0.7` (recomendado para equilíbrio criatividade/coerência).
     - **Max Tokens:** `1024`.
   - Clique em **Salvar Configurações** e aguarde o feedback de sucesso.

3. **Teste o Chat:**
   - Volte para a aba **💬 Chat**.
   - Digite uma mensagem (ex: "Olá, quem é você?") e pressione **Enviar**.
   - Observe o indicador "Processando..." e a resposta gerada.

4. **Verifique os Logs:**
   - No terminal onde o `uvicorn` está rodando, observe os logs de requisição:
     ```
     INFO: POST /api/chat - Status: 200 - Tempo: 1.23s
     ```
   - Erros de conexão ou timeout também aparecerão aqui.

---

## 🔧 Solução de Problemas

### Erro: "Connection refused" ou "Erro de conexão"
- **Causa:** O LM Studio não está rodando ou está em outra porta.
- **Solução:**
  1. Verifique se o servidor do LM Studio está ativo (luz verde).
  2. Confirme a porta (deve ser 1234).
  3. Teste no navegador: `http://localhost:1234/v1/models`.

### Erro: "Modelo não encontrado" ou resposta vazia
- **Causa:** Nome do modelo incorreto nas configurações.
- **Solução:**
  1. No LM Studio, veja o nome exato do modelo carregado.
  2. Atualize o campo "Modelo" nas configurações da aplicação.
  3. Alternativamente, deixe o campo "Modelo" em branco para usar o padrão.

### Erro: Timeout (60s)
- **Causa:** O modelo demorou mais de 60 segundos para responder ou travou.
- **Solução:**
  1. Use modelos menores ou mais otimizados (ex: quantizados Q4_K_M).
  2. Reduza o valor de "Max Tokens".
  3. Verifique o uso de RAM/VRAM da sua máquina.

### Arquivo `config.json` corrompido
- **Sintoma:** Erro 500 ao carregar configurações ou iniciar.
- **Solução:**
  1. Delete o arquivo `app/config.json`.
  2. Reinicie o servidor FastAPI; um novo arquivo com valores padrão será criado automaticamente.

### Erros de CORS
- **Nota:** Não se aplicam neste cenário, pois o frontend e o backend são servidos pelo mesmo domínio (`localhost:7777`), caracterizando *same-origin*.

---

## 🔮 Próximos Passos (Extensões Futuras)

Sugestões de melhorias para evoluir o projeto:

- **Streaming de Tokens:** Implementar `Server-Sent Events (SSE)` para exibir a resposta token por token em tempo real, melhorando a percepção de velocidade.
- **Autenticação JWT:** Adicionar camada de segurança para proteger o acesso à aplicação em redes internas.
- **Persistência com SQLite:** Salvar histórico de conversas e permitir retomar chats anteriores.
- **Múltiplos Perfis de Agente:** Criar presets de configurações (ex: "Codificador", "Tradutor", "Criativo") para troca rápida.
- **Containerização (Docker):** Criar `Dockerfile` e `docker-compose.yml` para facilitar o deploy em servidores ou nuvem.
- **Upload de Arquivos:** Permitir envio de documentos para análise pelo LLM (RAG básico).

---

## 📄 Estrutura do Projeto

```
app/
├── main.py           # Backend FastAPI e rotas
├── config.json       # Configurações persistentes (gerado automaticamente)
├── requirements.txt  # Dependências Python
├── static/
│   ├── index.html    # Estrutura da interface
│   ├── style.css     # Estilização e layout
│   └── app.js        # Lógica de frontend e comunicação com API
└── README.md         # Este arquivo
```

---

Desenvolvido com Python, FastAPI e Web Standards.