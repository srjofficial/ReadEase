import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)

VALID_SECRET = settings.AI_SERVICE_SECRET
AUTH_HEADER = {"X-Internal-Service-Key": VALID_SECRET}


def test_health_endpoint_public():
    """Verify /health is accessible publicly without auth"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "readease-ai-service"
    assert "uptime_seconds" in data
    assert "system" in data


def test_protected_routes_reject_unauthorized():
    """Verify /api/* endpoints reject requests without internal secret (401)"""
    # Gaze without auth
    res_gaze = client.post("/api/gaze/frame", json={})
    assert res_gaze.status_code == 401

    # Analysis without auth
    res_analysis = client.post("/api/analysis/screening", json={})
    assert res_analysis.status_code == 401

    # TTS without auth
    res_tts = client.post("/api/tts/synthesize", json={})
    assert res_tts.status_code == 401


def test_protected_routes_reject_invalid_secret():
    """Verify /api/* endpoints reject requests with wrong secret (403)"""
    headers = {"X-Internal-Service-Key": "wrong-secret-key"}
    payload = {
        "session_id": "test_session",
        "student_id": "student_123",
        "frame_index": 1,
        "timestamp_ms": 1000,
        "image_base64": "dGVzdA=="
    }
    response = client.post("/api/gaze/frame", json=payload, headers=headers)
    assert response.status_code == 403
    assert "Caller is not an authorized ReadEase backend service" in response.json()["detail"]


def test_gaze_frame_endpoint_success():
    """Verify /api/gaze/frame processes frame with valid credentials"""
    payload = {
        "session_id": "sess_123",
        "student_id": "student_123",
        "frame_index": 42,
        "timestamp_ms": 1250,
        "image_base64": "aGVsbG93b3JsZA=="
    }
    response = client.post("/api/gaze/frame", json=payload, headers=AUTH_HEADER)
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == "sess_123"
    assert data["processed_frame_index"] == 42
    assert isinstance(data["fixation_detected"], bool)
    assert "total_regressions" in data


def test_analysis_screening_success():
    """Verify /api/analysis/screening evaluates session metrics and includes clinical disclaimer"""
    payload = {
        "session_id": "sess_456",
        "student_id": "student_789",
        "language": "en",
        "duration_seconds": 120,
        "words_read": 180,
        "reading_speed_wpm": 90.0,
        "fixation_count": 45,
        "regression_count": 8,
        "skipped_words_count": 3,
        "accuracy_percentage": 88.5
    }
    response = client.post("/api/analysis/screening", json=payload, headers=AUTH_HEADER)
    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == "sess_456"
    assert data["student_id"] == "student_789"
    assert data["screening_level"] in ["low", "medium", "high"]
    assert data["disclaimer"] == "Screening aid only, not a clinical diagnosis"
    assert len(data["recommendations"]) > 0


def test_tts_synthesize_success():
    """Verify /api/tts/synthesize produces word-level timings and audio"""
    payload = {
        "text": "Hello world this is a reading test",
        "language": "en",
        "rate": 1.0,
        "pitch": 1.0
    }
    response = client.post("/api/tts/synthesize", json=payload, headers=AUTH_HEADER)
    assert response.status_code == 200
    data = response.json()
    assert data["audio_format"] == "mp3"
    assert len(data["word_timings"]) == 7
    assert data["word_timings"][0]["word"] == "Hello"
    assert data["word_timings"][1]["word"] == "world"


def test_bearer_authorization_header():
    """Verify Authorization: Bearer <secret> works as well as X-Internal-Service-Key"""
    headers = {"Authorization": f"Bearer {VALID_SECRET}"}
    payload = {
        "text": "Reading assistant",
        "language": "en"
    }
    response = client.post("/api/tts/synthesize", json=payload, headers=headers)
    assert response.status_code == 200


def test_cors_restricted_to_express_origin():
    """Verify CORS headers are returned ONLY for Express backend origin, not random browser origins"""
    # Express origin should be allowed
    res_allowed = client.options(
        "/api/gaze/frame",
        headers={
            "Origin": "http://localhost:5000",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "X-Internal-Service-Key,Content-Type",
        },
    )
    assert res_allowed.headers.get("access-control-allow-origin") == "http://localhost:5000"

    # Browser origin (e.g. localhost:5173 or untrusted domain) should NOT receive access-control-allow-origin
    res_blocked = client.options(
        "/api/gaze/frame",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert "access-control-allow-origin" not in res_blocked.headers

