import re
from typing import List
from app.schemas.tts import WordTiming


class SyllableTokenizer:
    """
    Bilingual Syllable Tokenizer & Audio Timing Synchronizer.
    Supports Malayalam akshara orthographic segmentation and English phonetic syllabification.
    """

    @classmethod
    def syllabify_malayalam(cls, word: str) -> List[str]:
        """
        Segment Malayalam word into aksharas (orthographic syllables).
        A Malayalam syllable is a base consonant/vowel with its diacritic signs and virama conjuncts.
        """
        pattern = r'(?:[\u0D15-\u0D3A]\u0D4D)*[\u0D05-\u0D3A\u0D7A-\u0D7F][\u0D3E-\u0D4D\u0D57\u0D02\u0D03]?'
        matches = re.findall(pattern, word)
        return matches if matches else [word]

    @classmethod
    def syllabify_english(cls, word: str) -> List[str]:
        """
        Heuristic syllabification for English words based on vowel clusters and morphological rules.
        """
        cleaned = re.sub(r'[^a-zA-Z]', '', word)
        if len(cleaned) <= 3:
            return [word]

        w = cleaned.lower()
        splits = re.split(
            r'(?<=[aeiouy])(?=[^aeiouy][aeiouy])|(?<=[aeiouy][^aeiouy])(?=[^aeiouy][aeiouy])',
            w
        )
        res = [s for s in splits if s]

        merged: List[str] = []
        for part in res:
            if merged and len(part) == 1 and part not in 'aeiouy':
                merged[-1] += part
            elif merged and len(merged[-1]) == 1 and merged[-1] not in 'aeiouy':
                merged[-1] += part
            else:
                merged.append(part)

        return merged if merged else [word]

    @classmethod
    def syllabify_word(cls, word: str, language: str = "en") -> List[str]:
        """Syllabify word based on specified language ('en' or 'ml')"""
        clean_word = word.strip()
        if not clean_word:
            return []

        if language == "ml":
            return cls.syllabify_malayalam(clean_word)
        return cls.syllabify_english(clean_word)

    @classmethod
    def generate_word_timings(
        cls,
        text: str,
        total_duration_ms: int,
        language: str = "en",
        rate: float = 1.0
    ) -> List[WordTiming]:
        """
        Distribute audio duration across words and constituent syllables with natural pauses.
        Produces synchronized timestamps (start_ms, end_ms, syllables) for frontend highlighting.
        """
        raw_words = text.split()
        if not raw_words:
            return []

        # Relative phonetic weights based on character length and punctuation
        weights = []
        for w in raw_words:
            base_wt = max(1, len(w))
            # Extra pause weight on commas and periods
            if w.endswith(('.', '!', '?')):
                base_wt += 3
            elif w.endswith((',', ';', ':')):
                base_wt += 1.5
            weights.append(base_wt)

        total_weight = sum(weights)
        timings: List[WordTiming] = []
        current_time_ms = 0

        # Reserve small silence buffers at boundaries
        active_speech_ms = max(100, int(total_duration_ms * 0.95))
        ms_per_unit = active_speech_ms / total_weight

        for idx, word in enumerate(raw_words):
            word_duration = int(weights[idx] * ms_per_unit)
            start_ms = current_time_ms
            end_ms = start_ms + max(80, word_duration)

            syllables = cls.syllabify_word(word, language)

            timings.append(WordTiming(
                word=word,
                start_ms=start_ms,
                end_ms=end_ms,
                syllables=syllables
            ))

            # Inter-word acoustic gap
            pause_ms = 40 if not word.endswith(('.', '!', '?', ',')) else 120
            current_time_ms = end_ms + int(pause_ms / max(0.5, rate))

        return timings
