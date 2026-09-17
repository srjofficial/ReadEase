import time
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logger import logger
from app.routes import (
    health_router,
    gaze_router,
    assessment_router,
    analysis_router,
    tts_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application Lifespan Events
    """
    logger.info(
        f"ReadEase AI Microservice starting on {settings.AI_HOST}:{settings.AI_PORT} "
        f"[CORS restricted to: {settings.cors_origins}]"
    )
    yield
    logger.info("ReadEase AI Microservice shutting down gracefully.")


app = FastAPI(
    title="ReadEase AI & Inference Microservice",
    description="Microservice providing gaze tracking analysis, reading screening metrics, and bilingual TTS.",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS Configuration: Restricted to Express backend origin ONLY
# Never called directly from the public browser
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Internal-Service-Key"],
)


# ---------------------------------------------------------------------------
# Structured Request Logging Middleware
# ---------------------------------------------------------------------------
@app.middleware("http")
async def structured_logging_middleware(request: Request, call_next):
    request_id = str(uuid.uuid4())
    start_time = time.perf_counter()

    # Extra attributes for structured JSON logging
    extra = {
        "request_id": request_id,
        "method": request.method,
        "path": request.url.path,
    }

    try:
        response = await call_next(request)
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        extra["status_code"] = response.status_code
        extra["duration_ms"] = duration_ms

        # Structured log record
        logger.info(
            f"{request.method} {request.url.path} responded {response.status_code} in {duration_ms}ms",
            extra=extra,
        )
        response.headers["X-Request-ID"] = request_id
        return response
    except Exception as exc:
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        extra["status_code"] = 500
        extra["duration_ms"] = duration_ms
        logger.error(
            f"Unhandled exception during {request.method} {request.url.path}: {str(exc)}",
            exc_info=True,
            extra=extra,
        )
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": "Internal Server Error",
                "message": "An internal error occurred in the AI microservice.",
                "request_id": request_id,
            },
        )


# ---------------------------------------------------------------------------
# Route Registration
# ---------------------------------------------------------------------------
# Public Health endpoint for container orchestrators & load balancers
app.include_router(health_router)

# Protected inference endpoints (requires shared secret / internal auth)
app.include_router(assessment_router)
app.include_router(gaze_router)
app.include_router(analysis_router)
app.include_router(tts_router)


@app.get("/", tags=["Root"])
async def root():
    return {
        "service": "readease-ai-service",
        "status": "online",
        "health": "/health",
        "authorized_access_only": True,
    }
