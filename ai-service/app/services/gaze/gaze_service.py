from typing import Optional
from app.schemas.gaze import (
    FramePayload,
    FrameEnqueueResponse,
    GazeMetricsResponse,
    SessionMetricsResponse,
    SessionEndResponse,
)
from app.services.gaze.queue_manager import GazeQueueManager
from app.core.logger import logger


class GazeService:
    """
    Computer Vision Gaze Estimation Pipeline with Background Task Queue
    Uses OpenCV + MediaPipe FaceLandmarker for reading eye-tracking and metric accumulation.
    """

    @classmethod
    async def enqueue_frame(cls, payload: FramePayload) -> FrameEnqueueResponse:
        """
        Asynchronously enqueues frame for background processing without blocking the HTTP request.
        """
        return await GazeQueueManager.enqueue_frame(payload)

    @classmethod
    async def process_frame(cls, payload: FramePayload) -> GazeMetricsResponse:
        """
        Synchronous-compatible processing endpoint: enqueues frame and returns running metrics.
        """
        enqueue_res = await GazeQueueManager.enqueue_frame(payload)
        metrics = enqueue_res.current_metrics

        return GazeMetricsResponse(
            session_id=payload.session_id,
            processed_frame_index=payload.frame_index,
            fixation_detected=metrics.total_fixations_count > 0,
            current_fixation_duration_ms=metrics.total_fixation_duration_ms,
            total_regressions=metrics.total_regressions,
            total_skipped_words=metrics.total_skipped_words,
            estimated_screen_x=metrics.current_gaze.x if metrics.current_gaze else None,
            estimated_screen_y=metrics.current_gaze.y if metrics.current_gaze else None,
            status="queued" if enqueue_res.queue_depth > 0 else "processed"
        )

    @classmethod
    async def get_metrics(cls, session_id: str) -> Optional[SessionMetricsResponse]:
        """Fetch real-time accumulated session metrics"""
        return await GazeQueueManager.get_session_metrics(session_id)

    @classmethod
    async def end_session(cls, session_id: str) -> Optional[SessionEndResponse]:
        """Conclude session and return finalized metrics"""
        return await GazeQueueManager.end_session(session_id)
