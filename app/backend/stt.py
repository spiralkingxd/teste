"""
Módulo de Speech-to-Text usando FFmpeg via subprocess + Whisper CLI.
Implementação com subprocess do FFmpeg para pré-processamento de áudio.
"""

import logging
import subprocess
import tempfile
import os
from typing import Dict, Any
from fastapi import HTTPException

logger = logging.getLogger("shogun.stt")


class STTEngine:
    """
    Motor de STT usando FFmpeg via subprocess + Whisper.
    Usa FFmpeg para pré-processamento e Whisper para transcrição.
    """
    
    def __init__(self):
        pass

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
            
            # Construir comando Whisper CLI
            whisper_cmd = [
                "whisper",
                temp_file,
                "--model", model_size,
                "--output_format", "json",
                "--no_print_progress"
            ]
            
            if whisper_lang:
                whisper_cmd.extend(["--language", whisper_lang])
            
            logger.debug(f"Executando Whisper: {' '.join(whisper_cmd)}")
            
            result = subprocess.run(
                whisper_cmd,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            if result.returncode != 0:
                logger.error(f"Whisper falhou: {result.stderr}")
                raise Exception(f"Whisper error: {result.stderr}")
            
            # Parse do output JSON do Whisper
            import json
            output_path = temp_file + ".json"
            
            if not os.path.exists(output_path):
                # Tenta encontrar o arquivo JSON em outros locais possíveis
                base_name = os.path.splitext(temp_file)[0]
                output_path = base_name + ".json"
            
            if os.path.exists(output_path):
                with open(output_path, 'r', encoding='utf-8') as f:
                    transcript_data = json.load(f)
                
                text = transcript_data.get("text", "").strip()
                language_detected = transcript_data.get("language", "unknown")
                
                # Calcular duração aproximada
                duration = 0.0
                if "segments" in transcript_data and transcript_data["segments"]:
                    last_segment = transcript_data["segments"][-1]
                    duration = last_segment.get("end", 0.0)
                
                # Limpar arquivo JSON
                if os.path.exists(output_path):
                    os.unlink(output_path)
                
            else:
                # Fallback: usar stdout se JSON não foi criado
                text = result.stdout.strip()
                language_detected = whisper_lang or "auto"
                duration = 0.0
            
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
