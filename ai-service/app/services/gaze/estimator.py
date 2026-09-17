import os
import cv2
import base64
import numpy as np
from typing import Optional, Tuple
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

from app.schemas.gaze import GazePoint
from app.core.logger import logger


class GazeEstimator:
    """
    OpenCV + MediaPipe FaceLandmarker Gaze Estimation Pipeline
    Extracts iris centers and eye contours to estimate normalized screen coordinates.
    """

    # Key landmark indices in MediaPipe 478-point mesh
    # Left eye
    LEFT_IRIS_CENTER = 468
    LEFT_EYE_OUTER = 33
    LEFT_EYE_INNER = 133
    LEFT_EYE_TOP = 159
    LEFT_EYE_BOTTOM = 145

    # Right eye
    RIGHT_IRIS_CENTER = 473
    RIGHT_EYE_OUTER = 263
    RIGHT_EYE_INNER = 362
    RIGHT_EYE_TOP = 386
    RIGHT_EYE_BOTTOM = 374

    _detector = None
    _initialized = False

    @classmethod
    def _get_detector(cls):
        """Lazy singleton initialization of MediaPipe FaceLandmarker"""
        if cls._initialized:
            return cls._detector

        current_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(current_dir, "models", "face_landmarker.task")

        if not os.path.exists(model_path):
            os.makedirs(os.path.dirname(model_path), exist_ok=True)
            import urllib.request
            model_url = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
            try:
                logger.info(f"Downloading face_landmarker.task from {model_url}...")
                urllib.request.urlretrieve(model_url, model_path)
            except Exception as e:
                logger.error(f"Failed to download MediaPipe model: {e}")
                cls._initialized = True
                cls._detector = None
                return None

        try:
            base_options = mp_python.BaseOptions(model_asset_path=model_path)
            options = vision.FaceLandmarkerOptions(
                base_options=base_options,
                output_face_blendshapes=False,
                output_facial_transformation_matrixes=False,
                num_faces=1
            )
            cls._detector = vision.FaceLandmarker.create_from_options(options)
            logger.info("MediaPipe FaceLandmarker initialized successfully.")
        except Exception as e:
            logger.error(f"Error initializing MediaPipe FaceLandmarker: {e}")
            cls._detector = None

        cls._initialized = True
        return cls._detector

    @classmethod
    def decode_image(cls, image_base64: str) -> Optional[np.ndarray]:
        """Decode base64 string to OpenCV BGR numpy image"""
        try:
            if "," in image_base64:
                image_base64 = image_base64.split(",", 1)[1]
            image_bytes = base64.b64decode(image_base64)
            np_arr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            return img
        except Exception as e:
            logger.warning(f"Failed to decode base64 image: {e}")
            return None

    @classmethod
    def estimate_from_image(
        cls,
        image: np.ndarray,
        timestamp_ms: int,
        client_gaze: Optional[GazePoint] = None
    ) -> Optional[GazePoint]:
        """
        Run MediaPipe FaceLandmarker on image to estimate gaze screen coordinates.
        Falls back to client_gaze if face/eyes not detectable.
        """
        if image is None or image.size == 0:
            return client_gaze

        detector = cls._get_detector()
        if detector is None:
            return client_gaze

        try:
            # OpenCV BGR to RGB
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
            result = detector.detect(mp_image)

            if not result.face_landmarks or len(result.face_landmarks) == 0:
                return client_gaze

            landmarks = result.face_landmarks[0]
            if len(landmarks) < 478:
                return client_gaze

            # Left eye ratios
            l_iris = landmarks[cls.LEFT_IRIS_CENTER]
            l_outer = landmarks[cls.LEFT_EYE_OUTER]
            l_inner = landmarks[cls.LEFT_EYE_INNER]
            l_top = landmarks[cls.LEFT_EYE_TOP]
            l_bottom = landmarks[cls.LEFT_EYE_BOTTOM]

            # Right eye ratios
            r_iris = landmarks[cls.RIGHT_IRIS_CENTER]
            r_outer = landmarks[cls.RIGHT_EYE_OUTER]
            r_inner = landmarks[cls.RIGHT_EYE_INNER]
            r_top = landmarks[cls.RIGHT_EYE_TOP]
            r_bottom = landmarks[cls.RIGHT_EYE_BOTTOM]

            l_width = max(1e-4, abs(l_inner.x - l_outer.x))
            l_height = max(1e-4, abs(l_bottom.y - l_top.y))
            r_width = max(1e-4, abs(r_inner.x - r_outer.x))
            r_height = max(1e-4, abs(r_bottom.y - r_top.y))

            # Horizontal pupil ratio within eye corners
            l_rx = (l_iris.x - min(l_outer.x, l_inner.x)) / l_width
            r_rx = (r_iris.x - min(r_outer.x, r_inner.x)) / r_width
            avg_rx = (l_rx + r_rx) / 2.0

            # Vertical pupil ratio within eye lids
            l_ry = (l_iris.y - min(l_top.y, l_bottom.y)) / l_height
            r_ry = (r_iris.y - min(r_top.y, r_bottom.y)) / r_height
            avg_ry = (l_ry + r_ry) / 2.0

            # Normalization curve mapping to standard 0.0 - 1.0 screen viewport
            # Normal eye movement bounds usually span ratio 0.25 to 0.75
            norm_x = float(np.clip((avg_rx - 0.25) / 0.50, 0.0, 1.0))
            norm_y = float(np.clip((avg_ry - 0.30) / 0.40, 0.0, 1.0))

            # Flip horizontal for webcam mirror perspective
            screen_x = round(1.0 - norm_x, 4)
            screen_y = round(norm_y, 4)

            return GazePoint(
                x=screen_x,
                y=screen_y,
                timestamp_ms=timestamp_ms,
                confidence=0.92
            )
        except Exception as e:
            logger.warning(f"Error during gaze landmark inference: {e}")
            return client_gaze
