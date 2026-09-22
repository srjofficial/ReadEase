/**
 * Developer & Debug Overlay HUD
 *
 * Visualizes in real time:
 * - Filtered vs. Raw gaze points
 * - Active fixation bubble with dwell counter
 * - Head pose orientation meters
 * - Observable facial cues
 * - Active line and word bounding boxes
 * - Real-time FPS and latency
 */

import React from 'react';
import type { TrackingFrameResult } from '../EyeTrackerPipeline';
import { Compass, Sparkles, Terminal } from 'lucide-react';

interface DebugOverlayProps {
  isVisible: boolean;
  frameResult: TrackingFrameResult | null;
  onClose?: () => void;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({ isVisible, frameResult, onClose }) => {
  if (!isVisible || !frameResult) return null;

  const {
    screenX,
    screenY,
    rawGazeX,
    rawGazeY,
    pixelX,
    pixelY,
    velocityPxPerMs,
    activeWordIndex,
    activeWordText,
    activeLineIndex,
    isFixating,
    activeFixationDurationMs,
    isSaccade,
    isBlinking,
    headPose,
    facialSignals,
    fps,
    confidence
  } = frameResult;

  return (
    <>
      {/* 1. Gaze Cursor Crosshairs on Screen Viewport */}
      <div
        className="pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-out"
        style={{ left: `${pixelX}px`, top: `${pixelY}px` }}
      >
        {/* Fixation Bubble */}
        {isFixating && (
          <div
            className="absolute rounded-full border border-emerald-400 bg-emerald-500/20 -translate-x-1/2 -translate-y-1/2 animate-ping opacity-75"
            style={{
              width: `${Math.min(90, 24 + activeFixationDurationMs * 0.1)}px`,
              height: `${Math.min(90, 24 + activeFixationDurationMs * 0.1)}px`
            }}
          />
        )}

        {/* Gaze Reticle */}
        <div className="relative flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-violet-500 bg-violet-600/30 shadow-lg backdrop-blur-xs flex items-center justify-center">
            <div
              className={`w-1.5 h-1.5 rounded-full ${isFixating ? 'bg-emerald-400' : 'bg-amber-400'}`}
            />
          </div>

          {/* Dwell duration badge */}
          {isFixating && activeFixationDurationMs > 100 && (
            <span className="absolute -top-6 left-5 px-1.5 py-0.5 rounded bg-slate-900/90 text-[10px] font-mono font-bold text-emerald-300 border border-emerald-500/40">
              {Math.round(activeFixationDurationMs)}ms
            </span>
          )}
        </div>
      </div>

      {/* 2. Floating Developer Telemetry HUD Panel */}
      <div className="fixed bottom-4 right-4 z-[9998] w-80 bg-slate-950/92 backdrop-blur-md border border-teal-500/50 rounded-2xl shadow-2xl p-4 text-xs font-mono text-slate-200 select-none animate-fade-in space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5 text-teal-400 font-bold">
            <Terminal size={14} />
            <span className="tracking-wide uppercase text-[11px]">Eye Tracking Debugger</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-teal-300 font-bold">
              {fps} FPS
            </span>
            {onClose && (
              <button onClick={onClose} className="text-slate-400 hover:text-white p-0.5 rounded">
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Gaze & Target Word */}
        <div className="space-y-1.5 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 text-[11px]">
          <div className="flex justify-between">
            <span className="text-slate-400">Screen Gaze (X, Y):</span>
            <span className="text-violet-400 font-bold">
              {screenX.toFixed(3)}, {screenY.toFixed(3)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Raw Ocular (u, v):</span>
            <span className="text-slate-300 font-mono">
              {rawGazeX.toFixed(3)}, {rawGazeY.toFixed(3)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Velocity:</span>
            <span
              className={velocityPxPerMs > 0.4 ? 'text-amber-400 font-bold' : 'text-emerald-400'}
            >
              {velocityPxPerMs.toFixed(2)} px/ms
            </span>
          </div>
          <div className="flex justify-between pt-1 border-t border-slate-800">
            <span className="text-slate-400">Focused Word:</span>
            <span className="text-teal-300 font-bold truncate max-w-[120px]">
              {activeWordIndex !== null ? `#${activeWordIndex} "${activeWordText}"` : 'None'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Reading Line:</span>
            <span className="text-teal-300 font-bold">
              {activeLineIndex !== null ? `Line ${activeLineIndex + 1}` : 'None'}
            </span>
          </div>
        </div>

        {/* Cognitive State Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
              isFixating
                ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            Fixation {isFixating ? `(${Math.round(activeFixationDurationMs)}ms)` : 'off'}
          </span>

          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
              isSaccade
                ? 'bg-amber-950 text-amber-300 border-amber-500'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            Saccade
          </span>

          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
              isBlinking
                ? 'bg-rose-950 text-rose-300 border-rose-500 animate-pulse'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            {isBlinking ? 'Blinking' : 'Eyes Open'}
          </span>
        </div>

        {/* 3D Head Pose */}
        <div className="space-y-1 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 text-[11px]">
          <div className="text-slate-400 font-semibold mb-1 flex items-center gap-1">
            <Compass size={12} className="text-cyan-400" />
            3D Head Pose
          </div>
          <div className="grid grid-cols-3 gap-1 text-center font-mono">
            <div className="bg-slate-800/70 p-1 rounded">
              <div className="text-[9px] text-slate-400">YAW</div>
              <div className="text-cyan-300 font-bold">{headPose.yaw}°</div>
            </div>
            <div className="bg-slate-800/70 p-1 rounded">
              <div className="text-[9px] text-slate-400">PITCH</div>
              <div className="text-cyan-300 font-bold">{headPose.pitch}°</div>
            </div>
            <div className="bg-slate-800/70 p-1 rounded">
              <div className="text-[9px] text-slate-400">ROLL</div>
              <div className="text-cyan-300 font-bold">{headPose.roll}°</div>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 pt-1 text-right">
            Alignment: <span className="text-white font-bold">{headPose.alignment}</span>
          </div>
        </div>

        {/* Observable Facial Signals */}
        <div className="space-y-1 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 text-[10px]">
          <div className="text-slate-400 font-semibold flex items-center gap-1">
            <Sparkles size={11} className="text-amber-400" />
            Observable Facial Signals
          </div>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 text-slate-300">
            <div>
              Brow Raise:{' '}
              <span className="font-bold text-amber-300">{facialSignals.browRaise}</span>
            </div>
            <div>
              Squint: <span className="font-bold text-amber-300">{facialSignals.eyeSquint}</span>
            </div>
            <div>
              Furrow: <span className="font-bold text-amber-300">{facialSignals.browFurrow}</span>
            </div>
            <div>
              Tension: <span className="font-bold text-amber-300">{facialSignals.jawTension}</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
          <span>Confidence: {Math.round(confidence * 100)}%</span>
          <span className="text-emerald-400 font-bold">100% Local Inference</span>
        </div>
      </div>
    </>
  );
};
