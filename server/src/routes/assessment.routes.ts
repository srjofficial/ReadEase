import { Router, Request, Response } from 'express';
import { AssessmentService } from '../services/assessment/assessment.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/v1/assessment/mesh-analysis
 * Direct synchronous OpenCV and 478-point Face Mesh Analysis
 */
router.post('/mesh-analysis', async (req: Request, res: Response) => {
  try {
    const { image_base64, timestamp_ms, session_id, student_id } = req.body;

    if (!image_base64) {
      res.status(400).json({
        success: false,
        error: { message: 'Missing required image_base64 in request body' }
      });
      return;
    }

    const result = await AssessmentService.analyzeFaceMesh({
      image_base64,
      timestamp_ms: timestamp_ms || Date.now(),
      session_id,
      student_id
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error({ err: error }, 'Error in assessment /mesh-analysis endpoint');
    res.status(500).json({
      success: false,
      error: { message: 'Failed to process face mesh analysis' }
    });
  }
});

/**
 * POST /api/v1/assessment/screen-dyslexia
 * Evaluate student reading metrics against DD-main scientific benchmark
 */
router.post('/screen-dyslexia', async (req: Request, res: Response) => {
  try {
    const {
      session_id,
      student_id,
      fixation_durations,
      regressions_count,
      total_words,
      reading_time_sec,
      saccade_lengths,
      wpm,
      age,
      voice_wpm,
      voice_fluency_score,
      voice_hesitation_count,
      voice_transcript,
      accuracy_percentage
    } = req.body;

    const result = await AssessmentService.screenDyslexia({
      session_id,
      student_id,
      fixation_durations: fixation_durations || [],
      regressions_count: regressions_count || 0,
      total_words: total_words || 100,
      reading_time_sec: reading_time_sec || 60,
      saccade_lengths,
      wpm,
      age,
      voice_wpm,
      voice_fluency_score,
      voice_hesitation_count,
      voice_transcript,
      accuracy_percentage
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error({ err: error }, 'Error in /screen-dyslexia endpoint');
    res.status(500).json({
      success: false,
      error: { message: 'Failed to complete dyslexia screening' }
    });
  }
});

/**
 * GET /api/v1/assessment/student/:studentId/longitudinal
 * Aggregate longitudinal multi-session telemetry across past reading trials
 */
router.get('/student/:studentId/longitudinal', async (req: Request, res: Response) => {
  try {
    const { studentId } = req.params;
    const aggregate = await AssessmentService.getMultiSessionAggregate(studentId);

    res.status(200).json({
      success: true,
      data: aggregate
    });
  } catch (error) {
    logger.error({ err: error }, 'Error in /student/:studentId/longitudinal endpoint');
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve longitudinal multi-session aggregate' }
    });
  }
});

/**
 * POST /api/v1/assessment/frame
 * Enqueue webcam frame snapshot into AI background pipeline
 */
router.post('/frame', async (req: Request, res: Response) => {
  try {
    const { session_id, student_id, frame_index, timestamp_ms, image_base64, client_gaze_point } =
      req.body;

    if (!session_id || !student_id) {
      res.status(400).json({
        success: false,
        error: { message: 'session_id and student_id are required' }
      });
      return;
    }

    const result = await AssessmentService.forwardFrame({
      session_id,
      student_id,
      frame_index: frame_index ?? 0,
      timestamp_ms: timestamp_ms ?? Date.now(),
      image_base64,
      client_gaze_point
    });

    res.status(202).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error({ err: error }, 'Error in assessment /frame endpoint');
    res.status(500).json({
      success: false,
      error: { message: 'Failed to ingest assessment frame' }
    });
  }
});

/**
 * GET /api/v1/assessment/session/:sessionId/metrics
 * Retrieve live reading metrics accumulated across frames
 */
router.get('/session/:sessionId/metrics', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const metrics = await AssessmentService.getSessionMetrics(sessionId);

    if (!metrics) {
      res.status(404).json({
        success: false,
        error: { message: `Session '${sessionId}' not found or inactive` }
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching session metrics');
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve session metrics' }
    });
  }
});

/**
 * POST /api/v1/assessment/session/:sessionId/end
 * Concludes the reading assessment session and returns finalized report
 */
router.post('/session/:sessionId/end', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const result = await AssessmentService.endSession(sessionId);

    if (!result) {
      res.status(404).json({
        success: false,
        error: { message: `Session '${sessionId}' could not be finalized` }
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error({ err: error }, 'Error ending session');
    res.status(500).json({
      success: false,
      error: { message: 'Failed to end assessment session' }
    });
  }
});

/**
 * POST /api/v1/assessment/save-session
 * Permanently saves an evaluated reading assessment record into MongoDB,
 * linking to the student's assigned Teacher and updating their accommodation profile.
 */
router.post('/save-session', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    const result = await AssessmentService.saveAssessmentSession(payload);

    res.status(201).json({
      success: true,
      message: 'Reading assessment session recorded successfully',
      data: result
    });
  } catch (error) {
    logger.error({ err: error }, 'Error saving assessment session to database');
    res.status(500).json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Failed to save reading assessment'
      }
    });
  }
});

export const assessmentRoutes = router;
