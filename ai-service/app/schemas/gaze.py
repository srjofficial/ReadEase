from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Literal


class GazePoint(BaseModel):
    x: float = Field(..., description="Normalized screen X coordinate (0.0 to 1.0)")
    y: float = Field(..., description="Normalized screen Y coordinate (0.0 to 1.0)")
    timestamp_ms: int = Field(..., description="Client epoch timestamp in milliseconds")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Confidence score (0.0 to 1.0)")


class FramePayload(BaseModel):
    session_id: str = Field(..., description="Unique reading session ID")
    student_id: str = Field(..., description="Student ID")
    frame_index: int = Field(..., ge=0, description="Sequential frame index")
    timestamp_ms: int = Field(..., description="Epoch timestamp of capture")
    image_base64: Optional[str] = Field(None, description="Base64 encoded JPEG/PNG webcam frame")
    client_gaze_point: Optional[GazePoint] = Field(None, description="Pre-computed client point if available")


class FixationEvent(BaseModel):
    start_ms: int
    end_ms: int
    duration_ms: int
    centroid_x: float
    centroid_y: float


class SessionMetricsSnapshot(BaseModel):
    total_frames_received: int = 0
    total_frames_processed: int = 0
    queue_depth: int = 0
    total_fixations_count: int = 0
    total_fixation_duration_ms: int = 0
    total_regressions: int = 0
    total_skipped_words: int = 0
    current_gaze: Optional[GazePoint] = None


class FrameEnqueueResponse(BaseModel):
    status: Literal["queued", "processed", "dropped"] = "queued"
    session_id: str
    frame_index: int
    queue_depth: int
    timestamp_ms: int
    current_metrics: SessionMetricsSnapshot


class SessionMetricsResponse(BaseModel):
    session_id: str
    student_id: str
    status: Literal["active", "idle", "completed"] = "active"
    total_frames_received: int
    total_frames_processed: int
    queue_depth: int
    total_fixations_count: int
    total_fixation_duration_ms: int
    total_regressions: int
    total_skipped_words: int
    current_gaze: Optional[GazePoint] = None
    recent_fixations: List[FixationEvent] = Field(default_factory=list)
    reading_trajectory: List[GazePoint] = Field(default_factory=list)


class SessionEndResponse(BaseModel):
    status: Literal["completed"] = "completed"
    session_id: str
    student_id: str
    summary_metrics: SessionMetricsResponse


# Backward-compatible response model for direct sync invocation
class GazeMetricsResponse(BaseModel):
    session_id: str
    processed_frame_index: int
    fixation_detected: bool = False
    current_fixation_duration_ms: int = 0
    total_regressions: int = 0
    total_skipped_words: int = 0
    estimated_screen_x: Optional[float] = None
    estimated_screen_y: Optional[float] = None
    status: str = "processed"
