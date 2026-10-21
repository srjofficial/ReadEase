import React, { useEffect, useRef, useState } from 'react';
import { Eye, Activity, Target, Compass, SunMedium, AlertTriangle, Maximize2 } from 'lucide-react';
import type { Point2D, HeadPoseState } from '../../utils/faceMeshTracker';

export type WireframeMode = 'full' | 'contours' | 'minimal' | 'off';
export type CameraSize = 'standard' | 'large' | 'cinema';

interface FaceMeshOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isTrackingActive: boolean;
  faceOvalPoints?: Point2D[];
  leftEyeContour?: Point2D[];
  rightEyeContour?: Point2D[];
  leftIrisCenter?: Point2D;
  rightIrisCenter?: Point2D;
  headPose: HeadPoseState;
  earLeft: number;
  earRight: number;
  isBlinking: boolean;
  fps: number;
  confidence: number;
  lightingQuality: 'optimal' | 'dim' | 'harsh' | 'unknown';
  distanceWarning?: string | null;
  className?: string;
  defaultCameraSize?: CameraSize;
  activeDeviceId?: string;
  initialEyeAnchors?: { left: Point2D | null; right: Point2D | null };
  onSetEyeAnchors?: (anchors: { left: Point2D | null; right: Point2D | null }) => void;
  onModeChange?: (mode: WireframeMode) => void;
  onSizeChange?: (size: CameraSize) => void;
}

const FaceMeshOverlayComponent: React.FC<FaceMeshOverlayProps> = ({
  videoRef,
  isTrackingActive,
  faceOvalPoints = [],
  leftEyeContour = [],
  rightEyeContour = [],
  leftIrisCenter,
  rightIrisCenter,
  headPose,
  earLeft,
  earRight,
  isBlinking,
  fps,
  confidence,
  lightingQuality,
  distanceWarning,
  className = '',
  defaultCameraSize = 'large',
  activeDeviceId,
  initialEyeAnchors,
  onSetEyeAnchors,
  onModeChange,
  onSizeChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [wireframeMode, setWireframeMode] = useState<WireframeMode>('full');
  const [cameraSize, setCameraSize] = useState<CameraSize>(defaultCameraSize);

  // Interactive Eye Pinpoint / Calibration State
  const [isPinpointMode, setIsPinpointMode] = useState<boolean>(false);
  const [pinpointStep, setPinpointStep] = useState<'left' | 'right' | 'done'>('left');
  const [frozenSnapshot, setFrozenSnapshot] = useState<string | null>(null);
  const [userAnchors, setUserAnchors] = useState<{ left: Point2D | null; right: Point2D | null }>(
    initialEyeAnchors || { left: null, right: null }
  );

  const handleToggleMode = (newMode: WireframeMode) => {
    setWireframeMode(newMode);
    onModeChange?.(newMode);
  };

  const handleToggleSize = (newSize: CameraSize) => {
    setCameraSize(newSize);
    onSizeChange?.(newSize);
  };

  const handleTogglePinpoint = () => {
    if (isPinpointMode) {
      setIsPinpointMode(false);
      setFrozenSnapshot(null);
      return;
    }

    // Freeze snapshot from video for steady, motionless eye clicking
    const video = localVideoRef.current || videoRef.current;
    if (video && video.videoWidth > 0) {
      try {
        const snapCanvas = document.createElement('canvas');
        snapCanvas.width = video.videoWidth;
        snapCanvas.height = video.videoHeight;
        const snapCtx = snapCanvas.getContext('2d');
        if (snapCtx) {
          snapCtx.drawImage(video, 0, 0);
          setFrozenSnapshot(snapCanvas.toDataURL('image/jpeg', 0.92));
        }
      } catch {
        setFrozenSnapshot(null);
      }
    }

    setIsPinpointMode(true);
    setPinpointStep('left');
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPinpointMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const video = localVideoRef.current || videoRef.current;
    const vW = video?.videoWidth || rect.width;
    const vH = video?.videoHeight || rect.height;

    const videoAspect = vW / (vH || 1);
    const containerAspect = rect.width / (rect.height || 1);

    let renderW = rect.width;
    let renderH = rect.height;
    let offsetX = 0;
    let offsetY = 0;

    if (videoAspect > containerAspect) {
      renderW = rect.height * videoAspect;
      offsetX = (renderW - rect.width) / 2;
    } else {
      renderH = rect.width / videoAspect;
      offsetY = (renderH - rect.height) / 2;
    }

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const uncroppedX = clickX + offsetX;
    const uncroppedY = clickY + offsetY;

    const visualX = Math.max(0, Math.min(1, uncroppedX / renderW));
    const visualY = Math.max(0, Math.min(1, uncroppedY / renderH));

    // Video has CSS scale-x-[-1], so raw camera sensor X = 1 - visualX
    const sensorX = Number((1 - visualX).toFixed(4));
    const sensorY = Number(visualY.toFixed(4));

    if (pinpointStep === 'left') {
      const updated = { ...userAnchors, left: { x: sensorX, y: sensorY } };
      setUserAnchors(updated);
      setPinpointStep('right');
    } else {
      const updated = { ...userAnchors, right: { x: sensorX, y: sensorY } };
      setUserAnchors(updated);
      setPinpointStep('done');
      if (updated.left) {
        onSetEyeAnchors?.(updated);
      }
    }
  };

  const handleFinishPinpoint = () => {
    setIsPinpointMode(false);
    setFrozenSnapshot(null);
    if (userAnchors.left && userAnchors.right) {
      onSetEyeAnchors?.(userAnchors);
    }
  };

  const handleResetToAuto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUserAnchors({ left: null, right: null });
    setIsPinpointMode(false);
    setFrozenSnapshot(null);
    onSetEyeAnchors?.({ left: null, right: null });
  };

  // Store incoming mesh points in a ref so the RAF canvas loop never cancels and restarts on prop updates
  const meshPointsRef = useRef({
    faceOvalPoints,
    leftEyeContour,
    rightEyeContour,
    leftIrisCenter,
    rightIrisCenter,
    headPose,
    isBlinking,
    userAnchors
  });
  meshPointsRef.current = {
    faceOvalPoints,
    leftEyeContour,
    rightEyeContour,
    leftIrisCenter,
    rightIrisCenter,
    headPose,
    isBlinking,
    userAnchors
  };

  // Continuous Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isTrackingActive || wireframeMode === 'off') {
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrameId: number;

    const render = () => {
      const {
        faceOvalPoints: fPoints,
        leftEyeContour: lEye,
        rightEyeContour: rEye,
        leftIrisCenter: lIris,
        rightIrisCenter: rIris,
        headPose: hPose,
        isBlinking: blinking,
        userAnchors: anchors
      } = meshPointsRef.current;

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const video = localVideoRef.current || videoRef.current;
      const vW = video?.videoWidth || width;
      const vH = video?.videoHeight || height;

      // Handle CSS object-cover letterboxing/cropping
      const videoAspect = vW / (vH || 1);
      const canvasAspect = width / (height || 1);

      let renderW = width;
      let renderH = height;
      let offsetX = 0;
      let offsetY = 0;

      if (videoAspect > canvasAspect) {
        renderW = height * videoAspect;
        offsetX = (renderW - width) / 2;
      } else {
        renderH = width / videoAspect;
        offsetY = (renderH - height) / 2;
      }

      // Helper to convert normalized (0..1) coordinates to canvas pixels (mirrored for webcam)
      const toPx = (pt: Point2D): [number, number] => {
        const px = (1 - pt.x) * renderW - offsetX;
        const py = pt.y * renderH - offsetY;
        return [px, py];
      };

      // 1. Draw Face Oval Wireframe (Full mode)
      if (wireframeMode === 'full' && fPoints.length > 2) {
        ctx.beginPath();
        const [firstX, firstY] = toPx(fPoints[0]);
        ctx.moveTo(firstX, firstY);

        for (let i = 1; i < fPoints.length; i++) {
          const [px, py] = toPx(fPoints[i]);
          ctx.lineTo(px, py);
        }
        ctx.closePath();

        // Glowing cyberpunk / clinical teal stroke
        ctx.strokeStyle = 'rgba(20, 184, 166, 0.75)'; // Teal-500
        ctx.lineWidth = 1.8;
        ctx.shadowColor = 'rgba(20, 184, 166, 0.4)';
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Subtle mesh vertices
        ctx.fillStyle = 'rgba(45, 212, 191, 0.9)';
        for (let i = 0; i < fPoints.length; i += 3) {
          const [px, py] = toPx(fPoints[i]);
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 2. Draw Eye Contours (Full & Contours modes)
      if (wireframeMode === 'full' || wireframeMode === 'contours') {
        const drawContour = (pts: Point2D[], strokeColor: string) => {
          if (pts.length < 3) return;
          ctx.beginPath();
          const [fx, fy] = toPx(pts[0]);
          ctx.moveTo(fx, fy);
          for (let i = 1; i < pts.length; i++) {
            const [px, py] = toPx(pts[i]);
            ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1.6;
          ctx.stroke();
        };

        const eyeColor = blinking ? 'rgba(239, 68, 68, 0.85)' : 'rgba(99, 102, 241, 0.85)';
        drawContour(lEye, eyeColor);
        drawContour(rEye, eyeColor);
      }

      // 3. Draw User Eye Anchors & Iris Pupils (All non-off modes)
      const drawAnchor = (anchor: Point2D | null, label: string) => {
        if (!anchor) return;
        const [ax, ay] = toPx(anchor);
        ctx.save();
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.95)'; // Cyan-500
        ctx.lineWidth = 1.6;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.arc(ax, ay, 13, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
        ctx.fill();

        ctx.fillStyle = 'rgba(6, 182, 212, 0.95)';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(label, ax - 11, ay - 16);
        ctx.restore();
      };

      drawAnchor(anchors.left, 'L Eye');
      drawAnchor(anchors.right, 'R Eye');

      const drawIris = (irisCenter?: Point2D) => {
        if (!irisCenter) return;
        const [ix, iy] = toPx(irisCenter);

        // Iris Crosshairs
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.95)'; // Amber
        ctx.lineWidth = 1.6;
        const crosshairSize = 8;

        ctx.beginPath();
        ctx.moveTo(ix - crosshairSize, iy);
        ctx.lineTo(ix + crosshairSize, iy);
        ctx.moveTo(ix, iy - crosshairSize);
        ctx.lineTo(ix, iy + crosshairSize);
        ctx.stroke();

        // Glowing Iris pupil center circle
        ctx.beginPath();
        ctx.arc(ix, iy, blinking ? 2 : 4, 0, Math.PI * 2);
        ctx.fillStyle = blinking ? 'rgba(239, 68, 68, 0.9)' : 'rgba(251, 191, 36, 0.95)';
        ctx.shadowColor = 'rgba(245, 158, 11, 0.7)';
        ctx.shadowBlur = 5;
        ctx.fill();
        ctx.shadowBlur = 0;
      };

      drawIris(lIris);
      drawIris(rIris);

      // 4. Draw Head Pose Orientation Target Box (Full mode)
      if (wireframeMode === 'full') {
        const boxSize = 28;
        const centerX = width / 2 - hPose.yaw * 1.8;
        const centerY = height / 2 + hPose.pitch * 1.5;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate((-hPose.roll * Math.PI) / 180);

        ctx.strokeStyle =
          hPose.alignment === 'centered'
            ? 'rgba(16, 185, 129, 0.7)' // Emerald green
            : 'rgba(245, 158, 11, 0.8)'; // Amber warning
        ctx.lineWidth = 1.4;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(-boxSize / 2, -boxSize / 2, boxSize, boxSize);
        ctx.setLineDash([]);
        ctx.restore();
      }

      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameId);
  }, [isTrackingActive, wireframeMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const box = containerRef.current;
    if (!canvas || !box) return;
    const update = () => {
      const r = box.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        canvas.width = Math.round(r.width);
        canvas.height = Math.round(r.height);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const syncStream = () => {
      if (localVideoRef.current && videoRef.current && videoRef.current.srcObject) {
        if (localVideoRef.current.srcObject !== videoRef.current.srcObject) {
          localVideoRef.current.srcObject = videoRef.current.srcObject;
          localVideoRef.current.play().catch(() => {});
        }
      }
    };
    syncStream();
    const interval = setInterval(syncStream, 400);
    return () => clearInterval(interval);
  }, [videoRef, isTrackingActive, activeDeviceId]);

  const avgEar = ((earLeft + earRight) / 2).toFixed(2);

  const containerSizeClass = {
    standard: 'max-w-[480px] aspect-[4/3]',
    large: 'max-w-[760px] aspect-[16/10] sm:aspect-[16/9] min-h-[300px]',
    cinema: 'max-w-full aspect-[16/9] min-h-[360px] sm:min-h-[420px]'
  }[cameraSize];

  return (
    <div className={`relative flex flex-col gap-2 transition-all duration-300 ${className}`}>
      {/* Container holding Video, Snapshot, and Canvas Wireframe */}
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        className={`relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shadow-md w-full mx-auto transition-all duration-300 ${containerSizeClass} ${
          isPinpointMode ? 'cursor-crosshair ring-2 ring-teal-400' : ''
        }`}
      >
        {/* Underneath Video */}
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={() => localVideoRef.current?.play().catch(() => {})}
          className={`w-full h-full object-cover scale-x-[-1] ${isPinpointMode && frozenSnapshot ? 'hidden' : 'block'}`}
        />

        {/* Frozen Video Frame for Calm Eye Pinpointing */}
        {isPinpointMode && frozenSnapshot && (
          <img
            src={frozenSnapshot}
            alt="Frozen eye frame"
            className="w-full h-full object-cover scale-x-[-1] pointer-events-none select-none"
          />
        )}

        {/* HTML5 Wireframe Mesh Canvas Overlay */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        />

        {/* Interactive Pinpoint Eyes Instructional Banner */}
        {isPinpointMode && (
          <div className="absolute top-10 left-2 right-2 bg-slate-950/94 border border-teal-500/80 text-white p-2.5 rounded-xl shadow-xl z-30 flex items-center justify-between gap-2 animate-fade-in pointer-events-auto">
            <div className="space-y-0.5">
              <span className="font-bold text-teal-400 text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
                {pinpointStep === 'left'
                  ? 'Step 1: Click on your LEFT pupil on screen'
                  : pinpointStep === 'right'
                    ? 'Step 2: Click on your RIGHT pupil on screen'
                    : '✓ Eyes Calibrated! Click Done to resume live tracking.'}
              </span>
              <p className="text-[10px] text-slate-300">
                {pinpointStep === 'done'
                  ? 'Anchors saved! Tracking will now stay locked on your pupils.'
                  : 'Frame is paused so you can click accurately without head movement.'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {pinpointStep === 'done' ? (
                <button
                  type="button"
                  onClick={handleFinishPinpoint}
                  className="px-2.5 py-1 rounded-lg bg-teal-500 hover:bg-teal-400 text-black font-bold text-xs shadow-xs"
                >
                  Done
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsPinpointMode(false);
                    setFrozenSnapshot(null);
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                >
                  Cancel
                </button>
              )}
              {userAnchors.left && (
                <button
                  type="button"
                  onClick={handleResetToAuto}
                  title="Clear anchors and return to automatic eye detection"
                  className="px-2 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-700/50 text-rose-300 text-[10px]"
                >
                  Auto
                </button>
              )}
            </div>
          </div>
        )}

        {/* Top Floating Badge: Mode Toggle, Camera Size, & Blink Indicator */}
        <div className="absolute top-2 left-2 right-2 flex flex-wrap items-center justify-between gap-2 z-20 pointer-events-auto">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[10px] font-mono text-white border border-white/10">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isBlinking
                  ? 'bg-rose-500 animate-ping'
                  : isTrackingActive
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-amber-400'
              }`}
            />
            <span>{isBlinking ? 'BLINK' : 'TRACKING'}</span>
            <span className="text-white/40">|</span>
            <span>{fps} FPS</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Camera View Size Switcher */}
            <div className="flex items-center bg-black/60 backdrop-blur-xs rounded-full p-0.5 border border-white/10 text-[9px]">
              <span className="text-white/40 px-1 font-mono hidden sm:inline">Cam:</span>
              <button
                type="button"
                title="Standard Camera View (480px)"
                onClick={() => handleToggleSize('standard')}
                className={`px-2 py-0.5 rounded-full font-bold transition-all ${
                  cameraSize === 'standard'
                    ? 'bg-secondary text-white shadow-xs'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Std
              </button>
              <button
                type="button"
                title="Large Camera View (760px)"
                onClick={() => handleToggleSize('large')}
                className={`px-2 py-0.5 rounded-full font-bold transition-all ${
                  cameraSize === 'large'
                    ? 'bg-secondary text-white shadow-xs'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Large
              </button>
              <button
                type="button"
                title="Wide Screen Camera View (Full Width)"
                onClick={() => handleToggleSize('cinema')}
                className={`px-2 py-0.5 rounded-full font-bold transition-all flex items-center gap-1 ${
                  cameraSize === 'cinema'
                    ? 'bg-secondary text-white shadow-xs'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Maximize2 size={9} />
                <span>Wide</span>
              </button>
            </div>

            {/* Wireframe Mode Switcher */}
            <div className="flex items-center bg-black/60 backdrop-blur-xs rounded-full p-0.5 border border-white/10">
              <button
                type="button"
                title="Full Face Mesh Wireframe"
                onClick={() => handleToggleMode('full')}
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold transition-all ${
                  wireframeMode === 'full'
                    ? 'bg-teal-500 text-white shadow-xs'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Full
              </button>
              <button
                type="button"
                title="Contours & Iris"
                onClick={() => handleToggleMode('contours')}
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold transition-all ${
                  wireframeMode === 'contours'
                    ? 'bg-teal-500 text-white shadow-xs'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Eyes
              </button>
              <button
                type="button"
                title="Minimalist"
                onClick={() => handleToggleMode('minimal')}
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold transition-all ${
                  wireframeMode === 'minimal'
                    ? 'bg-teal-500 text-white shadow-xs'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Min
              </button>
            </div>

            {/* Pinpoint / Calibrate Eyes Button */}
            <button
              type="button"
              onClick={handleTogglePinpoint}
              title="Pinpoint your eye positions by clicking directly on your pupils"
              className={`px-2 py-0.5 rounded-full text-[9px] font-bold transition-all flex items-center gap-1 shadow-xs ${
                isPinpointMode
                  ? 'bg-amber-400 text-black animate-pulse'
                  : userAnchors.left && userAnchors.right
                    ? 'bg-teal-600/90 text-white border border-teal-400'
                    : 'bg-black/60 text-white/80 hover:text-white border border-white/10'
              }`}
            >
              <Target size={11} className={isPinpointMode ? 'text-black' : 'text-teal-300'} />
              <span>
                {isPinpointMode
                  ? 'Pinpointing...'
                  : userAnchors.left
                    ? 'Eyes Locked'
                    : 'Pinpoint Eyes'}
              </span>
            </button>
          </div>
        </div>

        {/* Bottom Alignment & Lighting Bar */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-20 text-[10px] pointer-events-none">
          <div className="px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-xs text-white/90 border border-white/10 flex items-center gap-1">
            <Compass size={11} className="text-teal-400" />
            <span className="capitalize">{headPose.alignment.replace('_', ' ')}</span>
          </div>

          <div className="px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-xs text-white/90 border border-white/10 flex items-center gap-1 font-mono">
            <Eye size={11} className="text-amber-400" />
            <span>EAR {avgEar}</span>
          </div>
        </div>

        {/* Distance Warning Banner if student is too far/close */}
        {distanceWarning && (
          <div className="absolute inset-x-2 top-10 bg-amber-500/90 text-black text-[10px] font-bold px-2 py-1 rounded-md text-center shadow-lg backdrop-blur-xs flex items-center justify-center gap-1 z-30">
            <AlertTriangle size={12} />
            <span>{distanceWarning}</span>
          </div>
        )}
      </div>

      {/* Telemetry Strip below camera */}
      <div className="flex items-center justify-between gap-2 px-1 text-[11px] text-text-muted">
        <div className="flex items-center gap-1">
          <Eye size={12} className="text-secondary" />
          <span>
            Conf:{' '}
            <strong className="text-text-primary font-mono">{Math.round(confidence * 100)}%</strong>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <SunMedium size={12} className="text-amber-500" />
          <span className="capitalize">{lightingQuality} Light</span>
        </div>
        <div className="flex items-center gap-1">
          <Activity size={12} className="text-tertiary" />
          <span>
            Roll: <strong className="text-text-primary font-mono">{headPose.roll}°</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
export const FaceMeshOverlay = React.memo(FaceMeshOverlayComponent);
