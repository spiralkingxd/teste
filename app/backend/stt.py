"""
Módulo de Speech-to-Text usando Faster Whisper.
Implementação com carregamento lazy e gerenciamento de memória.
"""

import logging
import io
from typing import Optional, Dict, Any

from faster_whisper import WhisperModel
from fastapi import HTTPException

logger = logging.getLogger("shogun.stt")


class STTEngine:
    """
    Motor de STT com Faster Whisper.
    Singleton que gerencia carregamento e processamento de modelos.
    """
    
    def __init__(self):
        self.model: Optional[WhisperModel] = None
        self.current_model_size: Optional[str] = None
        self.compute_type: str = "default"

    def load_model(self, model_size: str = "base", compute_type: str = "default") -> bool:
        """
        Carrega o modelo de forma lazy. Se já estiver carregado com o mesmo tamanho, ignora.
        
        Args:
            model_size: Tamanho do modelo (tiny, base, small, medium, large-v3)
            compute_type: Tipo de computação (int8, float16, default)
            
        Returns:
            True se carregado com sucesso
        """
        if self.model and self.current_model_size == model_size and self.compute_type == compute_type:
            logger.info(f"Modelo {model_size} já está carregado.")
            return True

        self.unload_model()  # Descarrega anterior se houver
        
        try:
            logger.info(f"Carregando modelo Whisper: {model_size} ({compute_type})...")
            # device="auto" detecta CUDA automaticamente
            # compute_type="int8" acelera em CPU, "float16" em GPU
            self.model = WhisperModel(model_size, device="auto", compute_type=compute_type)
            self.current_model_size = model_size
            self.compute_type = compute_type
            logger.info(f"Modelo {model_size} carregado com sucesso.")
            return True
        except Exception as e:
            logger.error(f"Falha ao carregar modelo: {e}")
            raise HTTPException(status_code=500, detail=f"Erro ao carregar modelo STT: {str(e)}")

    def unload_model(self) -> None:
        """Libera memória VRAM/RAM descarregando o modelo."""
        if self.model:
            del self.model
            self.model = None
            self.current_model_size = None
            logger.info("Modelo STT descarregado da memória.")

    async def transcribe(self, audio_data: bytes, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa áudio e retorna transcrição.
        
        Args:
            audio_data: Bytes do arquivo WAV
            config: Dicionário com configurações (model_size, beam_size, language, etc.)
            
        Returns:
            Dicionário com texto, idioma detectado, duração e segmentos
        """
        if not self.model:
            # Tenta carregar com configs se não estiver carregado
            self.load_model(config.get("model_size", "base"), config.get("compute_type", "default"))
        
        if not self.model:
            raise HTTPException(status_code=503, detail="Modelo STT não disponível.")

        try:
            # Converter bytes para stream que o whisper aceita
            audio_stream = io.BytesIO(audio_data)
            
            # Parâmetros de inferência
            beam_size = int(config.get("beam_size", 5))
            language = config.get("language", None)  # None = auto detect
            temperature = float(config.get("temperature", 0.0))

            logger.debug(f"Transcrevendo com beam_size={beam_size}, lang={language}")

            segments, info = self.model.transcribe(
                audio_stream,
                beam_size=beam_size,
                language=language if language != "auto" else None,
                temperature=temperature,
                vad_filter=True  # Filtro de voz ativo para melhor performance
            )

            text = " ".join([segment.text for segment in segments]).strip()
            
            return {
                "text": text,
                "language": info.language,
                "language_probability": info.language_probability,
                "duration": info.duration,
                "all_language_probs": list(info.all_language_probs)[:5]  # Top 5 idiomas
            }

        except Exception as e:
            logger.error(f"Erro na transcrição: {e}")
            raise HTTPException(status_code=500, detail=f"Falha na transcrição: {str(e)}")


# Singleton instance
stt_engine = STTEngine()
