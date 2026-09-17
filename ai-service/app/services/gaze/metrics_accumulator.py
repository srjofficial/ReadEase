import math
from typing import Optional, List
from app.schemas.gaze import GazePoint, FixationEvent, SessionMetricsSnapshot, SessionMetricsResponse


class SessionMetricsAccumulator:
    """
    Accumulates real-time reading gaze metrics across sequential frames.
    Detects fixations (I-DT algorithm), backward regressions, and skipped words/lines.
    """

    # Algorithmic thresholds (in normalized screen coordinates 0.0 - 1.0)
    DISPERSION_THRESHOLD = 0.06        # Max spatial distance to stay in same fixation
    MIN_FIXATION_DURATION_MS = 150     # Min duration to count as reading fixation
    REGRESSION_DX_THRESHOLD = -0.05    # Leftward movement threshold for regression
    LINE_SWEEP_DX_THRESHOLD = -0.28    # Large leftward sweep for new line
    LINE_SWEEP_DY_THRESHOLD = 0.02     # Downward movement threshold for new line
    FORWARD_SKIP_DX_THRESHOLD = 0.22   # Abnormally large forward leap
    MULTI_LINE_SKIP_DY_THRESHOLD = 0.08 # Jumping ahead across multiple lines

    def __init__(self, session_id: str, student_id: str):
        self.session_id = session_id
        self.student_id = student_id
        self.status: str = "active"

        # Frame counters
        self.total_frames_received: int = 0
        self.total_frames_processed: int = 0

        # Current fixation state
        self.current_fixation_start_ms: Optional[int] = None
        self.current_fixation_last_ms: Optional[int] = None
        self.current_fixation_cx: float = 0.0
        self.current_fixation_cy: float = 0.0
        self.current_fixation_points_count: int = 0
        self.current_fixation_counted: bool = False

        # Accumulated metrics
        self.total_fixations_count: int = 0
        self.total_fixation_duration_ms: int = 0
        self.total_regressions: int = 0
        self.total_skipped_words: int = 0

        # Trajectory & Fixations history
        self.current_gaze: Optional[GazePoint] = None
        self.last_gaze: Optional[GazePoint] = None
        self.recent_fixations: List[FixationEvent] = []
        self.reading_trajectory: List[GazePoint] = []

    def process_gaze_point(self, gaze: GazePoint) -> None:
        """Process a single gaze point and update fixation/saccade metrics"""
        self.total_frames_processed += 1
        self.current_gaze = gaze

        # Add to trajectory (keep last 100 points)
        self.reading_trajectory.append(gaze)
        if len(self.reading_trajectory) > 100:
            self.reading_trajectory.pop(0)

        # 1. Evaluate Saccadic Eye Movement (Regression & Skip Detection)
        if self.last_gaze is not None:
            dx = gaze.x - self.last_gaze.x
            dy = gaze.y - self.last_gaze.y

            # Check for return sweep to next line
            # (leftward jump dx < -0.28 AND downward dy > 0.02)
            is_line_sweep = (dx <= self.LINE_SWEEP_DX_THRESHOLD) and (dy >= self.LINE_SWEEP_DY_THRESHOLD)

            if not is_line_sweep:
                # Backward regression: moving leftward within the line or jumping up to previous line
                if (dx <= self.REGRESSION_DX_THRESHOLD and abs(dy) < 0.05) or (dy < -0.04):
                    self.total_regressions += 1

                # Forward skip: jumping forward unusually fast or skipping lines ahead
                elif (dx >= self.FORWARD_SKIP_DX_THRESHOLD and abs(dy) < 0.04) or (dy >= self.MULTI_LINE_SKIP_DY_THRESHOLD):
                    self.total_skipped_words += 1

        # 2. Evaluate Fixation via Dispersion-Threshold Identification (I-DT)
        if self.current_fixation_start_ms is None:
            # Start new fixation candidate
            self._start_fixation(gaze)
        else:
            # Check dispersion from current fixation centroid
            dist = math.hypot(gaze.x - self.current_fixation_cx, gaze.y - self.current_fixation_cy)
            if dist <= self.DISPERSION_THRESHOLD:
                # Continues current fixation candidate
                self.current_fixation_points_count += 1
                # Moving centroid average
                self.current_fixation_cx = (self.current_fixation_cx * (self.current_fixation_points_count - 1) + gaze.x) / self.current_fixation_points_count
                self.current_fixation_cy = (self.current_fixation_cy * (self.current_fixation_points_count - 1) + gaze.y) / self.current_fixation_points_count
                self.current_fixation_last_ms = gaze.timestamp_ms

                duration = self.current_fixation_last_ms - self.current_fixation_start_ms
                if duration >= self.MIN_FIXATION_DURATION_MS and not self.current_fixation_counted:
                    # Threshold reached, count fixation
                    self.total_fixations_count += 1
                    self.current_fixation_counted = True
                    self.total_fixation_duration_ms += duration
                elif self.current_fixation_counted:
                    # Increment duration
                    frame_delta = max(0, gaze.timestamp_ms - (self.last_gaze.timestamp_ms if self.last_gaze else gaze.timestamp_ms))
                    self.total_fixation_duration_ms += frame_delta
            else:
                # Exceeded dispersion threshold: close previous fixation candidate and start new
                self._close_fixation()
                self._start_fixation(gaze)

        self.last_gaze = gaze

    def _start_fixation(self, gaze: GazePoint) -> None:
        self.current_fixation_start_ms = gaze.timestamp_ms
        self.current_fixation_last_ms = gaze.timestamp_ms
        self.current_fixation_cx = gaze.x
        self.current_fixation_cy = gaze.y
        self.current_fixation_points_count = 1
        self.current_fixation_counted = False

    def _close_fixation(self) -> None:
        if self.current_fixation_start_ms is not None and self.current_fixation_last_ms is not None:
            duration = self.current_fixation_last_ms - self.current_fixation_start_ms
            if duration >= self.MIN_FIXATION_DURATION_MS:
                event = FixationEvent(
                    start_ms=self.current_fixation_start_ms,
                    end_ms=self.current_fixation_last_ms,
                    duration_ms=duration,
                    centroid_x=round(self.current_fixation_cx, 4),
                    centroid_y=round(self.current_fixation_cy, 4)
                )
                self.recent_fixations.append(event)
                if len(self.recent_fixations) > 50:
                    self.recent_fixations.pop(0)

        self.current_fixation_start_ms = None
        self.current_fixation_last_ms = None
        self.current_fixation_counted = False

    def get_snapshot(self, queue_depth: int = 0) -> SessionMetricsSnapshot:
        """Lightweight snapshot for fast response returns"""
        return SessionMetricsSnapshot(
            total_frames_received=self.total_frames_received,
            total_frames_processed=self.total_frames_processed,
            queue_depth=queue_depth,
            total_fixations_count=self.total_fixations_count,
            total_fixation_duration_ms=self.total_fixation_duration_ms,
            total_regressions=self.total_regressions,
            total_skipped_words=self.total_skipped_words,
            current_gaze=self.current_gaze
        )

    def get_full_metrics(self, queue_depth: int = 0) -> SessionMetricsResponse:
        """Full metrics response for analytics and reporting"""
        return SessionMetricsResponse(
            session_id=self.session_id,
            student_id=self.student_id,
            status="completed" if self.status == "completed" else "active",
            total_frames_received=self.total_frames_received,
            total_frames_processed=self.total_frames_processed,
            queue_depth=queue_depth,
            total_fixations_count=self.total_fixations_count,
            total_fixation_duration_ms=self.total_fixation_duration_ms,
            total_regressions=self.total_regressions,
            total_skipped_words=self.total_skipped_words,
            current_gaze=self.current_gaze,
            recent_fixations=list(self.recent_fixations),
            reading_trajectory=list(self.reading_trajectory)
        )
