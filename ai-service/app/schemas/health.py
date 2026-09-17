from pydantic import BaseModel, Field
from typing import Dict, Any


class HealthResponse(BaseModel):
    status: str = Field(default="ok", json_schema_extra={"example": "ok"})
    service: str = Field(default="readease-ai-service", json_schema_extra={"example": "readease-ai-service"})
    version: str = Field(default="1.0.0", json_schema_extra={"example": "1.0.0"})
    timestamp: str
    uptime_seconds: float = Field(default=0.0)
    system: Dict[str, Any] = Field(default_factory=dict)
