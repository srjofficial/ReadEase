import asyncio
import time
from typing import Dict, Optional
from app.schemas.gaze import (
    FramePayload,
    GazePoint,
    FrameEnqueueResponse,
    SessionMetricsResponse,
    SessionEndResponse,
    SessionMetricsSnapshot,
)
from app.services.gaze.estimator import GazeEstimator
from app.services.gaze.metrics_accumulator import SessionMetricsAccumulator
from app.core.logger import logger


class GazeSession:
    """Manages an active assessment session queue and background consumer"""
    def __init__(self, session_id: str, student_id: str, max_queue_size: int = 100):
        self.session_id = session_id
        self.student_id = student_id
        self.frame_queue: asyncio.Queue[Optional[FramePayload]] = asyncio.Queue(maxsize=max_queue_size)
        self.accumulator = SessionMetricsAccumulator(session_id, student_id)
        self.worker_task: Optional[asyncio.Task] = None
        self.last_active: float = time.time()
        self.is_running: bool = True
        self.lock = asyncio.Lock()


class GazeQueueManager:
    """
    Singleton Manager for Gaze Inference Background Queues.
    Provides fast, non-blocking ingestion while delegating CV/MediaPipe inference
    to background threadpools.
    """
    _sessions: Dict[str, GazeSession] = {}
    _lock: asyncio.Lock = asyncio.Lock()

    @classmethod
    async def get_or_create_session(cls, session_id: str, student_id: str) -> GazeSession:
        async with cls._lock:
            session = cls._sessions.get(session_id)
            if not session:
                session = GazeSession(session_id, student_id)
                session.worker_task = asyncio.create_task(cls._worker_loop(session))
                cls._sessions[session_id] = session
                logger.info(f"Initialized background gaze queue worker for session {session_id}")
            session.last_active = time.time()
            return session

    @classmethod
    async def enqueue_frame(cls, payload: FramePayload) -> FrameEnqueueResponse:
        """
        Ingests frame snapshot immediately into the background queue.
        Returns immediate HTTP response with running queue depth and metrics.
        """
        session = await cls.get_or_create_session(payload.session_id, payload.student_id)
        session.accumulator.total_frames_received += 1
        session.last_active = time.time()

        status = "queued"
        try:
            # Enqueue non-blockingly
            session.frame_queue.put_nowait(payload)
        except asyncio.QueueFull:
            # Drop oldest frame to preserve real-time latency
            try:
                dropped = session.frame_queue.get_nowait()
                session.frame_queue.task_done()
                logger.warning(
                    f"Session {payload.session_id} queue full (size {session.frame_queue.maxsize}). "
                    f"Dropped frame {dropped.frame_index if dropped else 'unknown'}"
                )
            except (asyncio.QueueEmpty, ValueError):
                pass

            session.frame_queue.put_nowait(payload)
            status = "queued"

        queue_depth = session.frame_queue.qsize()
        snapshot = session.accumulator.get_snapshot(queue_depth=queue_depth)

        return FrameEnqueueResponse(
            status=status,
            session_id=payload.session_id,
            frame_index=payload.frame_index,
            queue_depth=queue_depth,
            timestamp_ms=payload.timestamp_ms,
            current_metrics=snapshot,
        )

    @classmethod
    async def _worker_loop(cls, session: GazeSession) -> None:
        """
        Background consumer loop processing frames asynchronously.
        Offloads CPU-heavy OpenCV decoding and MediaPipe inference to threads.
        """
        logger.info(f"Background worker started for session {session.session_id}")
        try:
            while session.is_running:
                try:
                    # Timeout to check liveness
                    payload = await asyncio.wait_for(session.frame_queue.get(), timeout=2.0)
                except asyncio.TimeoutError:
                    continue

                if payload is None:
                    # Shutdown sentinel received
                    session.frame_queue.task_done()
                    break

                try:
                    gaze_point: Optional[GazePoint] = None

                    # If base64 image is provided, decode and run MediaPipe in worker thread
                    if payload.image_base64:
                        image = await asyncio.to_thread(
                            GazeEstimator.decode_image, payload.image_base64
                        )
                        gaze_point = await asyncio.to_thread(
                            GazeEstimator.estimate_from_image,
                            image,
                            payload.timestamp_ms,
                            payload.client_gaze_point,
                        )
                    elif payload.client_gaze_point:
                        # Direct client gaze point provided
                        gaze_point = payload.client_gaze_point

                    # If frame resolved to a gaze point, accumulate reading metrics
                    if gaze_point:
                        session.accumulator.process_gaze_point(gaze_point)
                    else:
                        session.accumulator.total_frames_processed += 1

                except Exception as exc:
                    logger.error(
                        f"Error in background frame processing for session {session.session_id}: {exc}",
                        exc_info=True,
                    )
                finally:
                    session.frame_queue.task_done()

        except asyncio.CancelledError:
            logger.info(f"Worker for session {session.session_id} cancelled.")
        finally:
            logger.info(f"Worker for session {session.session_id} stopped.")

    @classmethod
    async def get_session_metrics(cls, session_id: str) -> Optional[SessionMetricsResponse]:
        """Query real-time accumulated session metrics"""
        session = cls._sessions.get(session_id)
        if not session:
            return None
        queue_depth = session.frame_queue.qsize()
        return session.accumulator.get_full_metrics(queue_depth=queue_depth)

    @classmethod
    async def end_session(cls, session_id: str) -> Optional[SessionEndResponse]:
        """Conclude session, drain pending queue, and return finalized metrics"""
        async with cls._lock:
            session = cls._sessions.get(session_id)
            if not session:
                return None

            session.is_running = False
            session.accumulator.status = "completed"

            # Drain queue or join
            try:
                await asyncio.wait_for(session.frame_queue.join(), timeout=1.5)
            except asyncio.TimeoutError:
                logger.warning(f"Queue drain timed out for session {session_id}")

            # Send sentinel or cancel worker
            if session.worker_task and not session.worker_task.done():
                session.worker_task.cancel()

            final_metrics = session.accumulator.get_full_metrics(queue_depth=0)
            # Remove from active sessions
            cls._sessions.pop(session_id, None)

            return SessionEndResponse(
                status="completed",
                session_id=session_id,
                student_id=session.student_id,
                summary_metrics=final_metrics,
            )
