from typing import List, Tuple
from app.schemas.analysis import SessionAnalysisRequest, ScreeningResponse


class ReadingDifficultyScorer:
    """
    Evidence-based Reading Difficulty & Saccadic Screening Analyzer.
    Evaluates words-per-minute deficits, regression density, fixation strain,
    and decoding accuracy to compute a clinical screening indicator.
    """

    MANDATORY_DISCLAIMER = "Screening aid only, not a clinical diagnosis"

    @classmethod
    def evaluate(cls, request: SessionAnalysisRequest) -> ScreeningResponse:
        # 1. Fluency Baseline by Language
        # Malayalam is highly agglutinative; baseline WPM is naturally lower than English
        target_wpm = 95.0 if request.language == "ml" else 120.0
        speed_deficit = max(0.0, (target_wpm - request.reading_speed_wpm) / target_wpm) * 100.0

        # 2. Regression Density (backward saccades per word)
        words_read = max(1, request.words_read)
        reg_rate = request.regression_count / words_read
        # Normal reading reg_rate ~ 0.08-0.12. Elevated is > 0.20
        regression_score = min(100.0, (reg_rate / 0.22) * 100.0)

        # 3. Estimated Fixation Strain
        fixation_count = max(1, request.fixation_count)
        # Approximate average fixation duration if not directly given
        avg_fixation_ms = (request.duration_seconds * 1000 * 0.65) / fixation_count
        fixation_strain = min(100.0, max(0.0, (avg_fixation_ms - 220.0) / 180.0) * 100.0)

        # 4. Skipped Words Density
        skip_rate = request.skipped_words_count / words_read
        skip_score = min(100.0, (skip_rate / 0.08) * 100.0)

        # 5. Accuracy Deficit
        accuracy_deficit = max(0.0, (100.0 - request.accuracy_percentage) * 2.0)

        # Weighted Composite Difficulty Score (0.0 to 100.0)
        composite = (
            (speed_deficit * 0.30)
            + (regression_score * 0.25)
            + (fixation_strain * 0.20)
            + (skip_score * 0.15)
            + (accuracy_deficit * 0.10)
        )
        score = round(max(0.0, min(100.0, composite)), 1)

        # Classification
        if score < 35.0:
            level = "low"
        elif score < 70.0:
            level = "medium"
        else:
            level = "high"

        # Formulate Observations
        observations: List[str] = [
            f"Reading rate recorded at {request.reading_speed_wpm:.1f} WPM ({'at or above' if speed_deficit == 0 else f'{speed_deficit:.0f}% below'} expected {target_wpm:.0f} WPM baseline).",
            f"Observed {request.regression_count} backward regressions ({reg_rate * 100:.1f}% regression rate per word).",
            f"Decoding accuracy maintained at {request.accuracy_percentage:.1f}% with {request.skipped_words_count} skipped words."
        ]

        if avg_fixation_ms > 320.0:
            observations.append(
                f"Elevated fixation duration (~{avg_fixation_ms:.0f}ms per fixation) indicates phonological decoding strain."
            )

        # Formulate Targeted Accommodation Recommendations
        recommendations: List[str] = []
        if level in ["medium", "high"] or reg_rate > 0.15:
            recommendations.append(
                "Enable the digital reading ruler (optical guide) to stabilize horizontal line-tracking and reduce backward saccades."
            )

        if speed_deficit > 25.0 or avg_fixation_ms > 300.0:
            recommendations.append(
                "Activate Bionic Reading fixation bolding at 50% strength to reduce cognitive eye strain."
            )

        if request.language == "ml":
            recommendations.append(
                "Enable Malayalam phonemic syllable breakdown with synchronized text-to-speech audio narration."
            )
        else:
            recommendations.append(
                "Enable synchronized bilingual text-to-speech audio with word highlighting for multi-sensory reading."
            )

        recommendations.append(
            "Use Lexend or OpenDyslexic typography at 1.75 line-height on a low-glare warm cream background (#FAF7F2)."
        )

        summary = (
            f"Reading session completed with {score}% difficulty risk index ({level.upper()} difficulty). "
            f"Student achieved {request.accuracy_percentage}% accuracy at {request.reading_speed_wpm:.1f} WPM."
        )

        return ScreeningResponse(
            session_id=request.session_id,
            student_id=request.student_id,
            screening_score=score,
            screening_level=level,
            summary=summary,
            observations=observations,
            recommendations=recommendations,
            disclaimer=cls.MANDATORY_DISCLAIMER
        )
