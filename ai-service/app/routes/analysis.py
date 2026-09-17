from fastapi import APIRouter, Depends, status
from app.core.security import verify_service_secret
from app.schemas.analysis import SessionAnalysisRequest, ScreeningResponse
from app.services.analysis.analysis_service import AnalysisService

router = APIRouter(
    prefix="/api/analysis",
    tags=["Reading Analysis"],
    dependencies=[Depends(verify_service_secret)],
)


@router.post(
    "/screening",
    response_model=ScreeningResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate reading session metrics and produce difficulty screening indicator",
)
async def analyze_session(request: SessionAnalysisRequest) -> ScreeningResponse:
    """
    Asynchronous reading difficulty screening analysis.
    Evaluates fixations, regressions, and words-per-minute with mandatory screening disclaimer.
    """
    return await AnalysisService.analyze_session(request)
