"""
Backend principal da aplicação FastAPI.
Configuração inicial, servidor de arquivos estáticos e endpoints base.
"""

import json
import os
import time
import logging
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field, field_validator

# Configuração de logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Caminho base do diretório app
BASE_DIR = Path(__file__).parent.resolve()
CONFIG_PATH = BASE_DIR / "config.json"
STATIC_DIR = BASE_DIR / "static"

# Valores padrão seguros para configuração
DEFAULT_CONFIG = {
    "base_url": "http://localhost:1234/v1",
    "model": "",
    "api_key": "",
    "temperature": 0.7,
    "max_tokens": 1024
}


def carregar_config() -> dict:
    """
    Carrega o config.json sempre do disco (sem cache).
    Se não existir, cria com valores padrão.
    """
    if not CONFIG_PATH.exists():
        # Cria o arquivo de configuração com valores padrão
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_CONFIG, f, indent=4, ensure_ascii=False)
        return DEFAULT_CONFIG
    
    with open(CONFIG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def salvar_config(config_data: dict) -> None:
    """
    Salva a configuração atomicamente no config.json.
    Usa escrita em arquivo temporário + rename para garantir atomicidade.
    """
    temp_path = CONFIG_PATH.with_suffix(".tmp")
    with open(temp_path, "w", encoding="utf-8") as f:
        json.dump(config_data, f, indent=4, ensure_ascii=False)
    temp_path.replace(CONFIG_PATH)


# Modelos Pydantic para validação
class ConfigInput(BaseModel):
    """Modelo de entrada para configurações."""
    base_url: str = Field(..., description="URL base da API LLM")
    model: str = Field(default="", description="Nome do modelo")
    api_key: str = Field(default="", description="Chave de API")
    temperature: float = Field(default=0.7, ge=0.0, le=1.0, description="Temperatura (0.0 a 1.0)")
    max_tokens: int = Field(default=1024, ge=1, le=8192, description="Máximo de tokens")


class ChatMessage(BaseModel):
    """Modelo de mensagem do chat."""
    role: str = Field(..., description="Papel: 'user' ou 'assistant'")
    content: str = Field(..., description="Conteúdo da mensagem")


class ChatInput(BaseModel):
    """Modelo de entrada para o endpoint de chat."""
    messages: list[ChatMessage] = Field(..., description="Histórico de mensagens")


# Inicializa a aplicação FastAPI
app = FastAPI(
    title="API de Chat",
    description="Backend para aplicação de chat com IA"
)


# Serve arquivos estáticos da pasta ./static
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/")
async def root():
    """
    Endpoint principal que retorna o index.html.
    """
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/config")
async def get_config():
    """
    Endpoint GET /api/config: lê config.json atual e retorna JSON.
    """
    config = carregar_config()
    logger.info("GET /api/config - Configuração carregada com sucesso")
    return JSONResponse(content=config)


@app.post("/api/config")
async def update_config(config_input: ConfigInput):
    """
    Endpoint POST /api/config: recebe payload, valida tipos,
    sobrescreve config.json atomicamente e retorna status.
    """
    try:
        # Converte para dict e salva
        config_data = config_input.model_dump()
        salvar_config(config_data)
        
        # Log sem incluir api_key por segurança
        log_data = config_data.copy()
        log_data["api_key"] = "***REDACTED***" if log_data["api_key"] else ""
        logger.info(f"POST /api/config - Configuração atualizada: {log_data}")
        
        return JSONResponse(content={"status": "ok"})
    except Exception as e:
        logger.error(f"POST /api/config - Erro ao salvar configuração: {e}")
        raise HTTPException(status_code=400, detail=f"Erro ao salvar configuração: {str(e)}")


@app.post("/api/chat")
async def chat(chat_input: ChatInput):
    """
    Endpoint POST /api/chat:
    - Lê config.json dinamicamente a cada requisição
    - Monta payload compatível com OpenAI /v1/chat/completions
    - Faz chamada async à base_url + "/chat/completions"
    - Inclui Authorization header apenas se api_key não estiver vazia
    - Timeout de 60s com tratamento de erros
    """
    start_time = time.time()
    
    # Carrega configuração atualizada do disco
    config = carregar_config()
    
    base_url = config.get("base_url", "")
    model = config.get("model", "")
    api_key = config.get("api_key", "")
    temperature = config.get("temperature", 0.7)
    max_tokens = config.get("max_tokens", 1024)
    
    # Validações básicas
    if not base_url:
        logger.error("POST /api/chat - base_url não configurada")
        return JSONResponse(
            status_code=400,
            content={"error": "Base URL não configurada"}
        )
    
    # Monta payload compatível com OpenAI /v1/chat/completions
    messages_payload = [{"role": msg.role, "content": msg.content} for msg in chat_input.messages]
    
    payload = {
        "model": model,
        "messages": messages_payload,
        "temperature": temperature,
        "max_tokens": max_tokens
    }
    
    # Log do payload (sem api_key)
    logger.info(f"POST /api/chat - Payload enviado: {payload}")
    
    # Headers da requisição
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    
    url = f"{base_url}/chat/completions"
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            
            elapsed_time = time.time() - start_time
            
            # Log do status code e tempo de resposta
            logger.info(
                f"POST /api/chat - Status code: {response.status_code}, "
                f"Tempo de resposta: {elapsed_time:.2f}s"
            )
            
            response.raise_for_status()
            response_data = response.json()
            
            # Extrai a resposta do assistente
            choices = response_data.get("choices", [])
            if not choices:
                return JSONResponse(
                    status_code=500,
                    content={"error": "Nenhuma escolha retornada pela LLM"}
                )
            
            reply = choices[0].get("message", {}).get("content", "")
            if not reply:
                return JSONResponse(
                    status_code=500,
                    content={"error": "Resposta vazia da LLM"}
                )
            
            return JSONResponse(content={"reply": reply})
            
    except httpx.ConnectError as e:
        elapsed_time = time.time() - start_time
        logger.error(f"POST /api/chat - ConnectionError ({elapsed_time:.2f}s): {e}")
        return JSONResponse(
            status_code=503,
            content={"error": f"Erro de conexão com o servidor LLM: {str(e)}"}
        )
    except httpx.HTTPStatusError as e:
        elapsed_time = time.time() - start_time
        logger.error(f"POST /api/chat - HTTPStatusError ({elapsed_time:.2f}s): {e}")
        return JSONResponse(
            status_code=e.response.status_code,
            content={"error": f"Erro HTTP da LLM: {e.response.status_code} - {str(e)}"}
        )
    except httpx.TimeoutException as e:
        elapsed_time = time.time() - start_time
        logger.error(f"POST /api/chat - Timeout ({elapsed_time:.2f}s): {e}")
        return JSONResponse(
            status_code=504,
            content={"error": "Timeout ao conectar com a LLM (60s)"}
        )
    except json.JSONDecodeError as e:
        elapsed_time = time.time() - start_time
        logger.error(f"POST /api/chat - JSONDecodeError ({elapsed_time:.2f}s): {e}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Erro ao processar resposta da LLM: {str(e)}"}
        )
    except Exception as e:
        elapsed_time = time.time() - start_time
        logger.error(f"POST /api/chat - Erro inesperado ({elapsed_time:.2f}s): {e}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Erro interno: {str(e)}"}
        )


if __name__ == "__main__":
    import uvicorn
    # Roda explicitamente em 127.0.0.1:7777
    uvicorn.run(app, host="127.0.0.1", port=7777)
