import asyncio
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import verify_service_secret
from app.schemas.gaze import (
    FramePayload,
    FrameEnqueueResponse,
    SessionMetricsResponse,
    SessionEndResponse,
    MeshAnalysisRequest,
    FaceMeshAnalysisResult,
    DyslexiaScreeningRequest,
    DyslexiaScreeningResponse,
)
from app.services.gaze.gaze_service import GazeService
from app.services.gaze.estimator import GazeEstimator
from app.services.gaze.queue_manager import GazeQueueManager
from app.services.screening.dyslexia_detector import DyslexiaDetector

router = APIRouter(
    prefix="/api/assessment",
    tags=["Assessment & Gaze Tracking"],
    dependencies=[Depends(verify_service_secret)],
)


@router.post(
    "/screen-dyslexia",
    response_model=DyslexiaScreeningResponse,
    status_code=status.HTTP_200_OK,
    summary="Screen dyslexia risk using Random Forest model trained on DD-main dataset",
)
async def screen_dyslexia(payload: DyslexiaScreeningRequest) -> DyslexiaScreeningResponse:
    """
    Evaluates student session gaze metrics against the scientific DD-main benchmark
    (PLoS ONE 2023, 4,298 subjects), producing risk probability, cohort comparisons,
    and tailored reading accommodation parameters.
    """
    return await asyncio.to_thread(DyslexiaDetector.screen_reading_session, payload)



@router.post(
    "/mesh-analysis",
    response_model=FaceMeshAnalysisResult,
    status_code=status.HTTP_200_OK,
    summary="Direct synchronous OpenCV and 478-point Face Mesh Analysis on frame snapshot",
)
async def analyze_face_mesh(payload: MeshAnalysisRequest) -> FaceMeshAnalysisResult:
    """
    Direct OpenCV + MediaPipe 478-point 3D Face Mesh inference.
    Extracts face oval contours, iris positions, EAR blink metrics, head pose orientation,
    and returns immediate telemetry while updating background session metrics.
    """
    image = await asyncio.to_thread(GazeEstimator.decode_image, payload.image_base64)
    if image is None:
        return FaceMeshAnalysisResult(
            face_detected=False,
            confidence=0.0,
            timestamp_ms=payload.timestamp_ms,
            lighting_quality="unknown"
        )

    mesh_result = await asyncio.to_thread(
        GazeEstimator.analyze_face_mesh, image, payload.timestamp_ms
    )

    # Accumulate metrics into active session if session_id provided
    if payload.session_id and payload.student_id and mesh_result.gaze_point and mesh_result.face_detected:
        try:
            session = await GazeQueueManager.get_or_create_session(
                payload.session_id, payload.student_id
            )
            session.accumulator.process_gaze_point(mesh_result.gaze_point)
        except Exception:
            pass

    return mesh_result


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
