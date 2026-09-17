import time
import base64
import numpy as np
import cv2
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.services.gaze.metrics_accumulator import SessionMetricsAccumulator
from app.schemas.gaze import GazePoint

client = TestClient(app)

AUTH_HEADER = {"X-Internal-Service-Key": settings.AI_SERVICE_SECRET}


def test_assessment_frame_rejects_unauthorized():
    """Verify POST /api/assessment/frame requires internal service secret"""
    response = client.post("/api/assessment/frame", json={})
    assert response.status_code == 401


def test_assessment_frame_enqueues_immediately():
    """Verify POST /api/assessment/frame enqueues frame and returns 202 immediately"""
    payload = {
        "session_id": "test_queue_session",
        "student_id": "student_abc",
        "frame_index": 1,
        "timestamp_ms": int(time.time() * 1000),
        "client_gaze_point": {
            "x": 0.25,
            "y": 0.30,
            "timestamp_ms": int(time.time() * 1000),
            "confidence": 0.95
        }
    }
    t0 = time.perf_counter()
    response = client.post("/api/assessment/frame", json=payload, headers=AUTH_HEADER)
    latency_ms = (time.perf_counter() - t0) * 1000

    assert response.status_code == 202
    assert latency_ms < 50.0  # Fast non-blocking ingestion
    data = response.json()
    assert data["status"] == "queued"
    assert data["session_id"] == "test_queue_session"
    assert data["frame_index"] == 1
    assert "queue_depth" in data
    assert "current_metrics" in data


def test_fixation_detection_algorithm():
    """Verify I-DT fixation detection increments fixations count and duration"""
    accumulator = SessionMetricsAccumulator("test_fix_sess", "student_1")
    base_time = 10000

    # Feed 10 stationary points over 300ms (above 150ms threshold)
    for i in range(10):
        pt = GazePoint(
            x=0.30 + (i * 0.001),  # tiny jitter well below dispersion 0.06
            y=0.20 + (i * 0.001),
            timestamp_ms=base_time + (i * 30),
            confidence=0.95
        )
        accumulator.process_gaze_point(pt)

    assert accumulator.total_fixations_count == 1
    assert accumulator.total_fixation_duration_ms >= 150


def test_regression_detection_algorithm():
    """Verify backward leftward eye movements trigger regression count"""
    accumulator = SessionMetricsAccumulator("test_reg_sess", "student_2")

    # Point 1: Reading middle of line
    accumulator.process_gaze_point(GazePoint(x=0.50, y=0.30, timestamp_ms=1000, confidence=1.0))

    # Point 2: Saccade forward (reading normally)
    accumulator.process_gaze_point(GazePoint(x=0.58, y=0.30, timestamp_ms=1050, confidence=1.0))
    assert accumulator.total_regressions == 0

    # Point 3: Backward regression (eyes jump back leftward on the same line)
    accumulator.process_gaze_point(GazePoint(x=0.45, y=0.30, timestamp_ms=1100, confidence=1.0))
    assert accumulator.total_regressions == 1


def test_line_return_sweep_not_misclassified_as_regression():
    """Verify return sweep to next line (large leftward jump + downward) is NOT counted as regression"""
    accumulator = SessionMetricsAccumulator("test_sweep_sess", "student_3")

    # Point 1: End of line 1 (far right)
    accumulator.process_gaze_point(GazePoint(x=0.85, y=0.20, timestamp_ms=2000, confidence=1.0))

    # Point 2: Return sweep to start of line 2 (far left, downwards)
    accumulator.process_gaze_point(GazePoint(x=0.15, y=0.28, timestamp_ms=2100, confidence=1.0))

    # Should NOT be counted as regression because it's a legitimate line sweep
    assert accumulator.total_regressions == 0


def test_skipped_words_detection():
    """Verify large forward saccade leap triggers skipped words count"""
    accumulator = SessionMetricsAccumulator("test_skip_sess", "student_4")

    # Point 1: Start of word
    accumulator.process_gaze_point(GazePoint(x=0.20, y=0.40, timestamp_ms=3000, confidence=1.0))

    # Point 2: Abnormally large forward jump (+0.30 horizontal)
    accumulator.process_gaze_point(GazePoint(x=0.55, y=0.40, timestamp_ms=3060, confidence=1.0))

    assert accumulator.total_skipped_words == 1


def test_session_lifecycle_and_background_processing():
    """Integration test: stream multiple frames, query live metrics, and end session"""
    session_id = f"sess_live_{int(time.time())}"
    student_id = "student_live_1"
    base_t = int(time.time() * 1000)

    # Stream 5 frames
    for i in range(5):
        payload = {
            "session_id": session_id,
            "student_id": student_id,
            "frame_index": i,
            "timestamp_ms": base_t + (i * 40),
            "client_gaze_point": {
                "x": 0.20 + (i * 0.05),
                "y": 0.35,
                "timestamp_ms": base_t + (i * 40),
                "confidence": 0.90
            }
        }
        res = client.post("/api/assessment/frame", json=payload, headers=AUTH_HEADER)
        assert res.status_code == 202

    # Allow worker thread to drain queue
    time.sleep(0.1)

    # Query metrics
    res_metrics = client.get(f"/api/assessment/session/{session_id}/metrics", headers=AUTH_HEADER)
    assert res_metrics.status_code == 200
    metrics = res_metrics.json()
    assert metrics["session_id"] == session_id
    assert metrics["student_id"] == student_id
    assert metrics["total_frames_received"] == 5
    assert metrics["total_frames_processed"] >= 1
    assert len(metrics["reading_trajectory"]) >= 1

    # End session
    res_end = client.post(f"/api/assessment/session/{session_id}/end", headers=AUTH_HEADER)
    assert res_end.status_code == 200
    end_data = res_end.json()
    assert end_data["status"] == "completed"
    assert end_data["summary_metrics"]["total_frames_received"] == 5


def test_opencv_base64_image_decoding():
    """Verify OpenCV decoding on synthetic base64 image"""
    from app.services.gaze.estimator import GazeEstimator

    # Create synthetic 100x100 RGB image
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    cv2.circle(img, (50, 50), 20, (255, 255, 255), -1)
    _, buffer = cv2.imencode(".jpg", img)
    b64_str = base64.b64encode(buffer).decode("utf-8")

    decoded = GazeEstimator.decode_image(b64_str)
    assert decoded is not None
    assert decoded.shape == (100, 100, 3)
