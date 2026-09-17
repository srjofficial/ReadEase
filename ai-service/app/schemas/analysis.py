from pydantic import BaseModel, Field
from typing import List, Literal


class SessionAnalysisRequest(BaseModel):
    session_id: str = Field(..., description="Unique reading session ID")
    student_id: str = Field(..., description="Student ID")
    language: Literal["en", "ml"] = Field(default="en", description="Passage language")
    duration_seconds: int = Field(..., ge=1, description="Total active reading duration")
    words_read: int = Field(..., ge=0, description="Total words read")
    reading_speed_wpm: float = Field(..., ge=0, description="Reading speed words per minute")
    fixation_count: int = Field(default=0, ge=0)
    regression_count: int = Field(default=0, ge=0)
    skipped_words_count: int = Field(default=0, ge=0)
    accuracy_percentage: float = Field(default=100.0, ge=0.0, le=100.0)


class ScreeningResponse(BaseModel):
    session_id: str
    student_id: str
    screening_score: float = Field(..., ge=0.0, le=100.0, description="Composite screening risk score")
    screening_level: Literal["low", "medium", "high"] = Field(..., description="Screening classification indicator")
    summary: str
    observations: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    disclaimer: str = Field(
        default="Screening aid only, not a clinical diagnosis",
        description="Mandatory clinical screening disclaimer"
    )
