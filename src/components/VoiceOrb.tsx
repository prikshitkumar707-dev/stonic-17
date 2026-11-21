import { useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Loader2 } from 'lucide-react';

export type OrbStatus = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking';

interface VoiceOrbProps {
  status: OrbStatus;
  audioLevel: number; // 0 to 1
  onToggleListen: () => void;
  onStopSpeaking: () => void;
  handsFree: boolean;
  onToggleHandsFree: () => void;
}

export function VoiceOrb({
  status,
  audioLevel,
  onToggleListen,
  onStopSpeaking,
  handsFree,
  onToggleHandsFree,
}: VoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const statusRef = useRef(status);
  const levelRef = useRef(audioLevel);

  statusRef.current = status;
  levelRef.current = audioLevel;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let phase = 0;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const size = 220;
      if (canvas.width !== size * dpr) {
        canvas.width = size * dpr;
        canvas.height = size * dpr;
      }
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const st = statusRef.current;
      const lvl = levelRef.current;

      phase += st === 'listening' ? 0.08 : st === 'speaking' ? 0.07 : st === 'thinking' ? 0.06 : 0.022;

      const baseRadius = 56;
      const amplitude =
        st === 'listening'
          ? 7 + lvl * 22
          : st === 'speaking'
            ? 9 + Math.sin(phase * 1.7) * 5
            : st === 'thinking' || st === 'transcribing'
              ? 5
              : 2.5;

      // Outer 2 subtle acoustic rings
      for (let ring = 2; ring >= 1; ring--) {
        ctx.beginPath();
        const points = 72;
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          const wave =
            Math.sin(angle * (ring === 1 ? 4 : 3) + phase * (ring === 1 ? 1.4 : -1.1)) *
            amplitude *
            (ring === 1 ? 1 : 0.7);
          const r = baseRadius + ring * 14 + wave;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.strokeStyle =
          st === 'listening'
            ? `rgba(37, 99, 235, ${ring === 1 ? 0.42 : 0.18})`
            : st === 'speaking'
              ? `rgba(14, 165, 233, ${ring === 1 ? 0.4 : 0.16})`
              : st === 'thinking' || st === 'transcribing'
                ? `rgba(59, 130, 246, ${ring === 1 ? 0.35 : 0.14})`
                : `rgba(100, 116, 139, ${ring === 1 ? 0.22 : 0.1})`;
        ctx.lineWidth = ring === 1 ? 2 : 1.25;
        ctx.stroke();
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  const statusLabel =
    status === 'listening'
      ? 'Listening — speak now'
      : status === 'transcribing'
        ? 'Transcribing voice...'
        : status === 'thinking'
          ? 'Processing command...'
          : status === 'speaking'
            ? 'Speaking — tap to interrupt'
            : 'Tap microphone to speak';

  const handlePrimaryClick = () => {
    if (status === 'speaking') {
      onStopSpeaking();
    } else {
      onToggleListen();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-4 select-none">
      <div className="relative flex items-center justify-center w-[220px] h-[220px]">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-[220px] h-[220px] pointer-events-none"
        />
        <button
          type="button"
          onClick={handlePrimaryClick}
          disabled={status === 'thinking' || status === 'transcribing'}
          aria-label={statusLabel}
          className={`relative z-10 flex items-center justify-center w-24 h-24 rounded-full transition-transform duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/40 active:scale-95 ${
            status === 'listening'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 scale-105'
              : status === 'speaking'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/25'
                : status === 'thinking' || status === 'transcribing'
                  ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 cursor-wait'
                  : 'bg-slate-900 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-500 shadow-md'
          }`}
        >
          {status === 'listening' ? (
            <Mic className="w-8 h-8" />
          ) : status === 'speaking' ? (
            <Volume2 className="w-8 h-8" />
          ) : status === 'thinking' || status === 'transcribing' ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <Mic className="w-8 h-8" />
          )}
        </button>
      </div>

      <div className="mt-1 flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
          {statusLabel}
        </p>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleHandsFree}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 ${
              handsFree
                ? 'bg-blue-600/10 border-blue-600/30 text-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {handsFree ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            Hands-Free Loop: {handsFree ? 'On' : 'Off'}
          </button>
        </div>
      </div>
    </div>
  );
}
