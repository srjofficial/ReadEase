from app.routes.health import router as health_router
from app.routes.gaze import router as gaze_router
from app.routes.assessment import router as assessment_router
from app.routes.analysis import router as analysis_router
from app.routes.tts import router as tts_router

__all__ = [
    "health_router",
    "gaze_router",
    "assessment_router",
    "analysis_router",
    "tts_router",
]
