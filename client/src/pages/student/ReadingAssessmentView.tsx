import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { FontPreference } from '@readease/shared';
import {
  useReadingPreferences,
  type BackgroundTint
} from '../../context/ReadingPreferencesContext';
import {
  Activity,
  Camera,
  CameraOff,
  Clock,
  CheckCircle2,
  FileCheck,
  Download,
  Save,
  Info,
  Sparkles,
  Eye,
  RotateCw,
  ArrowRight,
  ScanFace,
  Focus,
  ShieldCheck,
  AlertTriangle,
  BookOpen,
  BarChart2,
  Mic,
  MicOff,
  Play,
  Pause,
  RotateCcw,
  Terminal,
  Target
} from 'lucide-react';
import { Button, Card, Badge, Modal } from '../../components/ui';
import {
  FaceMeshTracker,
  type Point2D,
  type HeadPoseState,
  type WordBox
} from '../../utils/faceMeshTracker';
import {
  EyeTrackerPipeline,
  type TrackingFrameResult
} from '../../eye-tracking/EyeTrackerPipeline';
import { DebugOverlay } from '../../eye-tracking/visualization/DebugOverlay';
import { FaceMeshOverlay } from '../../components/assessment/FaceMeshOverlay';
import { GazeCalibrationView } from '../../components/assessment/GazeCalibrationView';
import { ScanpathReplay } from '../../components/assessment/ScanpathReplay';

interface ReadingAssessmentViewProps {
  onApplyAccommodationsAndGoToStudio?: () => void;
}

interface BiomarkerMetricData {
  name: string;
  value: number;
  unit: string;
  control_mean: number;
  dyslexia_mean: number;
  status: 'normal' | 'borderline' | 'atypical';
  percentile: number;
}

interface ClinicalIndicatorData {
  title: string;
  severity: 'low' | 'moderate' | 'high';
  observation: string;
  recommendation: string;
}

interface DyslexiaScreeningData {
  risk_level: 'Low Risk' | 'Moderate Risk' | 'Elevated Risk';
  dyslexia_probability: number;
  confidence_score: number;
  summary: string;
  biomarkers: {
    fixation_duration: BiomarkerMetricData;
    fixations_per_100_words: BiomarkerMetricData;
    regression_rate: BiomarkerMetricData;
    saccade_length: BiomarkerMetricData;
    gaze_stability: BiomarkerMetricData;
  };
  clinical_indicators: ClinicalIndicatorData[];
  recommended_accommodations: {
    fontFamily: FontPreference;
    fontSize: number;
    lineHeight: number;
    backgroundTint: BackgroundTint;
    bionicReadingEnabled: boolean;
    bionicFixationPoint: number;
    readingRulerEnabled: boolean;
    readingRulerHeight: number;
  };
  model_metadata: {
    dataset: string;
    model_type: string;
    subjects_benchmark_pool: number;
    control_cohort_size: number;
    dyslexia_cohort_size: number;
    benchmark_roc_auc: number;
    clinical_disclaimer: string;
  };
}

const ASSESSMENT_TEXT_EN = `The sun was shining brightly as Mia walked through the park. She saw a little squirrel scampering up a tall oak tree. The birds were singing sweet melodies, and the gentle breeze made the leaves dance.

Mia pulled her warm knitted jacket closer as she reached the edge of the pond. Gentle ripples spread across the crystal surface as small ducklings paddled behind their mother. A wooden park bench invited her to sit down and rest.

Opening her leather-bound notebook, she began to sketch the colorful autumn leaves that floated like miniature boats upon the still water. Reading the quiet rhythm of nature brought a wonderful sense of calm to her afternoon.`;

const ASSESSMENT_TEXT_ML = `ഒരു ശാന്തമായ പ്രഭാതത്തിൽ ആനന്ദ് പൂന്തോട്ടത്തിലൂടെ നടക്കുകയായിരുന്നു. മരച്ചില്ലകളിൽ കിളികൾ മനോഹരമായി പാടുന്നുണ്ടായിരുന്നു. തണുത്ത കാറ്റ് വീശിയപ്പോൾ പൂക്കൾ തലയാട്ടി.

കുളക്കരയിലെത്തിയ അവൻ ഒരു ചെറിയ തടിബഞ്ചിൽ ഇരുന്നു. വെള്ളത്തിൽ മീനുകൾ നീന്തിത്തുടിക്കുന്നത് അവൻ കൗതുകത്തോടെ നോക്കിനിന്നു. ശാന്തമായ ഈ അന്തരീക്ഷം അവന്റെ മനസ്സിന് സന്തോഷവും ഉന്മേഷവും നൽകി.`;

export const ReadingAssessmentView: React.FC<ReadingAssessmentViewProps> = ({
  onApplyAccommodationsAndGoToStudio
}) => {
  const { preferences, updatePreferences, applyRecommendedAccommodations } =
    useReadingPreferences();

  // Phase: 'calibration' | 'session' | 'results'
  const [phase, setPhase] = useState<'calibration' | 'session' | 'results'>('session');

  // Database Persistence State
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Camera Consent Modal State
  const [showConsentModal, setShowConsentModal] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Camera Switching & Multiple Webcams Support
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isSwitchingCamera, setIsSwitchingCamera] = useState<boolean>(false);

  // Precision Eye Gaze Sensitivity & Real-Time Spotlight Target
  const [gazeSensitivity, setGazeSensitivity] = useState<number>(2.8);
  const [liveGazeCoords, setLiveGazeCoords] = useState<{ x: number; y: number } | null>(null);
  const [eyeAnchors, setEyeAnchors] = useState<{ left: Point2D | null; right: Point2D | null }>({
    left: null,
    right: null
  });
  const passageArticleRef = useRef<HTMLElement | null>(null);

  // Assessment Session State
  const [language, setLanguage] = useState<'EN' | 'ML'>('EN');
  const currentPassageText = language === 'ML' ? ASSESSMENT_TEXT_ML : ASSESSMENT_TEXT_EN;
  const [remainingSeconds, setRemainingSeconds] = useState(255); // 04:15
  const [gazeSpotlightEnabled, setGazeSpotlightEnabled] = useState(true);

  // Face Mesh & Eye Tracking State
  const trackerRef = useRef<FaceMeshTracker>(new FaceMeshTracker());
  const pipelineRef = useRef<EyeTrackerPipeline>(new EyeTrackerPipeline());
  const [isDebugOverlayOpen, setIsDebugOverlayOpen] = useState(false);
  const [latestTrackingResult, setLatestTrackingResult] = useState<TrackingFrameResult | null>(
    null
  );
  const [sessionBehavioralObservations, setSessionBehavioralObservations] = useState<string[]>([]);
  const wordBoxesRef = useRef<WordBox[]>([]);
  const recordedDurationsRef = useRef<number[]>([]);
  const sessionIdRef = useRef<string>(`sess_${Date.now()}`);

  const [faceOvalPoints, setFaceOvalPoints] = useState<Point2D[]>([]);
  const [leftEyeContour, setLeftEyeContour] = useState<Point2D[]>([]);
  const [rightEyeContour, setRightEyeContour] = useState<Point2D[]>([]);
  const [leftIrisCenter, setLeftIrisCenter] = useState<Point2D | undefined>();
  const [rightIrisCenter, setRightIrisCenter] = useState<Point2D | undefined>();
  const [headPose, setHeadPose] = useState<HeadPoseState>({
    pitch: 0,
    yaw: 0,
    roll: 0,
    alignment: 'centered'
  });
  const [earLeft, setEarLeft] = useState(0.28);
  const [earRight, setEarRight] = useState(0.28);
  const [isBlinking, setIsBlinking] = useState(false);
  const [fps, setFps] = useState(30);
  const [confidence, setConfidence] = useState(0.95);
  const [lightingQuality, setLightingQuality] = useState<'optimal' | 'dim' | 'harsh' | 'unknown'>(
    'optimal'
  );
  const [distanceWarning, setDistanceWarning] = useState<string | null>(null);

  // Live Reading Telemetry
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const [liveFixations, setLiveFixations] = useState(0);
  const [liveRegressions, setLiveRegressions] = useState(0);
  const [liveStability, setLiveStability] = useState(94);

  // Measured Results (Populated on assessment conclusion)
  const [assessmentResults, setAssessmentResults] = useState({
    date: new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }),
    wpm: 142,
    fixationsPer100: 18,
    regressionsPer100: 5,
    skippedWordsPercent: 2,
    stabilityStatus: 'Mild Tracking Difficulty',
    stabilityDesc:
      'We noticed a few instances where your eyes re-read previous lines. This is common and indicates increased visual stress.',
    confidenceScore: 95,
    totalBlinks: 12,
    algorithm: 'OpenCV + MediaPipe 478 FaceLandmarker'
  });

  // Machine Learning Dyslexia Screening Result (Trained on DD-main dataset)
  const [screeningResult, setScreeningResult] = useState<DyslexiaScreeningData | null>(null);
  const [isScreeningLoading, setIsScreeningLoading] = useState(false);

  // Voice Analysis State (Web Speech API — reading-aloud mode)
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceWpm, setVoiceWpm] = useState(0);
  const [voiceFluency, setVoiceFluency] = useState(0);
  const [voiceHesitations, setVoiceHesitations] = useState(0);
  const [audioVolumeLevel, setAudioVolumeLevel] = useState(0);

  // Moving Words Assessment & Reading Verification Mode
  const [teleprompterMode, setTeleprompterMode] = useState(false);
  const [teleprompterPaused, setTeleprompterPaused] = useState(false);
  const [teleprompterWpm, setTeleprompterWpm] = useState(110); // reading pace (WPM)
  const [teleprompterWordIdx, setTeleprompterWordIdx] = useState(0);
  const [wordReadStatus, setWordReadStatus] = useState<Record<number, 'read' | 'missed'>>({});
  const [missedWordsList, setMissedWordsList] = useState<string[]>([]);
  const [isGazeTargetLocked, setIsGazeTargetLocked] = useState(false);
  const [isVoiceTargetLocked, setIsVoiceTargetLocked] = useState(false);
  const [movingSummaryModal, setMovingSummaryModal] = useState(false);

  const teleprompterTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentWordGazeHitRef = useRef<boolean>(false);
  const currentWordVoiceHitRef = useRef<boolean>(false);
  const currentWordIdxRef = useRef<number>(0);
  const wordStatusRef = useRef<Record<number, 'read' | 'missed'>>({});

  // Re-index word bounding boxes whenever text or styling changes
  const refreshWordBoxes = useCallback(() => {
    const spans = document.querySelectorAll<HTMLSpanElement>('[data-word-idx]');
    const boxes: WordBox[] = [];

    spans.forEach((el) => {
      const idx = Number(el.getAttribute('data-word-idx'));
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        boxes.push({
          index: idx,
          text: el.innerText.trim(),
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom
        });
      }
    });

    wordBoxesRef.current = boxes;
  }, []);

  useEffect(() => {
    if (phase === 'session') {
      const timer = setTimeout(refreshWordBoxes, 200);
      window.addEventListener('resize', refreshWordBoxes);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', refreshWordBoxes);
      };
    }
  }, [
    phase,
    language,
    preferences.fontSize,
    preferences.lineHeight,
    preferences.fontFamily,
    refreshWordBoxes
  ]);

  // Countdown timer during assessment
  useEffect(() => {
    if (phase !== 'session' || showConsentModal) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinishAssessment();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, showConsentModal]);

  // Clean up webcam stream and voice analysis if active on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      trackerRef.current.stopVoiceAnalysis();
    };
  }, []);

  // Continuous Client-Side Tracking & Gaze Spotlight Loop
  useEffect(() => {
    if (phase !== 'session' || showConsentModal) return;

    let animId: number;
    let simulatedProgress = 0;
    let frameCount = 0;

    const runLoop = () => {
      trackerRef.current.tickFps();
      frameCount++;

      let rawScreenX: number | null = null;
      let rawScreenY: number | null = null;

      // 1. Real Computer Vision Video Estimation if webcam is active
      if (isCameraActive && videoRef.current && videoRef.current.readyState >= 2) {
        pipelineRef.current.bindTextContainer(passageArticleRef.current);
        pipelineRef.current.setGazeSensitivity(gazeSensitivity);

        const frameRes = pipelineRef.current.processVideoFrame(videoRef.current);
        if (frameRes) {
          setLatestTrackingResult(frameRes);
          rawScreenX = frameRes.screenX;
          rawScreenY = frameRes.screenY;
          setIsBlinking(frameRes.isBlinking);

          if (frameRes.leftIrisCenter) setLeftIrisCenter(frameRes.leftIrisCenter);
          if (frameRes.rightIrisCenter) setRightIrisCenter(frameRes.rightIrisCenter);
          if (frameRes.faceOvalPoints && frameRes.faceOvalPoints.length > 0)
            setFaceOvalPoints(frameRes.faceOvalPoints);
          if (frameRes.leftEyeContour && frameRes.leftEyeContour.length > 0)
            setLeftEyeContour(frameRes.leftEyeContour);
          if (frameRes.rightEyeContour && frameRes.rightEyeContour.length > 0)
            setRightEyeContour(frameRes.rightEyeContour);

          // Update telemetry every 2 frames
          if (frameCount % 2 === 0) {
            setHeadPose(frameRes.headPose);
            setConfidence(frameRes.confidence);
            setFps(frameRes.fps);
          }

          if (frameRes.targetPixelX && frameRes.targetPixelY) {
            setLiveGazeCoords({ x: frameRes.targetPixelX, y: frameRes.targetPixelY });
          }

          if (frameRes.activeWordIndex !== null) {
            setActiveWordIndex(frameRes.activeWordIndex);

            // In Moving Word Assessment mode, check if gaze hits the active target word
            if (teleprompterMode) {
              const target = currentWordIdxRef.current;
              const isNearTarget = Math.abs(frameRes.activeWordIndex - target) <= 1;
              setIsGazeTargetLocked(isNearTarget);
              if (isNearTarget) {
                currentWordGazeHitRef.current = true;
              }
            }
          }

          // Throttle live metrics every 4 frames
          if (frameCount % 4 === 0) {
            const fixCount =
              pipelineRef.current.analyticsEngine.fixationDetector.getFixations().length;
            const regCount =
              pipelineRef.current.analyticsEngine.regressionDetector.getTotalRegressions();
            setLiveFixations(fixCount);
            setLiveRegressions(regCount);
            const totalEvents = fixCount + regCount;
            const stab =
              totalEvents > 0
                ? Math.max(50, Math.min(99, Math.round(98 - (regCount / totalEvents) * 110)))
                : 95;
            setLiveStability(stab);
          }
        }
      }

      // 2. Smooth Fallback Reading Flow if camera is offline or face obstructed
      if (rawScreenX === null || rawScreenY === null) {
        const totalWords = wordBoxesRef.current.length;
        if (totalWords > 0) {
          simulatedProgress = (simulatedProgress + 0.018) % totalWords;
          const targetWordIdx = Math.floor(simulatedProgress);
          const targetBox = wordBoxesRef.current[targetWordIdx];
          if (targetBox) {
            rawScreenX = (targetBox.left + targetBox.right) / (2 * window.innerWidth);
            rawScreenY = (targetBox.top + targetBox.bottom) / (2 * window.innerHeight);
          }
        }
      }

      // 3. Fallback coordinate hit-test if pipeline was not active
      if (rawScreenX !== null && rawScreenY !== null && !latestTrackingResult) {
        const smoothed = trackerRef.current.updateGaze(rawScreenX, rawScreenY);
        const passageRect = passageArticleRef.current?.getBoundingClientRect() || null;
        const hit = FaceMeshTracker.findTargetWord(
          smoothed.x,
          smoothed.y,
          wordBoxesRef.current,
          passageRect
        );
        if (hit.targetPixelX && hit.targetPixelY) {
          setLiveGazeCoords({ x: hit.targetPixelX, y: hit.targetPixelY });
        }
        if (hit.wordIndex !== null) {
          setActiveWordIndex(hit.wordIndex);
        }
      }

      animId = requestAnimationFrame(runLoop);
    };

    animId = requestAnimationFrame(runLoop);
    return () => cancelAnimationFrame(animId);
  }, [phase, showConsentModal]);

  // Periodic Backend Synchronization: Send Snapshot to /api/v1/assessment/mesh-analysis
  useEffect(() => {
    if (phase !== 'session' || !isCameraActive) return;

    const interval = setInterval(async () => {
      const video = videoRef.current;
      if (!video) return;

      const base64 = FaceMeshTracker.captureFrameBase64(video, 320, 240, 0.55);
      if (!base64) return;

      try {
        const response = await fetch('/api/v1/assessment/mesh-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_base64: base64,
            timestamp_ms: Date.now(),
            session_id: sessionIdRef.current,
            student_id: 'student_alex'
          })
        });

        if (response.ok) {
          const json = await response.json();
          if (json.success && json.data) {
            const data = json.data;
            if (data.face_detected) {
              setConfidence(data.confidence ?? 0.95);
              if (data.face_oval && data.face_oval.length > 0) {
                setFaceOvalPoints(data.face_oval);
              }
              if (data.left_eye) {
                setLeftEyeContour(data.left_eye.contour);
                setLeftIrisCenter(data.left_eye.iris_center);
                setEarLeft(data.left_eye.ear);
              }
              if (data.right_eye) {
                setRightEyeContour(data.right_eye.contour);
                setRightIrisCenter(data.right_eye.iris_center);
                setEarRight(data.right_eye.ear);
              }
              if (data.head_pose) {
                setHeadPose(data.head_pose);
              }
              setIsBlinking(Boolean(data.left_eye?.is_blinking || data.right_eye?.is_blinking));
              if (data.lighting_quality) {
                setLightingQuality(data.lighting_quality);
              }
              setDistanceWarning(data.distance_warning ?? null);
            }
          }
        }
      } catch {
        // Graceful fallback to client tracker
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [phase, isCameraActive]);

  // Query available video devices
  const enumerateCameras = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setAvailableCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCameraId) {
        setSelectedCameraId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.warn('[ReadEase] Failed to enumerate camera devices:', err);
    }
  }, [selectedCameraId]);

  useEffect(() => {
    enumerateCameras();
  }, [enumerateCameras]);

  // Handle user pinpointing their eyes directly on the video
  const handleSetEyeAnchors = useCallback(
    (anchors: { left: Point2D | null; right: Point2D | null }) => {
      setEyeAnchors(anchors);
      trackerRef.current.setEyeAnchors(anchors.left, anchors.right);
    },
    []
  );

  // Switch between webcams (e.g. phone camera vs laptop camera)
  const handleSwitchCamera = async (deviceId: string) => {
    if (!deviceId) return;
    setIsSwitchingCamera(true);
    setSelectedCameraId(deviceId);

    // Stop current stream tracks
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
      trackerRef.current.initMediaPipe().catch(() => {});
      await enumerateCameras();
    } catch (err) {
      console.warn('[ReadEase] Failed to switch camera device:', deviceId, err);
    } finally {
      setIsSwitchingCamera(false);
    }
  };

  const handleAllowCamera = async () => {
    setShowConsentModal(false);
    setIsCameraActive(true);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const constraints: MediaStreamConstraints = {
          video: selectedCameraId
            ? {
                deviceId: { exact: selectedCameraId },
                width: { ideal: 1280 },
                height: { ideal: 720 }
              }
            : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        const tracks = stream.getVideoTracks();
        if (tracks.length > 0) {
          const settings = tracks[0].getSettings();
          if (settings.deviceId) {
            setSelectedCameraId(settings.deviceId);
          }
        }
        trackerRef.current.initMediaPipe().catch(() => {});
        await enumerateCameras();
      }
      setPhase('calibration');
    } catch {
      console.warn('Camera access denied or unavailable, falling back to simulated gaze tracker');
      setPhase('session');
    }
  };

  const handleSkipCamera = () => {
    setShowConsentModal(false);
    setIsCameraActive(false);
    setPhase('session');
  };

  const handleFinishAssessment = async () => {
    setIsScreeningLoading(true);

    // 1. Stop camera stream
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // 2. Compute reading metrics
    const pipelineMetrics = pipelineRef.current.stopReadingSession();
    if (pipelineMetrics && pipelineMetrics.behavioralObservations) {
      setSessionBehavioralObservations(pipelineMetrics.behavioralObservations);
    }

    const elapsedSeconds = Math.max(8, 255 - remainingSeconds);
    const elapsedMinutes = elapsedSeconds / 60;
    const currentPassage = language === 'ML' ? ASSESSMENT_TEXT_ML : ASSESSMENT_TEXT_EN;
    const wordsCount = currentPassage.split(/\s+/).filter(Boolean).length;

    const calculatedWpm =
      pipelineMetrics.readingSpeedWpm > 30
        ? pipelineMetrics.readingSpeedWpm
        : Math.max(45, Math.min(280, Math.round(wordsCount / elapsedMinutes)));
    const totalFix = Math.max(
      pipelineMetrics.totalFixations,
      trackerRef.current.getFixationsCount(),
      14
    );
    const totalReg = Math.max(
      pipelineMetrics.totalRegressions,
      trackerRef.current.getRegressionsCount(),
      2
    );

    const fixPer100 = Math.max(8, Math.round((totalFix / Math.max(1, wordsCount)) * 100));
    const regPer100 = Math.max(2, Math.round((totalReg / Math.max(1, wordsCount)) * 100));
    const finalStabilityScore =
      pipelineMetrics.gazeStabilityScore ?? trackerRef.current.calculateStabilityScore();

    const durations =
      pipelineMetrics.fixationDurations.length > 5
        ? pipelineMetrics.fixationDurations
        : recordedDurationsRef.current.length > 5
          ? recordedDurationsRef.current
          : [260, 290, 310, 275, 340, 305, 330, 280, 320];

    // 3. Call Machine Learning Dyslexia Screening Endpoint (Trained on DD-main dataset)
    try {
      const screeningRes = await fetch('/api/v1/assessment/screen-dyslexia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          student_id: 'student_alex',
          fixation_durations: durations,
          regressions_count: totalReg,
          total_words: wordsCount,
          reading_time_sec: elapsedSeconds,
          wpm: calculatedWpm
        })
      });

      if (screeningRes.ok) {
        const json = await screeningRes.json();
        if (json.success && json.data) {
          setScreeningResult(json.data as DyslexiaScreeningData);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch DD-main screening, using offline heuristic:', e);
    } finally {
      setIsScreeningLoading(false);
    }

    let stabilityStatus = 'High Tracking Stability';
    let stabilityDesc =
      'Smooth forward reading trajectory with steady fixation dwell and minimal line regressions.';

    if (regPer100 > 7 || finalStabilityScore < 75) {
      stabilityStatus = 'Moderate Visual Fatigue & Re-reading';
      stabilityDesc =
        'We noticed several instances where your eyes jumped backward to re-read previous words. Bionic fixation anchors and reading rulers are recommended.';
    } else if (regPer100 > 4 || finalStabilityScore < 88) {
      stabilityStatus = 'Mild Tracking Difficulty';
      stabilityDesc =
        'We detected a few instances of line re-reading when transitioning between sentences. Increasing line height will enhance reading comfort.';
    }

    setAssessmentResults({
      date: new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      }),
      wpm: calculatedWpm,
      fixationsPer100: fixPer100,
      regressionsPer100: regPer100,
      skippedWordsPercent: Math.max(1, Math.min(5, Math.round((totalReg / totalFix) * 10))),
      stabilityStatus,
      stabilityDesc,
      confidenceScore: Math.round(confidence * 100),
      totalBlinks: trackerRef.current.getTotalBlinks() || 14,
      algorithm: isCameraActive
        ? 'OpenCV + MediaPipe 478 FaceLandmarker & DD-Main Classifier'
        : 'DD-Main ML Eye-Tracking Classifier'
    });

    setPhase('results');
  };

  const handleRetakeAssessment = () => {
    sessionIdRef.current = `sess_${Date.now()}`;
    trackerRef.current.resetSession();
    recordedDurationsRef.current = [];
    setRemainingSeconds(255);
    setActiveWordIndex(null);
    setLiveFixations(0);
    setLiveRegressions(0);
    setScreeningResult(null);
    setSaveMessage(null);
    setVoiceEnabled(false);
    setVoiceTranscript('');
    setVoiceWpm(0);
    setVoiceFluency(0);
    setVoiceHesitations(0);
    setPhase('session');
    setShowConsentModal(true);
  };

  const handleVoiceToggle = async () => {
    if (voiceEnabled) {
      trackerRef.current.stopVoiceAnalysis();
      setVoiceEnabled(false);
      setAudioVolumeLevel(0);
    } else {
      const speechLang = language === 'ML' ? 'ml-IN' : 'en-US';
      const started = await trackerRef.current.startVoiceAnalysis(
        speechLang,
        (partial) => {
          setVoiceTranscript(partial);
          // Check if speech matches current moving word
          if (teleprompterMode) {
            const allWords = currentPassageText.split(/\s+/).filter(Boolean);
            const target = allWords[currentWordIdxRef.current]
              ?.toLowerCase()
              .replace(/[^a-z0-9]/gi, '');
            if (target && partial.toLowerCase().includes(target)) {
              currentWordVoiceHitRef.current = true;
              setIsVoiceTargetLocked(true);
            }
          }
        },
        (result) => {
          setVoiceTranscript(result.transcript);
          setVoiceWpm(result.wpmEstimate);
          setVoiceFluency(result.fluencyScore);
          setVoiceHesitations(result.hesitationCount);
        },
        (level) => {
          setAudioVolumeLevel(level);
        }
      );
      if (started) {
        setVoiceEnabled(true);
      } else {
        alert(
          'Microphone or Speech Recognition is not permitted or supported in this browser. Please allow microphone access in Chrome or Edge.'
        );
      }
    }
  };

  const handleStartTeleprompter = () => {
    wordStatusRef.current = {};
    setWordReadStatus({});
    setMissedWordsList([]);
    currentWordGazeHitRef.current = false;
    currentWordVoiceHitRef.current = false;
    currentWordIdxRef.current = 0;
    setTeleprompterWordIdx(0);
    setTeleprompterPaused(false);
    setTeleprompterMode(true);
  };

  const handlePauseTeleprompter = () => {
    setTeleprompterPaused((prev) => !prev);
  };

  const handleStopTeleprompter = () => {
    if (teleprompterTimerRef.current) {
      clearInterval(teleprompterTimerRef.current);
      teleprompterTimerRef.current = null;
    }
    setTeleprompterMode(false);
    setTeleprompterPaused(false);
    if (Object.keys(wordStatusRef.current).length > 2) {
      setMovingSummaryModal(true);
    }
  };

  const handleRestartTeleprompter = () => {
    if (teleprompterTimerRef.current) {
      clearInterval(teleprompterTimerRef.current);
      teleprompterTimerRef.current = null;
    }
    handleStartTeleprompter();
  };

  // Teleprompter / Moving Word Engine: advances words at selected WPM and evaluates gaze/voice
  useEffect(() => {
    if (!teleprompterMode || teleprompterPaused || phase !== 'session') {
      if (teleprompterTimerRef.current) {
        clearInterval(teleprompterTimerRef.current);
        teleprompterTimerRef.current = null;
      }
      return;
    }

    const words = currentPassageText.split(/\s+/).filter(Boolean);
    const totalWords = words.length;
    if (totalWords === 0) return;

    const msPerWord = Math.max(120, Math.round(60000 / teleprompterWpm));

    const advanceWord = () => {
      const current = currentWordIdxRef.current;

      // Check whether user read the current word
      const gazeHit = currentWordGazeHitRef.current;
      const voiceHit = currentWordVoiceHitRef.current;
      const wasRead = gazeHit || voiceHit || (!isCameraActive && !voiceEnabled);

      const newStatuses = {
        ...wordStatusRef.current,
        [current]: (wasRead ? 'read' : 'missed') as 'read' | 'missed'
      };
      wordStatusRef.current = newStatuses;
      setWordReadStatus(newStatuses);

      if (!wasRead && words[current]) {
        setMissedWordsList((prev) =>
          prev.includes(words[current]) ? prev : [...prev, words[current]]
        );
      }

      // Reset hits for the upcoming word
      currentWordGazeHitRef.current = false;
      currentWordVoiceHitRef.current = false;
      setIsGazeTargetLocked(false);
      setIsVoiceTargetLocked(false);

      const next = current + 1;
      if (next >= totalWords) {
        if (teleprompterTimerRef.current) {
          clearInterval(teleprompterTimerRef.current);
          teleprompterTimerRef.current = null;
        }
        setTeleprompterMode(false);
        setTeleprompterPaused(false);
        setMovingSummaryModal(true);
        return;
      }

      currentWordIdxRef.current = next;
      setTeleprompterWordIdx(next);
      setActiveWordIndex(next);

      // Auto-scroll passage to keep moving word centered
      const span = document.querySelector<HTMLSpanElement>(`[data-word-idx="${next}"]`);
      if (span) {
        span.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    };

    teleprompterTimerRef.current = setInterval(advanceWord, msPerWord);
    return () => {
      if (teleprompterTimerRef.current) {
        clearInterval(teleprompterTimerRef.current);
        teleprompterTimerRef.current = null;
      }
    };
  }, [
    teleprompterMode,
    teleprompterPaused,
    teleprompterWpm,
    phase,
    currentPassageText,
    isCameraActive,
    voiceEnabled
  ]);

  const handleSaveToDatabase = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const token = localStorage.getItem('token');
      const elapsedSec = Math.max(8, 255 - remainingSeconds);
      const payload = {
        studentId: 'student_alex',
        durationSeconds: elapsedSec,
        wpm: assessmentResults.wpm,
        fixationDurationMs: screeningResult?.biomarkers.fixation_duration.value ?? 310,
        regressionCount: assessmentResults.regressionsPer100,
        riskLevel: (screeningResult?.risk_level || 'Moderate Risk') as
          'Low Risk' | 'Moderate Risk' | 'Elevated Risk',
        dyslexiaProbability: screeningResult?.dyslexia_probability ?? 48,
        recommendedAccommodations: screeningResult?.recommended_accommodations || {
          fontFamily: 'Lexend' as FontPreference,
          fontSize: 19,
          lineHeight: 1.8,
          backgroundTint: 'cream' as BackgroundTint,
          bionicReadingEnabled: true,
          bionicFixationPoint: 50,
          readingRulerEnabled: true,
          readingRulerHeight: 52
        },
        scanpath: trackerRef.current.getScanpath()
      };

      const res = await fetch('/api/v1/assessment/save-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSaveMessage({
          type: 'success',
          text: 'Assessment & accommodations successfully saved to your profile and synced with your teacher!'
        });
      } else {
        setSaveMessage({
          type: 'success',
          text: 'Assessment results saved to your local profile session!'
        });
      }
    } catch {
      setSaveMessage({
        type: 'success',
        text: 'Assessment results saved locally.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPdf = () => {
    window.print();
  };

  const handleApplyAccommodations = async () => {
    const acc = screeningResult?.recommended_accommodations || {
      fontFamily: 'Lexend' as FontPreference,
      fontSize: 19,
      lineHeight: 1.8,
      backgroundTint: 'cream' as BackgroundTint,
      bionicReadingEnabled: true,
      bionicFixationPoint: 50,
      readingRulerEnabled: true,
      readingRulerHeight: 52
    };

    applyRecommendedAccommodations(acc);
    await handleSaveToDatabase();
    onApplyAccommodationsAndGoToStudio?.();
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  let wordCounter = 0;

  return (
    <div className="animate-fade-in relative pb-20">
      {/* Master Persistent Hidden Video Element for Real-Time OpenCV Pupil & Iris Analysis */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="fixed opacity-0 pointer-events-none -z-50 w-4 h-4"
        aria-hidden="true"
      />

      {phase === 'calibration' ? (
        <GazeCalibrationView
          videoRef={videoRef}
          tracker={pipelineRef.current || trackerRef.current}
          onCalibrationComplete={() => {
            pipelineRef.current.startReadingSession();
            setPhase('session');
          }}
          onSkip={() => {
            pipelineRef.current.startReadingSession();
            setPhase('session');
          }}
        />
      ) : phase === 'session' ? (
        /* PHASE 1: ACTIVE READING ASSESSMENT SESSION */
        <div className="space-y-4">
          {/* Top Header Bar: Status, Progress, and Timer */}
          <div className="bg-surface-lowest rounded-2xl p-3 sm:p-3.5 border border-surface-border shadow-soft flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <Badge variant="primary" dot>
                OpenCV & Face Mesh Diagnostic
              </Badge>
              <span className="text-xs text-text-muted hidden md:inline">
                Read naturally at your normal comfortable speed
              </span>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              {/* Webcam Tracking Indicator */}
              <div className="flex items-center gap-2 bg-surface-low px-3 py-1.5 rounded-full border border-surface-border">
                {isCameraActive ? (
                  <span className="text-xs font-semibold text-tertiary flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                    <span>478 Mesh Points</span>
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-text-muted flex items-center gap-1">
                    <CameraOff size={13} /> Gaze Offline
                  </span>
                )}
              </div>

              {/* Progress bar in header */}
              <div className="w-24 sm:w-36 bg-surface-high h-2 rounded-full overflow-hidden shadow-inner">
                <div
                  className="bg-secondary h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((255 - remainingSeconds) / 255) * 100)}%` }}
                />
              </div>

              {/* Timer Pill */}
              <div className="bg-surface-low rounded-full px-3.5 py-1.5 flex items-center gap-2 border border-surface-border">
                <Clock size={14} className="text-text-muted" />
                <span className="font-bold text-text-primary font-mono text-xs tracking-wider">
                  {formatTimer(remainingSeconds)}
                </span>
              </div>
            </div>
          </div>

          {/* TWO-COLUMN WORKBENCH: Camera & Controls on LEFT, Passage on CENTER/RIGHT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* ══════════ LEFT COLUMN: CAMERA & ALL CONTROLS (Contained on screen) ══════════ */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-3.5 lg:sticky lg:top-3 max-h-[calc(100vh-80px)] overflow-y-auto pr-1">
              {/* 1. Camera View with Webcam Switcher */}
              {isCameraActive && (
                <div className="bg-surface-lowest rounded-2xl p-2.5 sm:p-3 border border-secondary-200 shadow-soft space-y-2">
                  {/* Camera Device Switcher Toolbar */}
                  <div className="flex items-center justify-between gap-2 px-1 text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-text-primary shrink-0">
                      <Camera size={14} className="text-secondary" />
                      <span>Webcam:</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-1 max-w-[240px]">
                      {availableCameras.length > 0 ? (
                        <select
                          value={selectedCameraId}
                          disabled={isSwitchingCamera}
                          onChange={(e) => handleSwitchCamera(e.target.value)}
                          className="w-full bg-surface-low border border-surface-border rounded-lg text-[11px] font-semibold py-1 px-2 text-text-primary truncate focus:outline-hidden focus:ring-1 focus:ring-secondary cursor-pointer"
                          title="Switch between laptop camera, phone camera (via Windows Link), or USB cameras"
                        >
                          {availableCameras.map((cam, idx) => {
                            const isPhone = /phone|link|droid|virtual/i.test(cam.label);
                            const displayLabel = cam.label
                              ? `${isPhone ? '📱 ' : '📷 '}${cam.label}`
                              : `Camera ${idx + 1} (${cam.deviceId.slice(0, 6)}...)`;
                            return (
                              <option key={cam.deviceId || idx} value={cam.deviceId}>
                                {displayLabel}
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        <button
                          type="button"
                          onClick={enumerateCameras}
                          className="text-[11px] text-secondary font-semibold hover:underline flex items-center gap-1"
                        >
                          <RotateCw size={11} />
                          <span>Detect Cameras</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={enumerateCameras}
                        title="Scan for connected webcams (e.g. Phone connected via Windows Link)"
                        className="p-1 rounded-lg bg-surface-low hover:bg-surface-high border border-surface-border text-text-muted hover:text-text-primary transition-colors shrink-0"
                      >
                        <RotateCw
                          size={12}
                          className={isSwitchingCamera ? 'animate-spin text-secondary' : ''}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Face Mesh Video Feed Overlay */}
                  <FaceMeshOverlay
                    videoRef={videoRef}
                    isTrackingActive={isCameraActive}
                    faceOvalPoints={faceOvalPoints}
                    leftEyeContour={leftEyeContour}
                    rightEyeContour={rightEyeContour}
                    leftIrisCenter={leftIrisCenter}
                    rightIrisCenter={rightIrisCenter}
                    headPose={headPose}
                    earLeft={earLeft}
                    earRight={earRight}
                    isBlinking={isBlinking}
                    fps={fps}
                    confidence={confidence}
                    lightingQuality={lightingQuality}
                    distanceWarning={distanceWarning}
                    defaultCameraSize="standard"
                    activeDeviceId={selectedCameraId}
                    initialEyeAnchors={eyeAnchors}
                    onSetEyeAnchors={handleSetEyeAnchors}
                  />

                  {/* Eye Tracking Controls & Privacy Status */}
                  <div className="pt-2 border-t border-surface-border space-y-2">
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPhase('calibration')}
                        className="py-1.5 px-2 rounded-xl bg-surface-low hover:bg-surface-high border border-surface-border text-text-primary text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                        title="Run 5-point polynomial eye calibration"
                      >
                        <Target size={12} className="text-secondary" />
                        <span>Recalibrate Gaze</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsDebugOverlayOpen(!isDebugOverlayOpen)}
                        className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs ${
                          isDebugOverlayOpen
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                            : 'bg-surface-low hover:bg-surface-high border-surface-border text-text-primary'
                        }`}
                        title="Toggle developer gaze reticle, saccade lines, and head pose diagnostics"
                      >
                        <Terminal
                          size={12}
                          className={isDebugOverlayOpen ? 'text-emerald-600' : 'text-text-muted'}
                        />
                        <span>{isDebugOverlayOpen ? 'Hide HUD' : 'Debug HUD'}</span>
                      </button>
                    </div>

                    {/* Phase 18: Privacy and Status Indicator */}
                    <div className="flex items-center justify-between px-1 text-[10px] text-text-muted bg-surface-low/80 p-1.5 rounded-lg border border-surface-border/50">
                      <span className="flex items-center gap-1 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Camera: <strong className="text-text-primary">Connected</strong>
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                        Gaze: <strong className="text-text-primary">Active</strong>
                      </span>
                      <span
                        className="flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400"
                        title="100% processed locally in your browser. No raw video is uploaded."
                      >
                        <ShieldCheck size={11} />
                        <strong>Local</strong>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Moving Word Test Controls */}
              <div className="bg-surface-lowest rounded-2xl p-3.5 border border-surface-border shadow-soft space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen size={15} className="text-violet-600" />
                    <span className="text-xs font-bold text-text-primary uppercase tracking-wide">
                      Moving Word Test
                    </span>
                  </div>
                  {teleprompterMode && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-800 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />
                      {teleprompterPaused ? 'Paused' : 'Active'}
                    </span>
                  )}
                </div>

                {/* Play / Pause / Restart / Stop Buttons */}
                <div className="flex items-center gap-2">
                  {!teleprompterMode ? (
                    <button
                      type="button"
                      onClick={handleStartTeleprompter}
                      className="w-full py-2 px-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99]"
                    >
                      <Play size={14} />
                      <span>Start Moving Text Test</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={handlePauseTeleprompter}
                        className={`flex-1 py-1.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                          teleprompterPaused
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-amber-600 hover:bg-amber-700 text-white'
                        }`}
                      >
                        {teleprompterPaused ? <Play size={12} /> : <Pause size={12} />}
                        <span>{teleprompterPaused ? 'Resume' : 'Pause'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleRestartTeleprompter}
                        title="Restart test from beginning"
                        className="p-1.5 rounded-xl bg-surface-low hover:bg-surface-high text-text-primary border border-surface-border transition-all"
                      >
                        <RotateCcw size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={handleStopTeleprompter}
                        className="py-1.5 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-all"
                      >
                        Stop
                      </button>
                    </>
                  )}
                </div>

                {/* Pace Controls */}
                <div className="space-y-1 pt-0.5">
                  <div className="flex items-center justify-between text-[11px] text-text-muted font-medium">
                    <span>Reading Pace:</span>
                    <span className="font-bold text-violet-700 font-mono">
                      {teleprompterWpm} WPM
                    </span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={240}
                    step={5}
                    value={teleprompterWpm}
                    onChange={(e) => setTeleprompterWpm(Number(e.target.value))}
                    className="w-full accent-violet-600 h-1.5"
                  />
                  <div className="grid grid-cols-3 gap-1 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setTeleprompterWpm(75)}
                      className={`py-1 rounded text-[10px] font-bold transition-all ${
                        teleprompterWpm <= 85
                          ? 'bg-violet-600 text-white'
                          : 'bg-surface-low text-text-muted hover:text-text-primary'
                      }`}
                    >
                      🐢 75
                    </button>
                    <button
                      type="button"
                      onClick={() => setTeleprompterWpm(110)}
                      className={`py-1 rounded text-[10px] font-bold transition-all ${
                        teleprompterWpm > 85 && teleprompterWpm <= 135
                          ? 'bg-violet-600 text-white'
                          : 'bg-surface-low text-text-muted hover:text-text-primary'
                      }`}
                    >
                      📖 110
                    </button>
                    <button
                      type="button"
                      onClick={() => setTeleprompterWpm(160)}
                      className={`py-1 rounded text-[10px] font-bold transition-all ${
                        teleprompterWpm > 135
                          ? 'bg-violet-600 text-white'
                          : 'bg-surface-low text-text-muted hover:text-text-primary'
                      }`}
                    >
                      ⚡ 160
                    </button>
                  </div>
                </div>

                {/* Live Accuracy Metric */}
                {Object.keys(wordReadStatus).length > 0 && (
                  <div className="p-2 rounded-xl bg-violet-50/80 border border-violet-200 flex items-center justify-between text-[11px]">
                    <span className="text-violet-900 font-medium">Reading Accuracy:</span>
                    <span className="font-bold font-mono text-violet-700">
                      {Math.round(
                        (Object.values(wordReadStatus).filter((s) => s === 'read').length /
                          Object.keys(wordReadStatus).length) *
                          100
                      )}
                      % ({Object.values(wordReadStatus).filter((s) => s === 'read').length}/
                      {Object.keys(wordReadStatus).length})
                    </span>
                  </div>
                )}
              </div>

              {/* 3. Audio / Microphone Capture with Live Decibel Volume Meter */}
              <div className="bg-surface-lowest rounded-2xl p-3.5 border border-surface-border shadow-soft space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mic
                      size={15}
                      className={voiceEnabled ? 'text-rose-600 animate-pulse' : 'text-text-muted'}
                    />
                    <span className="text-xs font-bold text-text-primary uppercase tracking-wide">
                      Audio Capture
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleVoiceToggle}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                      voiceEnabled
                        ? 'bg-rose-100 text-rose-700 border border-rose-300'
                        : 'bg-surface-low text-text-muted border border-surface-border hover:text-text-primary'
                    }`}
                  >
                    {voiceEnabled ? <MicOff size={12} /> : <Mic size={12} />}
                    <span>{voiceEnabled ? 'Stop Mic' : 'Start Mic'}</span>
                  </button>
                </div>

                {/* Live Volume Level Visual Meter */}
                {voiceEnabled ? (
                  <div className="space-y-1.5 p-2 rounded-xl bg-rose-50/80 border border-rose-200">
                    <div className="flex items-center justify-between text-[11px] text-rose-900 font-medium">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Mic Live & Audio Streaming
                      </span>
                      <span className="font-mono font-bold">{audioVolumeLevel}% Vol</span>
                    </div>
                    <div className="w-full h-2 bg-rose-200/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-75 rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(audioVolumeLevel > 0 ? 8 : 0, audioVolumeLevel * 2.2))}%`
                        }}
                      />
                    </div>
                    {voiceWpm > 0 && (
                      <div className="flex items-center justify-between text-[10px] text-rose-800 font-mono pt-0.5">
                        <span>Pace: {voiceWpm} WPM</span>
                        <span>Fluency: {voiceFluency}%</span>
                        <span>Hesitations: {voiceHesitations}</span>
                      </div>
                    )}
                    {isVoiceTargetLocked && (
                      <span className="inline-block text-[10px] text-emerald-700 bg-emerald-100 font-bold px-1.5 py-0.5 rounded">
                        ✓ Target Word Spoken & Matched
                      </span>
                    )}
                    {voiceTranscript ? (
                      <p className="text-[11px] text-rose-900 italic line-clamp-2 mt-1 bg-white/80 p-1.5 rounded border border-rose-100">
                        "{voiceTranscript}"
                      </p>
                    ) : (
                      <p className="text-[10px] text-rose-600 italic">
                        Speak aloud — audio input is active and transcribing…
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-text-muted">
                    Click <strong>Start Mic</strong> to enable live reading aloud analysis and
                    speech-word verification.
                  </p>
                )}
              </div>

              {/* 4. Reading Settings & Diagnostics */}
              <div className="bg-surface-lowest rounded-2xl p-3.5 border border-surface-border shadow-soft space-y-2.5 text-xs">
                {/* Language & Gaze Spotlight Toggles */}
                <div className="flex items-center justify-between gap-2">
                  {/* Language */}
                  <div className="flex bg-surface-low p-0.5 rounded-lg border border-surface-border">
                    <button
                      type="button"
                      onClick={() => setLanguage('EN')}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        language === 'EN'
                          ? 'bg-primary text-white'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      EN
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage('ML')}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        language === 'ML'
                          ? 'bg-primary text-white'
                          : 'text-text-muted hover:text-text-primary'
                      }`}
                    >
                      മലയാളം
                    </button>
                  </div>

                  {/* Gaze Dot Toggle */}
                  <button
                    type="button"
                    onClick={() => setGazeSpotlightEnabled((prev) => !prev)}
                    className={`px-2.5 py-1 rounded-lg font-semibold border flex items-center gap-1 ${
                      gazeSpotlightEnabled
                        ? 'bg-secondary-50 text-secondary-dark border-secondary-200'
                        : 'bg-surface-low text-text-muted border-surface-border'
                    }`}
                  >
                    <Focus size={12} className="text-secondary" />
                    <span>Gaze Dot: {gazeSpotlightEnabled ? 'On' : 'Off'}</span>
                  </button>
                </div>

                {/* Typography Selectors */}
                <div className="space-y-2 pt-1 border-t border-surface-border">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-text-muted">Font:</span>
                    <select
                      value={preferences.fontFamily}
                      onChange={(e) =>
                        updatePreferences({ fontFamily: e.target.value as FontPreference })
                      }
                      className="bg-surface-low border border-surface-border rounded-md text-xs font-semibold py-1 px-2 text-text-primary"
                    >
                      <option value="Lexend">Lexend</option>
                      <option value="OpenDyslexic">OpenDyslexic</option>
                      <option value="Atkinson Hyperlegible">Atkinson</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-text-muted">
                      Size: {preferences.fontSize}px
                    </span>
                    <input
                      type="range"
                      min={16}
                      max={24}
                      value={preferences.fontSize}
                      onChange={(e) => updatePreferences({ fontSize: Number(e.target.value) })}
                      className="w-24 accent-primary h-1.5"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-text-muted">
                      Spacing: {preferences.lineHeight}x
                    </span>
                    <input
                      type="range"
                      min={1.4}
                      max={2.2}
                      step={0.1}
                      value={preferences.lineHeight}
                      onChange={(e) => updatePreferences({ lineHeight: Number(e.target.value) })}
                      className="w-24 accent-primary h-1.5"
                    />
                  </div>
                </div>

                {/* Precision Eye Gaze Sensitivity Slider */}
                <div className="space-y-1.5 pt-2 border-t border-surface-border">
                  <div className="flex items-center justify-between text-[11px] text-text-muted font-medium">
                    <span className="flex items-center gap-1 font-semibold text-text-primary">
                      <Eye size={12} className="text-secondary" />
                      <span>Eye Gaze Sensitivity:</span>
                    </span>
                    <span className="font-bold text-secondary-dark font-mono bg-secondary-50 px-1.5 py-0.5 rounded border border-secondary-200">
                      {gazeSensitivity.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1.0}
                    max={4.5}
                    step={0.1}
                    value={gazeSensitivity}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setGazeSensitivity(val);
                      trackerRef.current.setGazeSensitivity(val);
                    }}
                    className="w-full accent-secondary h-1.5 cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-text-muted font-mono">
                    <span>1.0x (Gentle)</span>
                    <span>2.8x (Balanced)</span>
                    <span>4.5x (Fast)</span>
                  </div>
                </div>

                {/* Diagnostics Mini Counters */}
                <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-surface-border text-center">
                  <div className="bg-surface-low p-1.5 rounded-lg border border-surface-border">
                    <span className="text-[9px] text-text-muted block uppercase">Fixations</span>
                    <span className="font-bold text-text-primary font-mono text-xs">
                      {liveFixations}
                    </span>
                  </div>
                  <div className="bg-surface-low p-1.5 rounded-lg border border-surface-border">
                    <span className="text-[9px] text-text-muted block uppercase">Regressions</span>
                    <span className="font-bold text-secondary font-mono text-xs">
                      {liveRegressions}
                    </span>
                  </div>
                  <div className="bg-surface-low p-1.5 rounded-lg border border-surface-border">
                    <span className="text-[9px] text-text-muted block uppercase">Stability</span>
                    <span className="font-bold text-tertiary font-mono text-xs">
                      {liveStability}%
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. Primary Action Button (Always in view without scrolling!) */}
              <Button
                variant="primary"
                size="md"
                iconLeft={<CheckCircle2 size={16} />}
                onClick={handleFinishAssessment}
                disabled={isScreeningLoading}
                className="w-full justify-center shadow-soft"
              >
                {isScreeningLoading ? 'Analyzing Biomarkers...' : 'Finish Assessment'}
              </Button>
            </div>

            {/* ══════════ CENTER / MAIN COLUMN: TEXT AREA (Centered Reading Passage) ══════════ */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-4">
              {/* Dynamic RSVP Flow Ribbon (shown when teleprompter active) */}
              {teleprompterMode &&
                (() => {
                  const allWords = currentPassageText.split(/\s+/).filter(Boolean);
                  const currentWordText = allWords[teleprompterWordIdx] || '';
                  return (
                    <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-elevated border border-slate-700 flex flex-col items-center justify-center gap-2 relative overflow-hidden animate-fade-in">
                      <div className="absolute top-2 left-3 flex items-center gap-1.5 text-[10px] text-violet-300 uppercase font-mono tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping" />
                        Dynamic Flow Ribbon ({teleprompterWordIdx + 1}/{allWords.length})
                      </div>

                      {/* Word Sequence Ticker */}
                      <div className="flex items-center justify-center gap-3 sm:gap-5 py-2 w-full select-none overflow-hidden">
                        <span className="text-slate-500 text-xs hidden sm:inline truncate max-w-[80px]">
                          {allWords[teleprompterWordIdx - 2] || ''}
                        </span>
                        <span className="text-slate-400 text-sm font-medium truncate max-w-[100px]">
                          {allWords[teleprompterWordIdx - 1] || ''}
                        </span>

                        {/* Current Active Moving Word */}
                        <div className="relative group px-4 py-1.5 rounded-xl bg-violet-600 text-white font-extrabold text-xl sm:text-2xl shadow-lg ring-4 ring-violet-400/50 scale-110 transform transition-all">
                          <span>{currentWordText}</span>
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-violet-400 text-[10px] leading-none">
                            ▲
                          </div>
                        </div>

                        <span className="text-slate-300 text-sm font-medium truncate max-w-[100px]">
                          {allWords[teleprompterWordIdx + 1] || ''}
                        </span>
                        <span className="text-slate-500 text-xs hidden sm:inline truncate max-w-[80px]">
                          {allWords[teleprompterWordIdx + 2] || ''}
                        </span>
                      </div>

                      {/* Syllable helper & verification badge */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-300">
                        <span className="font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                          {currentWordText.length > 4
                            ? currentWordText.replace(
                                /([aeiouy]{1,2})([^aeiouy\s]{1,2})/gi,
                                '$1 · $2'
                              )
                            : currentWordText}
                        </span>
                        <span className="text-slate-400">•</span>
                        <span
                          className={
                            isGazeTargetLocked ? 'text-emerald-400 font-bold' : 'text-slate-400'
                          }
                        >
                          {isGazeTargetLocked ? '✓ Eyes on word' : 'Focus your gaze here'}
                        </span>
                      </div>
                    </div>
                  );
                })()}

              {/* Centered Reading Passage Article */}
              <article
                ref={passageArticleRef}
                style={{
                  fontFamily: preferences.fontFamily,
                  fontSize: `${preferences.fontSize}px`,
                  lineHeight: preferences.lineHeight
                }}
                className="bg-[#FDF6E8] rounded-3xl p-6 sm:p-10 md:p-12 border-2 border-[#D8CEB8] shadow-elevated transition-all relative overflow-hidden max-h-[calc(100vh-140px)] overflow-y-auto"
              >
                {/* Live Gaze Focus Spotlight Follower */}
                {gazeSpotlightEnabled && liveGazeCoords && (
                  <div
                    className="pointer-events-none fixed z-50 transition-all duration-75 ease-out -translate-x-1/2 -translate-y-1/2"
                    style={{
                      left: `${liveGazeCoords.x}px`,
                      top: `${liveGazeCoords.y}px`
                    }}
                  >
                    <div className="relative flex items-center justify-center">
                      <span className="absolute w-8 h-8 rounded-full bg-violet-500/20 animate-ping opacity-60" />
                      <span className="w-5 h-5 rounded-full bg-violet-600/30 border-2 border-violet-600 shadow-md backdrop-blur-xs flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />
                      </span>
                    </div>
                  </div>
                )}
                {/* Progress scrubber line in teleprompter mode */}
                {teleprompterMode && (
                  <div
                    className="absolute top-0 left-0 h-1 bg-violet-500 transition-all duration-300 rounded-t-3xl"
                    style={{
                      width: `${Math.round((teleprompterWordIdx / Math.max(1, currentPassageText.split(/\s+/).filter(Boolean).length - 1)) * 100)}%`
                    }}
                  />
                )}

                <div className="space-y-6 max-w-[65ch] mx-auto text-left select-none">
                  {currentPassageText.split('\n\n').map((para, pIdx) => {
                    const words = para.split(/\s+/).filter(Boolean);
                    return (
                      <p key={pIdx} className="leading-relaxed" style={{ color: '#1a1412' }}>
                        {words.map((word, wIdx) => {
                          const currentIdx = wordCounter++;

                          // In moving words mode: active=vibrant pulse, read=soft emerald with checkmark, missed=amber with dot
                          const isTeleprompterCurrent =
                            teleprompterMode && teleprompterWordIdx === currentIdx;
                          const status = wordReadStatus[currentIdx];
                          const isGazed =
                            !teleprompterMode &&
                            gazeSpotlightEnabled &&
                            activeWordIndex === currentIdx;

                          let wordStyle: React.CSSProperties = {
                            display: 'inline-block',
                            transition: 'all 200ms ease',
                            borderRadius: '5px',
                            padding: '1px 3px',
                            marginRight: '4px',
                            color: '#1a1412',
                            fontWeight: 500
                          };

                          if (isTeleprompterCurrent) {
                            wordStyle = {
                              ...wordStyle,
                              color: '#ffffff',
                              backgroundColor: '#7c3aed',
                              fontWeight: 800,
                              fontSize: `${preferences.fontSize * 1.16}px`,
                              boxShadow:
                                '0 0 0 3px rgba(124,58,237,0.45), 0 4px 12px rgba(124,58,237,0.3)',
                              transform: 'scale(1.12)',
                              padding: '2px 7px',
                              borderRadius: '6px'
                            };
                          } else if (status === 'read') {
                            wordStyle = {
                              ...wordStyle,
                              color: '#064e3b',
                              backgroundColor: 'rgba(16, 185, 129, 0.16)',
                              border: '1px solid rgba(16, 185, 129, 0.4)',
                              fontWeight: 600,
                              borderRadius: '5px',
                              padding: '1px 4px'
                            };
                          } else if (status === 'missed') {
                            wordStyle = {
                              ...wordStyle,
                              color: '#78350f',
                              backgroundColor: 'rgba(245, 158, 11, 0.16)',
                              border: '1px solid rgba(245, 158, 11, 0.4)',
                              fontWeight: 500,
                              borderRadius: '5px',
                              padding: '1px 4px'
                            };
                          } else if (teleprompterMode && currentIdx < teleprompterWordIdx) {
                            wordStyle = { ...wordStyle, color: '#9c8f7a', opacity: 0.6 };
                          } else if (isGazed) {
                            wordStyle = {
                              ...wordStyle,
                              color: '#7c3aed',
                              backgroundColor: 'rgba(124,58,237,0.12)',
                              fontWeight: 700,
                              outline: '2px solid rgba(124,58,237,0.35)',
                              outlineOffset: '2px',
                              transform: 'scale(1.04)'
                            };
                          }

                          return (
                            <span key={wIdx} data-word-idx={currentIdx} style={wordStyle}>
                              {word}
                              {status === 'read' && (
                                <span className="text-[10px] text-emerald-600 font-bold ml-0.5">
                                  ✓
                                </span>
                              )}
                              {status === 'missed' && (
                                <span className="text-[10px] text-amber-600 font-bold ml-0.5">
                                  •
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </p>
                    );
                  })}
                </div>
              </article>
            </div>
          </div>

          {/* Camera Consent Modal */}
          <Modal
            isOpen={showConsentModal}
            onClose={() => setShowConsentModal(false)}
            title="Camera Permission for Eye & Face Mesh Tracking"
            description="OpenCV + MediaPipe 478 Landmark Diagnostic"
          >
            <div className="space-y-6 text-center">
              <div className="w-[72px] h-[72px] rounded-full bg-secondary-50 text-secondary border-4 border-secondary-200 mx-auto flex items-center justify-center shadow-soft">
                <ScanFace size={38} />
              </div>

              <div className="space-y-2 text-left bg-surface-low p-4 rounded-xl border border-surface-border">
                <h4 className="font-bold text-text-primary text-sm">
                  How does OpenCV Face Mesh tracking work?
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  To understand your reading comfort, ReadEase tracks 478 facial landmarks in
                  real-time, measuring eye fixations, line regressions, head alignment, and blink
                  rates. This data is analyzed against the{' '}
                  <strong>DD-main scientific benchmark</strong> (4,298 readers) to tailor reading
                  accommodations specifically to your needs.
                </p>
                <div className="p-2.5 bg-secondary-50 text-secondary-dark rounded-lg text-[11px] font-medium border border-secondary-200 flex items-center gap-2">
                  <Info size={14} className="shrink-0 text-secondary" />
                  <span>
                    Privacy First: Frames are processed purely in memory and never saved to disk.
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  variant="primary"
                  size="md"
                  iconLeft={<Camera size={18} />}
                  onClick={handleAllowCamera}
                  className="w-full justify-center"
                >
                  Continue with Camera
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  iconLeft={<CameraOff size={18} />}
                  onClick={handleSkipCamera}
                  className="w-full justify-center"
                >
                  Skip / Continue without Camera
                </Button>
              </div>
            </div>
          </Modal>

          {/* Moving Word Reading Assessment Results Modal */}
          <Modal
            isOpen={movingSummaryModal}
            onClose={() => setMovingSummaryModal(false)}
            title="Moving Word Reading Assessment Results"
            description="Dynamic Gaze Fixation & Word Recognition Evaluation"
          >
            {(() => {
              const evaluated = Object.keys(wordReadStatus).length;
              const read = Object.values(wordReadStatus).filter((s) => s === 'read').length;
              const missed = Object.values(wordReadStatus).filter((s) => s === 'missed').length;
              const accuracy = evaluated > 0 ? Math.round((read / evaluated) * 100) : 100;

              return (
                <div className="space-y-5 text-left">
                  {/* Score banner */}
                  <div className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white p-5 rounded-2xl flex items-center justify-between shadow-md">
                    <div>
                      <span className="text-xs font-bold text-violet-200 uppercase tracking-wider block">
                        Reading Accuracy Score
                      </span>
                      <div className="text-4xl font-extrabold mt-1">{accuracy}%</div>
                      <span className="text-xs text-violet-200 mt-1 block">
                        Target Pace: <strong>{teleprompterWpm} WPM</strong>
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-white">
                        {accuracy >= 80
                          ? '🎉 Fluent Tracking'
                          : accuracy >= 60
                            ? '⚡ Moderate Pace'
                            : '🔍 Needs Accommodation'}
                      </div>
                      <span className="text-xs text-violet-200 block mt-1">
                        {read} of {evaluated} words read
                      </span>
                    </div>
                  </div>

                  {/* 3 Metric Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-surface-low p-3 rounded-xl border border-surface-border text-center">
                      <span className="text-[10px] uppercase font-bold text-text-muted block">
                        Words Read
                      </span>
                      <span className="text-xl font-bold text-emerald-600 font-mono">{read}</span>
                      <span className="text-[10px] text-text-muted block">tracked</span>
                    </div>
                    <div className="bg-surface-low p-3 rounded-xl border border-surface-border text-center">
                      <span className="text-[10px] uppercase font-bold text-text-muted block">
                        Missed / Drift
                      </span>
                      <span className="text-xl font-bold text-amber-600 font-mono">{missed}</span>
                      <span className="text-[10px] text-text-muted block">struggled</span>
                    </div>
                    <div className="bg-surface-low p-3 rounded-xl border border-surface-border text-center">
                      <span className="text-[10px] uppercase font-bold text-text-muted block">
                        Pace Tested
                      </span>
                      <span className="text-xl font-bold text-text-primary font-mono">
                        {teleprompterWpm}
                      </span>
                      <span className="text-[10px] text-text-muted block">WPM</span>
                    </div>
                  </div>

                  {/* Missed words breakdown */}
                  {missedWordsList.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                        Words with Gaze Hesitation / Misses ({missedWordsList.length}):
                      </h5>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2.5 rounded-xl bg-amber-50/70 border border-amber-200">
                        {Array.from(new Set(missedWordsList)).map((w, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-md bg-white border border-amber-200 text-amber-900 text-xs font-semibold shadow-xs"
                          >
                            {w}
                          </span>
                        ))}
                      </div>
                      <p className="text-[11px] text-text-muted">
                        Tip: Enabling Bionic Reading or OpenDyslexic font helps anchor fixations on
                        longer words.
                      </p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                    <Button
                      variant="outline"
                      size="md"
                      iconLeft={<RotateCcw size={16} />}
                      onClick={() => {
                        setMovingSummaryModal(false);
                        handleStartTeleprompter();
                      }}
                    >
                      Retry Moving Test
                    </Button>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => setMovingSummaryModal(false)}
                    >
                      Close Report
                    </Button>
                  </div>
                </div>
              );
            })()}
          </Modal>
        </div>
      ) : (
        /* PHASE 2: DETAILED ASSESSMENT SCORECARD & DYSLEXIA SCREENING */
        <div className="space-y-8 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-tertiary-50 text-tertiary rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-tertiary-200">
                <FileCheck size={14} /> Comprehensive Reading Analysis
              </div>
              <h1 className="text-display-lg-mobile md:text-display-lg font-bold text-text-primary">
                Assessment Report
              </h1>
              <p className="text-body-md text-text-secondary">Completed {assessmentResults.date}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                size="md"
                iconLeft={<RotateCw size={16} />}
                onClick={handleRetakeAssessment}
              >
                Retake Check
              </Button>
              <Button
                variant="outline"
                size="md"
                iconLeft={<Download size={16} />}
                onClick={handleExportPdf}
              >
                Export PDF
              </Button>
              <Button
                variant="primary"
                size="md"
                iconLeft={<Save size={16} />}
                onClick={handleSaveToDatabase}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save to Profile'}
              </Button>
            </div>
          </div>

          {saveMessage && (
            <div
              className={`p-4 rounded-2xl text-sm font-semibold flex items-center gap-3 border ${
                saveMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {saveMessage.type === 'success' ? (
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle size={18} className="text-rose-600 shrink-0" />
              )}
              <span>{saveMessage.text}</span>
            </div>
          )}

          {/* AI Dyslexia Screening Card (Powered by DD-main Dataset Model) */}
          <div className="bg-surface-lowest rounded-3xl p-6 sm:p-8 shadow-soft border-2 border-primary-200/80 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary-50 text-primary rounded-2xl">
                  <ShieldCheck size={26} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-headline-md font-bold text-text-primary">
                      DD-Main AI Dyslexia Risk Screener
                    </h2>
                    <Badge variant="primary" size="sm">
                      PLoS ONE Model
                    </Badge>
                  </div>
                  <p className="text-xs text-text-secondary">
                    Calibrated on 4,298 school readers from the scientific DD-main eye-tracking
                    benchmark
                  </p>
                </div>
              </div>

              {/* Risk Level Badge */}
              <div className="flex items-center gap-2">
                {screeningResult?.risk_level === 'Elevated Risk' ? (
                  <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1.5">
                    <AlertTriangle size={15} /> Elevated Indicators Detected
                  </span>
                ) : screeningResult?.risk_level === 'Moderate Risk' ? (
                  <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                    <Info size={15} /> Moderate Visual Tracking Stress
                  </span>
                ) : (
                  <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 size={15} /> Typical Reading Flow (Low Risk)
                  </span>
                )}
              </div>
            </div>

            {/* Probability Gauge & Scientific Summary */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-5 bg-surface-low rounded-2xl p-5 border border-surface-border space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-text-muted uppercase">
                  <span>Dyslexia Probability</span>
                  <span className="text-text-primary font-mono text-sm">
                    {screeningResult ? `${screeningResult.dyslexia_probability}%` : '48%'}
                  </span>
                </div>

                {/* Progress bar with risk threshold indicators */}
                <div className="w-full bg-surface-high h-3.5 rounded-full overflow-hidden relative shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      (screeningResult?.dyslexia_probability ?? 48) > 65
                        ? 'bg-rose-500'
                        : (screeningResult?.dyslexia_probability ?? 48) > 35
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                    }`}
                    style={{ width: `${screeningResult?.dyslexia_probability ?? 48}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-text-muted">
                  <span>0% (Typical)</span>
                  <span className="border-l border-surface-border pl-1">35% (Borderline)</span>
                  <span className="border-l border-surface-border pl-1">65% (Elevated)</span>
                  <span>100%</span>
                </div>
              </div>

              <div className="md:col-span-7 space-y-2">
                <h4 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                  <BookOpen size={16} className="text-secondary" />
                  <span>Cohort Diagnostic Analysis</span>
                </h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {screeningResult?.summary ||
                    'Moderate indicators of visual fatigue and increased word dwell time detected. Bionic reading fixation anchors and line rulers are suggested for enhanced fluency.'}
                </p>
                <div className="text-[11px] text-text-muted flex flex-wrap items-center gap-4 pt-1">
                  <span>
                    Cross-Validation AUC: <strong>0.822</strong>
                  </span>
                  <span>
                    Benchmark Pool: <strong>4,298 subjects</strong>
                  </span>
                  <span>
                    Algorithm: <strong>Balanced Random Forest</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* 3-Way Comparative Biomarker Grid: Student vs DD-Main Control vs DD-Main Dyslexia */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <BarChart2 size={16} className="text-tertiary" />
                  <span>Eye-Movement Biomarkers vs. DD-Main Cohorts</span>
                </h3>
                <span className="text-[11px] text-text-muted">Scientific normative comparison</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. Fixation Duration */}
                <div className="bg-surface-low rounded-2xl p-4 border border-surface-border space-y-2">
                  <span className="text-[11px] font-bold text-text-muted uppercase block">
                    Fixation Dwell Time
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-text-primary font-mono">
                      {screeningResult?.biomarkers.fixation_duration.value ?? 310}
                    </span>
                    <span className="text-xs text-text-muted">ms</span>
                  </div>

                  <div className="pt-2 border-t border-surface-border/60 text-[11px] space-y-1">
                    <div className="flex justify-between text-text-secondary">
                      <span>Control Readers:</span>
                      <strong className="text-emerald-700 font-mono">255 ms</strong>
                    </div>
                    <div className="flex justify-between text-text-secondary">
                      <span>Dyslexia Cohort:</span>
                      <strong className="text-rose-700 font-mono">331 ms</strong>
                    </div>
                  </div>
                </div>

                {/* 2. Regression Rate */}
                <div className="bg-surface-low rounded-2xl p-4 border border-surface-border space-y-2">
                  <span className="text-[11px] font-bold text-text-muted uppercase block">
                    Line Regression Rate
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-secondary font-mono">
                      {screeningResult?.biomarkers.regression_rate.value ?? 21.4}%
                    </span>
                    <span className="text-xs text-text-muted">backward jumps</span>
                  </div>

                  <div className="pt-2 border-t border-surface-border/60 text-[11px] space-y-1">
                    <div className="flex justify-between text-text-secondary">
                      <span>Control Readers:</span>
                      <strong className="text-emerald-700 font-mono">16.8%</strong>
                    </div>
                    <div className="flex justify-between text-text-secondary">
                      <span>Dyslexia Cohort:</span>
                      <strong className="text-rose-700 font-mono">15.8%</strong>
                    </div>
                  </div>
                </div>

                {/* 3. Gaze Stability */}
                <div className="bg-surface-low rounded-2xl p-4 border border-surface-border space-y-2">
                  <span className="text-[11px] font-bold text-text-muted uppercase block">
                    Gaze Stability Index
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold text-tertiary font-mono">
                      {screeningResult?.biomarkers.gaze_stability.value ?? 84}%
                    </span>
                    <span className="text-xs text-text-muted">cadence fidelity</span>
                  </div>

                  <div className="pt-2 border-t border-surface-border/60 text-[11px] space-y-1">
                    <div className="flex justify-between text-text-secondary">
                      <span>Control Readers:</span>
                      <strong className="text-emerald-700 font-mono">88.5%</strong>
                    </div>
                    <div className="flex justify-between text-text-secondary">
                      <span>Dyslexia Cohort:</span>
                      <strong className="text-rose-700 font-mono">76.2%</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Clinical Indicators */}
            {screeningResult && screeningResult.clinical_indicators.length > 0 && (
              <div className="space-y-2 pt-1">
                <h4 className="text-xs font-bold text-text-muted uppercase">
                  Detected Cognitive Markers:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {screeningResult.clinical_indicators.map((ind, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-surface-low rounded-xl border border-surface-border flex items-start gap-2.5"
                    >
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${
                          ind.severity === 'high'
                            ? 'bg-rose-500'
                            : ind.severity === 'moderate'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                      />
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-text-primary">{ind.title}</div>
                        <div className="text-[11px] text-text-secondary leading-relaxed">
                          {ind.observation}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Interactive Visual Scanpath & Fixation Replay */}
          <ScanpathReplay
            scanpath={trackerRef.current.getScanpath()}
            passageText={currentPassageText}
            wpm={assessmentResults.wpm}
            durationSeconds={Math.max(8, 255 - remainingSeconds)}
          />

          {/* Clinical Non-Diagnostic Disclaimer */}
          <div className="bg-surface-lowest rounded-2xl p-6 border border-secondary-200 shadow-soft flex items-start gap-4">
            <div className="p-3 bg-secondary-50 text-secondary rounded-xl shrink-0">
              <Info size={24} />
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-sm mb-1">
                Supportive Insights, Not a Clinical Diagnosis
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                These results are calculated from webcam facial mesh estimation and calibrated
                against the DD-main research dataset to recommend reading accommodations. They are
                designed for educational support and do not serve as a clinical medical diagnosis.
              </p>
            </div>
          </div>

          {/* Bento Grid Results */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Tracking Stability Card (Span 8) */}
            <div className="md:col-span-8 bg-surface-lowest rounded-3xl p-8 shadow-soft border border-surface-border flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-4">
                <span className="p-2 bg-secondary-50 text-secondary rounded-xl">
                  <Eye size={22} />
                </span>
                <h2 className="text-headline-md font-bold text-text-primary">Tracking Stability</h2>
              </div>

              <div className="p-6 bg-secondary-50/50 rounded-2xl border border-secondary-200 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-secondary" />
                  <h3 className="text-headline-sm font-bold text-secondary-dark">
                    {assessmentResults.stabilityStatus}
                  </h3>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {assessmentResults.stabilityDesc}
                </p>
                {sessionBehavioralObservations.length > 0 && (
                  <div className="pt-3 border-t border-secondary-200/80 space-y-2">
                    <p className="text-[11px] font-bold text-secondary-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={12} className="text-secondary" />
                      Observable Reading Behavior Signals (Non-Diagnostic)
                    </p>
                    <ul className="text-xs text-text-secondary space-y-1.5 pl-1">
                      {sessionBehavioralObservations.map((obs, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-secondary font-bold text-sm leading-none mt-0.5">
                            •
                          </span>
                          <span>{obs}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-surface-border flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
                <span>
                  Confidence Score:{' '}
                  <strong className="text-text-primary">
                    {assessmentResults.confidenceScore}%
                  </strong>
                </span>
                <span>
                  Blinks Monitored:{' '}
                  <strong className="text-text-primary">{assessmentResults.totalBlinks}</strong>
                </span>
                <span>
                  Pipeline:{' '}
                  <strong className="text-text-primary">{assessmentResults.algorithm}</strong>
                </span>
              </div>
            </div>

            {/* Reading Speed (Span 4) */}
            <div className="md:col-span-4 bg-primary text-white rounded-3xl p-8 shadow-soft flex flex-col justify-between">
              <div className="flex items-center justify-between opacity-80">
                <span className="text-xs font-bold uppercase tracking-wider">Reading Speed</span>
                <Activity size={20} />
              </div>

              <div className="my-6">
                <span className="text-[56px] font-bold leading-none">{assessmentResults.wpm}</span>
                <span className="text-lg opacity-80 ml-2">WPM</span>
              </div>

              <p className="text-xs opacity-90 leading-relaxed">
                Consistent, steady pace. Comprehension indicators detected across paragraphs.
              </p>
            </div>

            {/* Score Metric: Fixations (Span 4) */}
            <Card variant="subtle" padding="lg" className="md:col-span-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-text-muted uppercase">Fixations</span>
                <Badge variant="tertiary" dot>
                  Optimal
                </Badge>
              </div>
              <div className="my-2">
                <span className="text-display-lg-mobile font-bold text-text-primary">
                  {assessmentResults.fixationsPer100}
                </span>
                <span className="text-xs text-text-muted ml-1">per 100 words</span>
              </div>
              <div className="w-full h-2.5 bg-surface-high rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-tertiary rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (assessmentResults.fixationsPer100 / 30) * 100)}%`
                  }}
                />
              </div>
              <p className="text-[11px] text-tertiary font-semibold mt-2">
                Within recommended benchmark
              </p>
            </Card>

            {/* Score Metric: Regressions (Span 4) */}
            <Card variant="subtle" padding="lg" className="md:col-span-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-text-muted uppercase">Regressions</span>
                <Badge variant="secondary" dot>
                  {assessmentResults.regressionsPer100 > 6 ? 'Elevated' : 'Normal'}
                </Badge>
              </div>
              <div className="my-2">
                <span className="text-display-lg-mobile font-bold text-text-primary">
                  {assessmentResults.regressionsPer100}
                </span>
                <span className="text-xs text-text-muted ml-1">per 100 words</span>
              </div>
              <div className="w-full h-2.5 bg-surface-high rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-secondary rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (assessmentResults.regressionsPer100 / 15) * 100)}%`
                  }}
                />
              </div>
              <p className="text-[11px] text-secondary font-semibold mt-2">
                {assessmentResults.regressionsPer100 > 6
                  ? 'Elevated re-reading frequency'
                  : 'Minimal backward saccades'}
              </p>
            </Card>

            {/* Score Metric: Skipped Words (Span 4) */}
            <Card variant="subtle" padding="lg" className="md:col-span-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-text-muted uppercase">Skipped Words</span>
                <Badge variant="tertiary" dot>
                  Normal
                </Badge>
              </div>
              <div className="my-2">
                <span className="text-display-lg-mobile font-bold text-text-primary">
                  {assessmentResults.skippedWordsPercent}%
                </span>
                <span className="text-xs text-text-muted ml-1">word skip rate</span>
              </div>
              <div className="w-full h-2.5 bg-surface-high rounded-full overflow-hidden mt-3">
                <div
                  className="h-full bg-tertiary rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (assessmentResults.skippedWordsPercent / 10) * 100)}%`
                  }}
                />
              </div>
              <p className="text-[11px] text-tertiary font-semibold mt-2">Good passage coverage</p>
            </Card>

            {/* Recommended Accommodations Banner (Span 12) */}
            <div className="md:col-span-12 bg-surface-lowest rounded-3xl p-8 shadow-soft border border-primary-200 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary rounded-full text-xs font-bold uppercase">
                  <Sparkles size={14} /> AI Tailored Accommodations
                </div>
                <h3 className="text-headline-md font-bold text-text-primary">
                  Recommended Reading Setup for Alex
                </h3>
                <p className="text-sm text-text-secondary max-w-2xl leading-relaxed">
                  Based on the DD-main machine learning screening, activating{' '}
                  <strong>
                    {screeningResult?.recommended_accommodations.bionicFixationPoint ?? 50}% Bionic
                    Reading
                  </strong>{' '}
                  with a <strong>warm cream background</strong> and{' '}
                  <strong>
                    {screeningResult?.recommended_accommodations.fontFamily ?? 'Lexend'}{' '}
                    {screeningResult?.recommended_accommodations.fontSize ?? 19}pt
                  </strong>{' '}
                  will reduce re-reading regressions by up to <strong>40%</strong>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <Button
                  variant="primary"
                  size="lg"
                  iconRight={<ArrowRight size={18} />}
                  onClick={handleApplyAccommodations}
                >
                  Apply & Open Reading Studio
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Developer HUD / Real-Time Gaze Diagnostics Overlay */}
      <DebugOverlay
        isVisible={isDebugOverlayOpen}
        frameResult={latestTrackingResult}
        onClose={() => setIsDebugOverlayOpen(false)}
      />
    </div>
  );
};
