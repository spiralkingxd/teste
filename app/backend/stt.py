"""
Módulo de Speech-to-Text usando FFmpeg via subprocess + Whisper API Python.
Implementação com subprocess do FFmpeg para pré-processamento de áudio.
"""

import logging
import subprocess
import tempfile
import os
import json
from typing import Dict, Any
from fastapi import HTTPException

logger = logging.getLogger("shogun.stt")


class STTEngine:
    """
    Motor de STT usando FFmpeg via subprocess + Whisper API Python.
    Usa FFmpeg para pré-processamento e Whisper (API Python) para transcrição.
    """
    
    def __init__(self):
        self.model_cache = {}

    def _get_model(self, model_size: str):
        """Carrega ou retorna modelo em cache."""
        import whisper
        
        if model_size not in self.model_cache:
            logger.info(f"Carregando modelo Whisper: {model_size}")
            try:
                self.model_cache[model_size] = whisper.load_model(model_size)
            except Exception as e:
                logger.error(f"Erro ao carregar modelo {model_size}: {e}")
                raise HTTPException(status_code=500, detail=f"Falha ao carregar modelo: {str(e)}")
        
        return self.model_cache[model_size]

    def _preprocess_audio_with_ffmpeg(self, audio_data: bytes, output_path: str) -> bool:
        """
        Usa FFmpeg via subprocess para converter/normalizar áudio para formato compatível.
        
        Args:
            audio_data: Bytes do arquivo de áudio original
            output_path: Caminho para o arquivo de saída
            
        Returns:
            True se sucesso
        """
        try:
            # Cria arquivo temporário de entrada
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_input:
                tmp_input.write(audio_data)
                tmp_input_path = tmp_input.name
            
            try:
                # Comando FFmpeg para converter para WAV 16kHz mono (formato ideal para Whisper)
                ffmpeg_cmd = [
                    "ffmpeg",
                    "-y",  # Sobrescrever saída sem perguntar
                    "-i", tmp_input_path,  # Entrada
                    "-ar", "16000",  # Sample rate 16kHz
                    "-ac", "1",  # Mono
                    "-f", "wav",  # Formato WAV
                    "-acodec", "pcm_s16le",  # Codec PCM 16-bit
                    output_path  # Saída
                ]
                
                logger.debug(f"Executando FFmpeg: {' '.join(ffmpeg_cmd)}")
                
                result = subprocess.run(
                    ffmpeg_cmd,
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                
                if result.returncode != 0:
                    logger.error(f"FFmpeg falhou: {result.stderr}")
                    raise Exception(f"FFmpeg error: {result.stderr}")
                
                logger.debug("FFmpeg processamento concluído com sucesso.")
                return True
                
            finally:
                # Limpa arquivo temporário de entrada
                if os.path.exists(tmp_input_path):
                    os.unlink(tmp_input_path)
                    
        except subprocess.TimeoutExpired:
            logger.error("Timeout no processamento FFmpeg")
            raise HTTPException(status_code=500, detail="Timeout no processamento de áudio")
        except Exception as e:
            logger.error(f"Erro no FFmpeg: {e}")
            raise HTTPException(status_code=500, detail=f"Erro no pré-processamento de áudio: {str(e)}")

    async def transcribe(self, audio_data: bytes, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa áudio usando FFmpeg via subprocess e retorna transcrição.
        
        Args:
            audio_data: Bytes do arquivo de áudio
            config: Dicionário com configurações (model_size, language, etc.)
            
        Returns:
            Dicionário com texto, idioma detectado, duração e metadados
        """
        model_size = config.get("model_size", "base")
        language = config.get("language", None)
        
        # Determinar idioma para Whisper (None = auto detect)
        whisper_lang = None if language in [None, "auto"] else language
        
        temp_file = None
        try:
            # Criar arquivo temporário para áudio processado
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                temp_file = tmp.name
            
            # Pré-processar áudio com FFmpeg
            self._preprocess_audio_with_ffmpeg(audio_data, temp_file)
            
            # Carregar modelo e transcrever usando API Python do Whisper
            model = self._get_model(model_size)
            
            # Opções de transcrição
            options = {}
            if whisper_lang:
                options["language"] = whisper_lang
            
            logger.debug(f"Transcrevendo com modelo {model_size}, idioma={whisper_lang or 'auto'}")
            
            result = model.transcribe(temp_file, **options)
            
            text = result.get("text", "").strip()
            language_detected = result.get("language", "unknown")
            
            # Calcular duração aproximada
            duration = 0.0
            if "segments" in result and result["segments"]:
                last_segment = result["segments"][-1]
                duration = last_segment.get("end", 0.0)
            
            return {
                "text": text,
                "language": language_detected,
                "language_probability": 1.0,
                "duration": duration,
                "all_language_probs": []
            }
            
        except subprocess.TimeoutExpired:
            logger.error("Timeout na transcrição")
            raise HTTPException(status_code=500, detail="Timeout na transcrição de áudio")
        except Exception as e:
            logger.error(f"Erro na transcrição: {e}")
            raise HTTPException(status_code=500, detail=f"Falha na transcrição: {str(e)}")
        finally:
            # Limpeza de arquivos temporários
            if temp_file and os.path.exists(temp_file):
                os.unlink(temp_file)
            json_path = temp_file + ".json" if temp_file else None
            if json_path and os.path.exists(json_path):
                os.unlink(json_path)


# Singleton instance
stt_engine = STTEngine()
