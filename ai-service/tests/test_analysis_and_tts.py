import time
import base64
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.services.analysis.scorer import ReadingDifficultyScorer
from app.schemas.analysis import SessionAnalysisRequest
from app.services.tts.syllables import SyllableTokenizer
from app.services.tts.cache import TTSAudioCache

client = TestClient(app)

AUTH_HEADER = {"X-Internal-Service-Key": settings.AI_SERVICE_SECRET}


def test_reading_difficulty_scorer_levels():
    """Verify reading-difficulty scorer computes low, medium, and high levels accurately"""
    # 1. Low Difficulty / Fluent Reader
    fluent_req = SessionAnalysisRequest(
        session_id="sess_fluent",
        student_id="student_1",
        language="en",
        duration_seconds=60,
        words_read=130,
        reading_speed_wpm=130.0,
        fixation_count=80,
        regression_count=2,
        skipped_words_count=0,
        accuracy_percentage=98.0
    )
    fluent_res = ReadingDifficultyScorer.evaluate(fluent_req)
    assert fluent_res.screening_level == "low"
    assert fluent_res.screening_score < 35.0
    assert fluent_res.disclaimer == "Screening aid only, not a clinical diagnosis"

    # 2. Medium Difficulty Reader
    moderate_req = SessionAnalysisRequest(
        session_id="sess_mod",
        student_id="student_2",
        language="en",
        duration_seconds=90,
        words_read=110,
        reading_speed_wpm=75.0,
        fixation_count=120,
        regression_count=14,
        skipped_words_count=4,
        accuracy_percentage=89.0
    )
    moderate_res = ReadingDifficultyScorer.evaluate(moderate_req)
    assert moderate_res.screening_level == "medium"
    assert 35.0 <= moderate_res.screening_score < 70.0
    assert moderate_res.disclaimer == "Screening aid only, not a clinical diagnosis"

    # 3. High Difficulty Reader (Heavy regressions, slow WPM, decoding strain)
    struggling_req = SessionAnalysisRequest(
        session_id="sess_high",
        student_id="student_3",
        language="en",
        duration_seconds=120,
        words_read=70,
        reading_speed_wpm=35.0,
        fixation_count=190,
        regression_count=26,
        skipped_words_count=9,
        accuracy_percentage=74.0
    )
    struggling_res = ReadingDifficultyScorer.evaluate(struggling_req)
    assert struggling_res.screening_level == "high"
    assert struggling_res.screening_score >= 70.0
    assert struggling_res.disclaimer == "Screening aid only, not a clinical diagnosis"
    assert any("reading ruler" in rec.lower() for rec in struggling_res.recommendations)


def test_malayalam_reading_difficulty_scorer():
    """Verify Malayalam reading baseline and akshara recommendations"""
    ml_req = SessionAnalysisRequest(
        session_id="sess_ml_1",
        student_id="student_ml",
        language="ml",
        duration_seconds=60,
        words_read=90,
        reading_speed_wpm=90.0,
        fixation_count=90,
        regression_count=5,
        skipped_words_count=1,
        accuracy_percentage=95.0
    )
    ml_res = ReadingDifficultyScorer.evaluate(ml_req)
    assert ml_res.screening_level == "low"
    assert ml_res.disclaimer == "Screening aid only, not a clinical diagnosis"


def test_syllable_tokenizer_bilingual():
    """Verify Malayalam akshara and English syllable segmentation"""
    # Malayalam aksharas
    ml_word = "മലയാളം"
    ml_syllables = SyllableTokenizer.syllabify_word(ml_word, language="ml")
    assert len(ml_syllables) >= 3
    assert "".join(ml_syllables) == ml_word

    # English word
    en_word = "reading"
    en_syllables = SyllableTokenizer.syllabify_word(en_word, language="en")
    assert len(en_syllables) >= 2
    assert "".join(en_syllables).lower() == en_word.lower()


def test_tts_synthesize_endpoint_english():
    """Verify /api/tts/synthesize generates valid audio and word timings for English"""
    payload = {
        "text": "ReadEase cognitive reading assistant",
        "language": "en",
        "rate": 1.0,
        "voice": "natural"
    }
    response = client.post("/api/tts/synthesize", json=payload, headers=AUTH_HEADER)
    assert response.status_code == 200
    data = response.json()
    assert data["audio_format"] == "mp3"
    assert len(data["audio_base64"]) > 50
    assert len(data["word_timings"]) == 4
    assert data["word_timings"][0]["word"] == "ReadEase"
    assert len(data["word_timings"][0]["syllables"]) > 0


def test_tts_synthesize_endpoint_malayalam():
    """Verify /api/tts/synthesize generates valid audio and akshara timings for Malayalam"""
    payload = {
        "text": "റീഡ്ഈസ് വായനാ സഹായി",
        "language": "ml",
        "rate": 1.0,
        "voice": "natural"
    }
    response = client.post("/api/tts/synthesize", json=payload, headers=AUTH_HEADER)
    assert response.status_code == 200
    data = response.json()
    assert data["language"] == "ml"
    assert len(data["audio_base64"]) > 50
    assert len(data["word_timings"]) == 3


def test_tts_audio_caching_layer():
    """Verify subsequent playback requests return cached audio without regeneration"""
    TTSAudioCache.clear()

    unique_passage = f"Cache verification passage at {time.time()}"
    payload = {
        "text": unique_passage,
        "language": "en",
        "rate": 1.0,
        "voice": "natural"
    }

    # First request: Cache MISS
    t0 = time.perf_counter()
    res1 = client.post("/api/tts/synthesize", json=payload, headers=AUTH_HEADER)
    latency1 = (time.perf_counter() - t0) * 1000
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["cached"] is False

    # Second request with identical passage + language + voice: Cache HIT (< 25ms)
    t1 = time.perf_counter()
    res2 = client.post("/api/tts/synthesize", json=payload, headers=AUTH_HEADER)
    latency2 = (time.perf_counter() - t1) * 1000
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["cached"] is True
    assert data2["audio_base64"] == data1["audio_base64"]
    assert latency2 < 50.0  # Instantaneous cache hit!
