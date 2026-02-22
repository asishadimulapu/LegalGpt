# Indian Law RAG Chatbot - Translation Service
"""
Google Translate integration for multilingual legal assistance.

Flow:
1. Detect / receive user's language
2. Translate non-English query → English  (for RAG retrieval + LLM)
3. Run RAG pipeline in English
4. Translate English response → user's language

Viva Explanation:
- Legal documents are in English, so RAG must operate in English
- Translation happens at the edges (input & output) only
- Caching avoids redundant API calls for repeated phrases
- Falls back gracefully if translation service is unavailable
"""

import logging
import hashlib
from typing import Optional, Tuple
from functools import lru_cache

logger = logging.getLogger(__name__)

# In-memory translation cache (LRU, 1024 entries)
# Key: (text_hash, source_lang, target_lang) → translated text
_translation_cache: dict = {}
_CACHE_MAX = 1024


# =============================================================================
# Public API
# =============================================================================

def translate_to_english(text: str, source_lang: Optional[str] = None) -> Tuple[str, str]:
    """
    Translate user input to English for RAG processing.

    Args:
        text: Original user text (any language)
        source_lang: ISO 639-1 code if known, else auto-detect

    Returns:
        Tuple[translated_text, detected_language_code]
        If text is already English, returns (text, "en") without calling API.

    Viva Explanation:
    - Auto-detects language when source_lang is None
    - Skips translation for English input (saves API cost)
    - Cached to avoid repeated translations
    """
    # Quick check: if explicitly English, skip
    if source_lang == "en":
        return text, "en"

    try:
        from deep_translator import GoogleTranslator

        # Auto-detect if no source language provided
        if source_lang is None or source_lang == "auto":
            detected = _detect_language(text)
            if detected == "en":
                return text, "en"
            source_lang = detected

        # Check cache
        cache_key = _cache_key(text, source_lang, "en")
        if cache_key in _translation_cache:
            return _translation_cache[cache_key], source_lang

        # Translate
        translator = GoogleTranslator(source=source_lang, target="en")
        translated = translator.translate(text)

        # Guard against None/empty return from translator
        if not translated:
            translated = ""

        # Cache result (only cache non-empty)
        if translated:
            _cache_put(cache_key, translated)

        logger.info(f"Translated [{source_lang}→en]: {len(text)} chars → {len(translated)} chars")
        return translated, source_lang

    except ImportError:
        logger.warning("deep_translator not installed — skipping translation")
        return text, source_lang or "en"
    except Exception as e:
        logger.error(f"Translation to English failed: {e}")
        return text, source_lang or "en"


def translate_from_english(text: str, target_lang: str) -> str:
    """
    Translate English RAG response back to the user's language.

    Args:
        text: English response from the RAG pipeline
        target_lang: ISO 639-1 code of user's language

    Returns:
        Translated text, or original English on failure.

    Viva Explanation:
    - Only called when target_lang != 'en'
    - Legal citations [Act, Section X] are preserved as-is
    - Cached to reduce API latency
    """
    if target_lang == "en":
        return text

    try:
        from deep_translator import GoogleTranslator

        # Check cache
        cache_key = _cache_key(text, "en", target_lang)
        if cache_key in _translation_cache:
            return _translation_cache[cache_key]

        translator = GoogleTranslator(source="en", target=target_lang)

        # Protect legal citations from being translated
        import re
        citations = re.findall(r'\[.*?\]', text)
        placeholders = {}
        protected_text = text
        for i, cite in enumerate(citations):
            placeholder = f"\u27e6CITE{i}\u27e7"
            placeholders[placeholder] = cite
            protected_text = protected_text.replace(cite, placeholder, 1)

        translated = translator.translate(protected_text)

        # Verify and restore citations
        for placeholder, cite in placeholders.items():
            if placeholder in translated:
                translated = translated.replace(placeholder, cite)
            else:
                logger.warning(f"Citation placeholder '{placeholder}' was altered during translation; restoring raw citation")
                translated += f" {cite}"

        _cache_put(cache_key, translated)

        logger.info(f"Translated [en→{target_lang}]: {len(text)} chars")
        return translated

    except ImportError:
        logger.warning("deep_translator not installed — returning English")
        return text
    except Exception as e:
        logger.error(f"Translation from English failed: {e}")
        return text


def detect_language(text: str) -> str:
    """
    Detect the language of the input text.

    Returns:
        ISO 639-1 language code (e.g., 'hi', 'ta', 'en')
    """
    return _detect_language(text)


# =============================================================================
# Supported Languages for Indian Legal Context
# =============================================================================
SUPPORTED_LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "kn": "Kannada",
    "ml": "Malayalam",
    "mr": "Marathi",
    "bn": "Bengali",
    "gu": "Gujarati",
    "pa": "Punjabi",
    "or": "Odia",
    "ur": "Urdu",
}


def is_supported_language(lang_code: str) -> bool:
    """Check if a language code is supported."""
    return lang_code in SUPPORTED_LANGUAGES


# =============================================================================
# Internal Helpers
# =============================================================================

def _detect_language(text: str) -> str:
    """Detect language using deep_translator or fallback heuristic."""
    try:
        from deep_translator import single_detection
        detected = single_detection(text, api_key=None)
        return detected if detected else "en"
    except Exception:
        pass

    # Fallback: simple heuristic based on Unicode script ranges
    # Devanagari (Hindi, Marathi)
    devanagari = sum(1 for c in text if '\u0900' <= c <= '\u097F')
    tamil = sum(1 for c in text if '\u0B80' <= c <= '\u0BFF')
    telugu = sum(1 for c in text if '\u0C00' <= c <= '\u0C7F')
    bengali = sum(1 for c in text if '\u0980' <= c <= '\u09FF')
    kannada = sum(1 for c in text if '\u0C80' <= c <= '\u0CFF')
    gujarati = sum(1 for c in text if '\u0A80' <= c <= '\u0AFF')
    malayalam = sum(1 for c in text if '\u0D00' <= c <= '\u0D7F')

    scores = {
        "hi": devanagari, "ta": tamil, "te": telugu,
        "bn": bengali, "kn": kannada, "gu": gujarati, "ml": malayalam,
    }
    best = max(scores, key=scores.get)
    if scores[best] > 0:
        return best
    return "en"


def _cache_key(text: str, src: str, tgt: str) -> str:
    """Generate a cache key from text + language pair."""
    text_hash = hashlib.md5(text.encode()).hexdigest()[:16]
    return f"{text_hash}:{src}:{tgt}"


def _cache_put(key: str, value: str):
    """Put a value in the translation cache with LRU eviction."""
    if len(_translation_cache) >= _CACHE_MAX:
        # Remove oldest 25%
        keys_to_remove = list(_translation_cache.keys())[:_CACHE_MAX // 4]
        for k in keys_to_remove:
            _translation_cache.pop(k, None)
    _translation_cache[key] = value
