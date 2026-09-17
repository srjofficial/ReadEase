import os
import json
import hashlib
from typing import Optional, Dict
from app.schemas.tts import TTSResponse
from app.core.logger import logger


class TTSAudioCache:
    """
    Two-tier caching layer for synthesized TTS audio (In-Memory + Disk).
    Keyed by passage + language + voice + rate to eliminate redundant cloud/synthesis calls.
    """

    _memory_cache: Dict[str, TTSResponse] = {}
    _cache_dir: Optional[str] = None
    _max_memory_entries: int = 500

    @classmethod
    def _get_cache_dir(cls) -> str:
        if cls._cache_dir is None:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            cls._cache_dir = os.path.join(base_dir, ".tts_cache")
            os.makedirs(cls._cache_dir, exist_ok=True)
        return cls._cache_dir

    @classmethod
    def generate_cache_key(
        cls,
        text: str,
        language: str = "en",
        voice: str = "natural",
        rate: float = 1.0
    ) -> str:
        """Normalized SHA-256 fingerprint of the synthesis parameters"""
        raw_key = f"{text.strip()}::{language.lower()}::{voice.lower()}::{round(rate, 2)}"
        return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

    @classmethod
    def get(
        cls,
        text: str,
        language: str = "en",
        voice: str = "natural",
        rate: float = 1.0
    ) -> Optional[TTSResponse]:
        """Lookup cached TTS audio by passage + language + voice key"""
        cache_key = cls.generate_cache_key(text, language, voice, rate)

        # 1. Check in-memory cache
        if cache_key in cls._memory_cache:
            res = cls._memory_cache[cache_key]
            return res.model_copy(update={"cached": True})

        # 2. Check disk cache
        try:
            cache_file = os.path.join(cls._get_cache_dir(), f"{cache_key}.json")
            if os.path.exists(cache_file):
                with open(cache_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                res = TTSResponse(**data)
                # Populate memory cache
                cls._memory_cache[cache_key] = res
                return res.model_copy(update={"cached": True})
        except Exception as e:
            logger.warning(f"Error reading TTS disk cache: {e}")

        return None

    @classmethod
    def set(
        cls,
        text: str,
        language: str,
        voice: str,
        rate: float,
        response: TTSResponse
    ) -> None:
        """Store synthesized TTS audio into memory and disk cache"""
        cache_key = cls.generate_cache_key(text, language, voice, rate)

        # 1. Update in-memory cache with eviction if oversized
        if len(cls._memory_cache) >= cls._max_memory_entries:
            # Pop arbitrary first item
            first_key = next(iter(cls._memory_cache))
            cls._memory_cache.pop(first_key, None)

        # Save copy marked as cached
        cached_copy = response.model_copy(update={"cached": True})
        cls._memory_cache[cache_key] = cached_copy

        # 2. Save to disk cache asynchronously or synchronously
        try:
            cache_file = os.path.join(cls._get_cache_dir(), f"{cache_key}.json")
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(cached_copy.model_dump(), f)
        except Exception as e:
            logger.warning(f"Error writing TTS disk cache: {e}")

    @classmethod
    def clear(cls) -> None:
        """Clear memory and disk cache"""
        cls._memory_cache.clear()
        try:
            cache_dir = cls._get_cache_dir()
            for filename in os.listdir(cache_dir):
                if filename.endswith(".json"):
                    os.remove(os.path.join(cache_dir, filename))
        except Exception as e:
            logger.warning(f"Error clearing TTS disk cache: {e}")
