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


class Point2D(BaseModel):
    x: float = Field(..., description="Normalized X coordinate (0.0 to 1.0)")
    y: float = Field(..., description="Normalized Y coordinate (0.0 to 1.0)")


class HeadPose(BaseModel):
    pitch: float = Field(default=0.0, description="Nodding up/down in degrees")
    yaw: float = Field(default=0.0, description="Turning left/right in degrees")
    roll: float = Field(default=0.0, description="Tilting left/right in degrees")
    alignment: Literal["centered", "tilted_left", "tilted_right", "looking_down", "looking_up"] = "centered"


class EyeLandmarks(BaseModel):
    contour: List[Point2D] = Field(default_factory=list, description="Eye socket boundary points")
    iris_center: Point2D
    iris_points: List[Point2D] = Field(default_factory=list, description="Iris boundary points")
    ear: float = Field(..., description="Eye Aspect Ratio (EAR)")
    is_blinking: bool = Field(default=False, description="True if EAR falls below blink threshold")
    pupil_ratio_x: float = Field(default=0.5, description="Relative horizontal position in eye (0 to 1)")
    pupil_ratio_y: float = Field(default=0.5, description="Relative vertical position in eye (0 to 1)")


class FaceMeshAnalysisResult(BaseModel):
    face_detected: bool = Field(..., description="Whether a face was detected in the frame")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    timestamp_ms: int
    face_oval: List[Point2D] = Field(default_factory=list, description="Outer contour of the face oval")
    left_eye: Optional[EyeLandmarks] = None
    right_eye: Optional[EyeLandmarks] = None
    head_pose: HeadPose = Field(default_factory=HeadPose)
    gaze_point: Optional[GazePoint] = None
    lighting_quality: Literal["optimal", "dim", "harsh", "unknown"] = "optimal"
    distance_warning: Optional[str] = None
    mesh_triangles_sample: Optional[List[List[Point2D]]] = Field(
        default=None, description="Key sample triangles for wireframe rendering"
    )


class MeshAnalysisRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded JPEG/PNG frame snapshot")
    timestamp_ms: int = Field(..., description="Client epoch timestamp in ms")
    session_id: Optional[str] = Field(None, description="Optional reading assessment session ID")
    student_id: Optional[str] = Field(None, description="Optional student ID")


class BiomarkerMetric(BaseModel):
    name: str
    value: float
    unit: str
    control_mean: float
    dyslexia_mean: float
    status: Literal["normal", "borderline", "atypical"]
    percentile: float


class BiomarkerComparison(BaseModel):
    fixation_duration: BiomarkerMetric
    fixations_per_100_words: BiomarkerMetric
    regression_rate: BiomarkerMetric
    saccade_length: BiomarkerMetric
    gaze_stability: BiomarkerMetric


class ClinicalIndicator(BaseModel):
    title: str
    severity: Literal["low", "moderate", "high"]
    observation: str
    recommendation: str


class DyslexiaScreeningRequest(BaseModel):
    session_id: Optional[str] = None
    student_id: Optional[str] = None
    fixation_durations: List[float] = Field(..., description="List of fixation durations in ms")
    regressions_count: int = Field(default=0, ge=0)
    total_words: int = Field(default=100, ge=1)
    reading_time_sec: float = Field(default=60.0, ge=1.0)
    saccade_lengths: Optional[List[float]] = None
    wpm: Optional[int] = None
    age: Optional[int] = None


class DyslexiaScreeningResponse(BaseModel):
    session_id: Optional[str] = None
    student_id: Optional[str] = None
    risk_level: Literal["Low Risk", "Moderate Risk", "Elevated Risk"]
    dyslexia_probability: float = Field(..., ge=0.0, le=100.0, description="Predicted probability (0 to 100%)")
    confidence_score: float = Field(..., ge=0.0, le=100.0, description="Model confidence score")
    summary: str
    biomarkers: BiomarkerComparison
    clinical_indicators: List[ClinicalIndicator]
    recommended_accommodations: Dict[str, Any]
    model_metadata: Dict[str, Any]


