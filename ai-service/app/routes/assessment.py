from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import verify_service_secret
from app.schemas.gaze import (
    FramePayload,
    FrameEnqueueResponse,
    SessionMetricsResponse,
    SessionEndResponse,
)
from app.services.gaze.gaze_service import GazeService

router = APIRouter(
    prefix="/api/assessment",
    tags=["Assessment & Gaze Tracking"],
    dependencies=[Depends(verify_service_secret)],
)


@router.post(
    "/frame",
    response_model=FrameEnqueueResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Accept webcam frame snapshot into background processing queue",
)
async def submit_frame(payload: FramePayload) -> FrameEnqueueResponse:
    """
    Decoupled Frame Ingestion Endpoint.
    Frames are placed into an in-memory background task queue (asyncio.Queue)
    so the HTTP request cycle returns immediately (< 5ms) without blocking
    under heavy CPU/CV inference load.
    """
    return await GazeService.enqueue_frame(payload)


@router.get(
    "/session/{session_id}/metrics",
    response_model=SessionMetricsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get real-time accumulated session metrics (fixations, regressions, skipped words)",
)
async def get_session_metrics(session_id: str) -> SessionMetricsResponse:
    """
    Reports live reading metrics accumulated across background-processed frames.
    """
    metrics = await GazeService.get_metrics(session_id)
    if not metrics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Active assessment session '{session_id}' not found.",
        )
    return metrics


@router.post(
    "/session/{session_id}/end",
    response_model=SessionEndResponse,
    status_code=status.HTTP_200_OK,
    summary="Conclude assessment session and return finalized reading metrics",
)
async def end_session(session_id: str) -> SessionEndResponse:
    """
    Concludes reading session, drains queued frames, and returns final metrics.
    """
    end_res = await GazeService.end_session(session_id)
    if not end_res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment session '{session_id}' not found or already closed.",
        )
    return end_res


@router.get(
    "/session/{session_id}/status",
    status_code=status.HTTP_200_OK,
    summary="Probe background worker and queue status for session",
)
async def get_session_status(session_id: str):
    """
    Lightweight probe for monitoring worker task status and queue backlog.
    """
    metrics = await GazeService.get_metrics(session_id)
    if not metrics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{session_id}' not found.",
        )
    return {
        "session_id": session_id,
        "status": metrics.status,
        "queue_depth": metrics.queue_depth,
        "frames_received": metrics.total_frames_received,
        "frames_processed": metrics.total_frames_processed,
    }
