import os
import math
import cv2
import base64
import numpy as np
from typing import Optional, Tuple, List
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

from app.schemas.gaze import (
    GazePoint,
    FaceMeshAnalysisResult,
    EyeLandmarks,
    HeadPose,
    Point2D,
)
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

    FACE_OVAL_INDICES = [
        10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
        397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
        172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10
    ]
    LEFT_EYE_CONTOUR_INDICES = [
        33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246
    ]
    RIGHT_EYE_CONTOUR_INDICES = [
        263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466
    ]
    LEFT_IRIS_INDICES = [468, 469, 470, 471, 472]
    RIGHT_IRIS_INDICES = [473, 474, 475, 476, 477]

    WIREFRAME_SAMPLE_TRIANGLES = [
        [10, 338, 297], [10, 109, 67], [109, 10, 338], [1, 2, 98], [1, 2, 327],
        [33, 160, 158], [133, 153, 144], [362, 385, 387], [263, 373, 380],
        [168, 6, 197], [195, 5, 4], [4, 1, 19], [152, 377, 400], [152, 148, 176],
        [61, 146, 91], [291, 375, 321]
    ]

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

    @classmethod
    def analyze_face_mesh(
        cls,
        image: np.ndarray,
        timestamp_ms: int
    ) -> FaceMeshAnalysisResult:
        """
        Full 478-point 3D Face Mesh and OpenCV Diagnostic Analysis.
        Returns face oval wireframe, eye landmarks, iris centers, EAR blink metrics,
        head pose alignment, and lighting quality checks.
        """
        if image is None or image.size == 0:
            return FaceMeshAnalysisResult(
                face_detected=False,
                confidence=0.0,
                timestamp_ms=timestamp_ms,
                lighting_quality="unknown"
            )

        # 1. OpenCV Lighting Quality Check
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            mean_brightness = float(np.mean(gray))
            if mean_brightness < 42.0:
                lighting_quality = "dim"
            elif mean_brightness > 218.0:
                lighting_quality = "harsh"
            else:
                lighting_quality = "optimal"
        except Exception:
            lighting_quality = "optimal"

        detector = cls._get_detector()
        if detector is None:
            return FaceMeshAnalysisResult(
                face_detected=False,
                confidence=0.0,
                timestamp_ms=timestamp_ms,
                lighting_quality=lighting_quality
            )

        try:
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
            result = detector.detect(mp_image)

            if not result.face_landmarks or len(result.face_landmarks) == 0:
                return FaceMeshAnalysisResult(
                    face_detected=False,
                    confidence=0.0,
                    timestamp_ms=timestamp_ms,
                    lighting_quality=lighting_quality
                )

            landmarks = result.face_landmarks[0]
            if len(landmarks) < 478:
                return FaceMeshAnalysisResult(
                    face_detected=False,
                    confidence=0.0,
                    timestamp_ms=timestamp_ms,
                    lighting_quality=lighting_quality
                )

            # 2. Extract Face Oval Points
            face_oval = [
                Point2D(x=round(float(landmarks[idx].x), 4), y=round(float(landmarks[idx].y), 4))
                for idx in cls.FACE_OVAL_INDICES
            ]

            # 3. Left Eye Analysis & EAR
            l_contour = [
                Point2D(x=round(float(landmarks[idx].x), 4), y=round(float(landmarks[idx].y), 4))
                for idx in cls.LEFT_EYE_CONTOUR_INDICES
            ]
            l_iris_center = Point2D(
                x=round(float(landmarks[cls.LEFT_IRIS_CENTER].x), 4),
                y=round(float(landmarks[cls.LEFT_IRIS_CENTER].y), 4)
            )
            l_iris_pts = [
                Point2D(x=round(float(landmarks[idx].x), 4), y=round(float(landmarks[idx].y), 4))
                for idx in cls.LEFT_IRIS_INDICES
            ]

            # Vertical and horizontal distances for EAR:
            # Indices: top 159, bottom 145, top2 158, bottom2 144, outer 33, inner 133
            l_v1 = float(np.hypot(landmarks[159].x - landmarks[145].x, landmarks[159].y - landmarks[145].y))
            l_v2 = float(np.hypot(landmarks[158].x - landmarks[144].x, landmarks[158].y - landmarks[144].y))
            l_h = max(1e-4, float(np.hypot(landmarks[33].x - landmarks[133].x, landmarks[33].y - landmarks[133].y)))
            ear_left = round((l_v1 + l_v2) / (2.0 * l_h), 4)

            # Left horizontal & vertical pupil ratios
            l_rx = float(np.clip((landmarks[cls.LEFT_IRIS_CENTER].x - min(landmarks[33].x, landmarks[133].x)) / l_h, 0.0, 1.0))
            l_ry = float(np.clip((landmarks[cls.LEFT_IRIS_CENTER].y - min(landmarks[159].y, landmarks[145].y)) / max(1e-4, l_v1), 0.0, 1.0))

            left_eye = EyeLandmarks(
                contour=l_contour,
                iris_center=l_iris_center,
                iris_points=l_iris_pts,
                ear=ear_left,
                is_blinking=ear_left < 0.18,
                pupil_ratio_x=round(l_rx, 3),
                pupil_ratio_y=round(l_ry, 3)
            )

            # 4. Right Eye Analysis & EAR
            r_contour = [
                Point2D(x=round(float(landmarks[idx].x), 4), y=round(float(landmarks[idx].y), 4))
                for idx in cls.RIGHT_EYE_CONTOUR_INDICES
            ]
            r_iris_center = Point2D(
                x=round(float(landmarks[cls.RIGHT_IRIS_CENTER].x), 4),
                y=round(float(landmarks[cls.RIGHT_IRIS_CENTER].y), 4)
            )
            r_iris_pts = [
                Point2D(x=round(float(landmarks[idx].x), 4), y=round(float(landmarks[idx].y), 4))
                for idx in cls.RIGHT_IRIS_INDICES
            ]

            r_v1 = float(np.hypot(landmarks[386].x - landmarks[374].x, landmarks[386].y - landmarks[374].y))
            r_v2 = float(np.hypot(landmarks[385].x - landmarks[373].x, landmarks[385].y - landmarks[373].y))
            r_h = max(1e-4, float(np.hypot(landmarks[263].x - landmarks[362].x, landmarks[263].y - landmarks[362].y)))
            ear_right = round((r_v1 + r_v2) / (2.0 * r_h), 4)

            r_rx = float(np.clip((landmarks[cls.RIGHT_IRIS_CENTER].x - min(landmarks[263].x, landmarks[362].x)) / r_h, 0.0, 1.0))
            r_ry = float(np.clip((landmarks[cls.RIGHT_IRIS_CENTER].y - min(landmarks[386].y, landmarks[374].y)) / max(1e-4, r_v1), 0.0, 1.0))

            right_eye = EyeLandmarks(
                contour=r_contour,
                iris_center=r_iris_center,
                iris_points=r_iris_pts,
                ear=ear_right,
                is_blinking=ear_right < 0.18,
                pupil_ratio_x=round(r_rx, 3),
                pupil_ratio_y=round(r_ry, 3)
            )

            # 5. Head Pose (Pitch, Yaw, Roll) estimation from 3D Landmark Geometry
            p_nose = landmarks[1]
            p_chin = landmarks[152]
            p_l_outer = landmarks[33]
            p_r_outer = landmarks[263]

            # Roll (tilt left/right in degrees)
            dx = p_r_outer.x - p_l_outer.x
            dy = p_r_outer.y - p_l_outer.y
            roll_deg = round(float(math.degrees(math.atan2(dy, dx))), 1)

            # Yaw (turn left/right in degrees)
            dist_nose_l = float(np.hypot(p_nose.x - p_l_outer.x, p_nose.y - p_l_outer.y))
            dist_nose_r = float(np.hypot(p_nose.x - p_r_outer.x, p_nose.y - p_r_outer.y))
            yaw_ratio = (dist_nose_l - dist_nose_r) / max(1e-4, dist_nose_l + dist_nose_r)
            yaw_deg = round(float(np.clip(yaw_ratio * 90.0, -45.0, 45.0)), 1)

            # Pitch (nod up/down in degrees)
            eye_mid_y = (p_l_outer.y + p_r_outer.y) / 2.0
            face_h = max(1e-4, abs(p_chin.y - eye_mid_y))
            nose_vertical_ratio = (p_nose.y - eye_mid_y) / face_h
            pitch_deg = round(float(np.clip((nose_vertical_ratio - 0.38) * 120.0, -45.0, 45.0)), 1)

            # Alignment Classification
            if abs(roll_deg) > 14.0:
                alignment = "tilted_left" if roll_deg < 0 else "tilted_right"
            elif pitch_deg > 14.0:
                alignment = "looking_down"
            elif pitch_deg < -14.0:
                alignment = "looking_up"
            else:
                alignment = "centered"

            head_pose = HeadPose(
                pitch=pitch_deg,
                yaw=yaw_deg,
                roll=roll_deg,
                alignment=alignment
            )

            # 6. Gaze Point Estimation
            avg_rx = (l_rx + r_rx) / 2.0
            avg_ry = (l_ry + r_ry) / 2.0
            norm_x = float(np.clip((avg_rx - 0.25) / 0.50, 0.0, 1.0))
            norm_y = float(np.clip((avg_ry - 0.30) / 0.40, 0.0, 1.0))
            screen_x = round(1.0 - norm_x, 4)
            screen_y = round(norm_y, 4)
            gaze_point = GazePoint(
                x=screen_x,
                y=screen_y,
                timestamp_ms=timestamp_ms,
                confidence=0.94 if (ear_left >= 0.18 and ear_right >= 0.18) else 0.40
            )

            # 7. Distance Warning
            xs = [landmarks[idx].x for idx in cls.FACE_OVAL_INDICES]
            box_width = max(xs) - min(xs)
            distance_warning: Optional[str] = None
            if box_width < 0.16:
                distance_warning = "Please position yourself closer to the camera."
            elif box_width > 0.70:
                distance_warning = "Please move slightly further away from the camera."

            # 8. Sample Wireframe Triangles
            wireframe_sample: List[List[Point2D]] = []
            for tri in cls.WIREFRAME_SAMPLE_TRIANGLES:
                wireframe_sample.append([
                    Point2D(x=round(float(landmarks[idx].x), 4), y=round(float(landmarks[idx].y), 4))
                    for idx in tri
                ])

            return FaceMeshAnalysisResult(
                face_detected=True,
                confidence=0.96,
                timestamp_ms=timestamp_ms,
                face_oval=face_oval,
                left_eye=left_eye,
                right_eye=right_eye,
                head_pose=head_pose,
                gaze_point=gaze_point,
                lighting_quality=lighting_quality,
                distance_warning=distance_warning,
                mesh_triangles_sample=wireframe_sample
            )

        except Exception as exc:
            logger.warning(f"Error during full face mesh analysis: {exc}", exc_info=True)
            return FaceMeshAnalysisResult(
                face_detected=False,
                confidence=0.0,
                timestamp_ms=timestamp_ms,
                lighting_quality=lighting_quality
            )

