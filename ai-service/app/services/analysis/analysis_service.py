from app.schemas.analysis import SessionAnalysisRequest, ScreeningResponse
from app.services.analysis.scorer import ReadingDifficultyScorer
from app.core.logger import logger


class AnalysisService:
    """
    Reading Difficulty & Saccadic Screening Analyzer Service
    Evaluates session eye-tracking metrics and produces clinical screening indicators.
    """

    @classmethod
    async def analyze_session(cls, request: SessionAnalysisRequest) -> ScreeningResponse:
        logger.info(
            f"Analyzing reading difficulty for student {request.student_id} "
            f"(session: {request.session_id}, lang: {request.language}, words: {request.words_read}, wpm: {request.reading_speed_wpm})"
        )

        response = ReadingDifficultyScorer.evaluate(request)

        logger.info(
            f"Session {request.session_id} screening result: score={response.screening_score}, "
            f"level={response.screening_level}"
        )

        return response
