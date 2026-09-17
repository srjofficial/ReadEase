import time
import platform
from datetime import datetime, timezone
from fastapi import APIRouter
from app.schemas.health import HealthResponse

router = APIRouter(tags=["System"])

START_TIME = time.time()


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Public Health & Observability Check
    Directly accessible without internal service keys for container orchestrators and load balancers.
    """
    uptime = time.time() - START_TIME

    return HealthResponse(
        status="ok",
        service="readease-ai-service",
        version="1.0.0",
        timestamp=datetime.now(timezone.utc).isoformat(),
        uptime_seconds=round(uptime, 2),
        system={
            "python_version": platform.python_version(),
            "platform": platform.platform(),
            "architecture": platform.machine(),
        }
    )
