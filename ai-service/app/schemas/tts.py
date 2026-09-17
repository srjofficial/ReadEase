from pydantic import BaseModel, Field
from typing import List, Optional, Literal


class WordTiming(BaseModel):
    word: str
    start_ms: int
    end_ms: int
    syllables: List[str] = Field(default_factory=list)


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Passage or word text to synthesize")
    language: Literal["en", "ml"] = Field(default="en", description="Target speech language")
    voice: Optional[str] = Field(default="natural", description="Voice identifier")
    rate: float = Field(default=1.0, ge=0.5, le=2.0, description="Speech rate multiplier")
    pitch: float = Field(default=1.0, ge=0.5, le=2.0, description="Speech pitch multiplier")


class TTSResponse(BaseModel):
    audio_base64: str = Field(..., description="Base64 encoded audio stream")
    audio_format: str = Field(default="mp3")
    duration_ms: int
    language: str
    word_timings: List[WordTiming] = Field(default_factory=list)
    cached: bool = False
