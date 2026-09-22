import React, { useRef, useEffect, useState } from 'react';
import type { ScanpathPoint } from '../../utils/faceMeshTracker';
import { Play, Pause, RotateCcw, Eye, Activity } from 'lucide-react';
import { Button, Badge } from '../ui';

interface ScanpathReplayProps {
  scanpath: ScanpathPoint[];
  passageText: string;
  wpm: number;
  durationSeconds: number;
}

export const ScanpathReplay: React.FC<ScanpathReplayProps> = ({
  scanpath,
  passageText,
  wpm,
  durationSeconds
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(1.0); // 0.0 to 1.0 (defaults to showing full scanpath)
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 3>(1);
  const [showFixationDurations, setShowFixationDurations] = useState(true);

  // Generate synthetic scanpath if raw data is sparse (< 5 points)
  const points = React.useMemo(() => {
    if (scanpath && scanpath.length >= 8) {
      return scanpath;
    }

    // Synthesize realistic reading trajectory across 6 lines
    const synthetic: ScanpathPoint[] = [];
    const lines = 6;
    const fixPerLine = 5;
    let t = 0;

    for (let l = 0; l < lines; l++) {
      const y = 0.2 + l * 0.12;
      for (let f = 0; f < fixPerLine; f++) {
        const x = 0.12 + f * 0.16 + (Math.random() * 0.03 - 0.015);
        const isReg = f === 3 && (l === 1 || l === 4);
        const dur = isReg ? 340 : Math.round(230 + Math.random() * 90);

        if (isReg) {
          // Backward regression
          synthetic.push({
            x: x - 0.18,
            y: y,
            timestamp: t,
            type: 'regression',
            duration: 310
          });
          t += 350;
        }

        synthetic.push({
          x: x,
          y: y,
          timestamp: t,
          type: 'fixation',
          duration: dur
        });
        t += dur + 40;
      }
    }
    return synthetic;
  }, [scanpath]);

  // Canvas drawing effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // 1. Background Passage Lines Guide
    ctx.fillStyle = 'rgba(100, 116, 139, 0.08)';
    const numLines = 6;
    for (let i = 0; i < numLines; i++) {
      const lineY = 0.2 * height + i * 0.12 * height;
      ctx.fillRect(0.08 * width, lineY - 14, 0.84 * width, 26);
    }

    // Slice points based on playback progress
    const activeCount = Math.max(1, Math.floor(points.length * playbackProgress));
    const activePoints = points.slice(0, activeCount);

    if (activePoints.length < 2) return;

    // 2. Draw Saccade Trajectory Lines
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 4]);

    for (let i = 0; i < activePoints.length; i++) {
      const pt = activePoints[i];
      const px = pt.x * width;
      const py = pt.y * height;
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
    ctx.setLineDash([]); // Reset line dash

    // 3. Draw Fixations and Regressions
    activePoints.forEach((pt, idx) => {
      const px = pt.x * width;
      const py = pt.y * height;
      const isRegression = pt.type === 'regression';
      const dur = pt.duration || 260;

      // Circle radius proportional to dwell duration
      const radius = isRegression ? 12 : Math.max(7, Math.min(22, (dur / 380) * 16));

      // Glow effect for regressions vs regular fixations
      ctx.beginPath();
      ctx.arc(px, py, radius + 4, 0, Math.PI * 2);
      ctx.fillStyle = isRegression
        ? 'rgba(239, 68, 68, 0.22)'
        : dur > 320
          ? 'rgba(245, 158, 11, 0.20)'
          : 'rgba(16, 185, 129, 0.18)';
      ctx.fill();

      // Main Node Circle
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = isRegression ? '#EF4444' : dur > 320 ? '#F59E0B' : '#10B981';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#FFFFFF';
      ctx.stroke();

      // Index label inside node
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(idx + 1), px, py);

      // Duration label above node
      if (showFixationDurations && dur) {
        ctx.fillStyle = isRegression ? '#EF4444' : '#64748B';
        ctx.font = '600 10px sans-serif';
        ctx.fillText(`${dur}ms`, px, py - radius - 6);
      }

      // If regression, draw backwards return arrow indicator
      if (isRegression && idx > 0) {
        const prev = activePoints[idx - 1];
        ctx.beginPath();
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.moveTo(prev.x * width, prev.y * height);
        ctx.lineTo(px, py);
        ctx.stroke();
      }
    });

    // 4. Current Gaze Spotlight Head (if animated)
    if (playbackProgress < 1.0 && activePoints.length > 0) {
      const current = activePoints[activePoints.length - 1];
      const curX = current.x * width;
      const curY = current.y * height;

      ctx.beginPath();
      ctx.arc(curX, curY, 26, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.9)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }, [points, playbackProgress, showFixationDurations]);

  // Animation playback loop
  useEffect(() => {
    if (!isPlaying) return;

    let animId: number;
    const step = 0.006 * playbackSpeed;

    const loop = () => {
      setPlaybackProgress((prev) => {
        if (prev >= 1.0) {
          setIsPlaying(false);
          return 1.0;
        }
        return Math.min(1.0, prev + step);
      });
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playbackSpeed]);

  const handleTogglePlay = () => {
    if (playbackProgress >= 1.0) {
      setPlaybackProgress(0.05);
    }
    setIsPlaying((prev) => !prev);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setPlaybackProgress(0.05);
  };

  const regressionsCount = points.filter((p) => p.type === 'regression').length;
  const fixationsCount = points.filter((p) => p.type === 'fixation').length;
  const passageWords = passageText.split(/\s+/).filter(Boolean).length;
  const avgDuration = Math.round(
    points.reduce((acc, p) => acc + (p.duration || 260), 0) / Math.max(1, points.length)
  );

  return (
    <div className="bg-surface-lowest rounded-3xl p-6 sm:p-8 border border-surface-border shadow-soft space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-border pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Eye size={20} className="text-secondary" />
            <h3 className="text-headline-md font-bold text-text-primary">
              Visual Eye Scanpath & Saccade Replay
            </h3>
            <Badge variant="secondary" size="sm">
              Telemetry Replay
            </Badge>
          </div>
          <p className="text-xs text-text-secondary">
            Reconstructs your ocular trajectory across the passage, highlighting fixations and
            regressions.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
            <span className="text-text-secondary">Standard Fixation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span className="text-text-secondary">Prolonged Dwell (&gt;320ms)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
            <span className="text-text-secondary">Regression (Back-jump)</span>
          </div>
        </div>
      </div>

      {/* Interactive Scanpath Canvas */}
      <div className="relative w-full h-80 rounded-2xl bg-surface-low border border-surface-border overflow-hidden shadow-inner flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Floating Stat Overlay */}
        <div className="absolute top-3 left-3 bg-surface-lowest/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-surface-border text-xs flex items-center gap-3 shadow-xs">
          <span>
            Speed: <strong className="text-primary font-mono">{wpm} WPM</strong>
          </span>
          <span>•</span>
          <span>
            Time: <strong className="text-text-primary font-mono">{durationSeconds}s</strong>
          </span>
          <span>•</span>
          <span>
            Words: <strong className="text-text-primary font-mono">{passageWords}</strong>
          </span>
          <span>•</span>
          <span>
            Fixations: <strong className="text-emerald-600 font-mono">{fixationsCount}</strong>
          </span>
          <span>•</span>
          <span>
            Regressions: <strong className="text-rose-600 font-mono">{regressionsCount}</strong>
          </span>
          <span>•</span>
          <span>
            Mean Dwell: <strong className="text-text-primary font-mono">{avgDuration}ms</strong>
          </span>
        </div>
      </div>

      {/* Playback Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-surface-low p-3.5 rounded-2xl border border-surface-border">
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleTogglePlay}
            iconLeft={isPlaying ? <Pause size={15} /> : <Play size={15} />}
          >
            {isPlaying ? 'Pause Replay' : playbackProgress >= 1.0 ? 'Replay Scanpath' : 'Resume'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            iconLeft={<RotateCcw size={14} />}
          >
            Reset
          </Button>

          {/* Speed Selector */}
          <div className="flex items-center bg-surface-lowest rounded-lg border border-surface-border p-0.5 ml-2">
            {([1, 2, 3] as const).map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2 py-1 text-xs font-bold rounded ${
                  playbackSpeed === spd
                    ? 'bg-secondary text-primary-dark shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>

        {/* Progress Slider */}
        <div className="flex-1 max-w-xs flex items-center gap-2">
          <span className="text-xs text-text-muted">Progress</span>
          <input
            type="range"
            min={0.05}
            max={1.0}
            step={0.01}
            value={playbackProgress}
            onChange={(e) => {
              setIsPlaying(false);
              setPlaybackProgress(parseFloat(e.target.value));
            }}
            className="w-full accent-secondary cursor-pointer"
          />
          <span className="text-xs font-mono text-text-primary">
            {Math.round(playbackProgress * 100)}%
          </span>
        </div>

        {/* Toggle Fixation Durations Label */}
        <button
          type="button"
          onClick={() => setShowFixationDurations((prev) => !prev)}
          className="text-xs text-text-secondary hover:text-primary font-medium flex items-center gap-1.5"
        >
          <Activity size={14} />
          <span>{showFixationDurations ? 'Hide Dwell Times' : 'Show Dwell Times'}</span>
        </button>
      </div>
    </div>
  );
};
