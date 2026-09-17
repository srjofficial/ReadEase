from fastapi import APIRouter, Depends, status
from app.core.security import verify_service_secret
from app.schemas.tts import TTSRequest, TTSResponse
from app.services.tts.tts_service import TTSService

router = APIRouter(
    prefix="/api/tts",
    tags=["Text-To-Speech"],
    dependencies=[Depends(verify_service_secret)],
)


@router.post(
    "/synthesize",
    response_model=TTSResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate speech audio with synchronized syllable and word timings",
)
async def synthesize_speech(request: TTSRequest) -> TTSResponse:
    """
    Asynchronous bilingual text-to-speech synthesis (Malayalam + English).
    Generates word-level timing metadata for synchronized frontend reader highlighting.
    """
    return await TTSService.synthesize(request)
