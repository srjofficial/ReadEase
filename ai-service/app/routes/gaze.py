from fastapi import APIRouter, Depends, status
from app.core.security import verify_service_secret
from app.schemas.gaze import FramePayload, GazeMetricsResponse
from app.services.gaze.gaze_service import GazeService

router = APIRouter(
    prefix="/api/gaze",
    tags=["Gaze Estimation"],
    dependencies=[Depends(verify_service_secret)],
)


@router.post(
    "/frame",
    response_model=GazeMetricsResponse,
    status_code=status.HTTP_200_OK,
    summary="Process webcam frame for gaze and reading fixation metrics",
)
async def process_frame(payload: FramePayload) -> GazeMetricsResponse:
    """
    Asynchronous frame processing endpoint.
    Protected by internal shared-secret dependency (Express backend only).
    """
    return await GazeService.process_frame(payload)
