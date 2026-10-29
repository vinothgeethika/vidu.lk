import React, { useCallback, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  Film,
  Image as ImageIcon,
  Scissors,
  Sparkles,
  Type,
  VolumeX,
} from 'lucide-react';
import { EditorState, ToolTabId } from '../types/editor';
import { formatTimecode } from '../utils/ffmpegCommands';

interface TimelineProps {
  state: EditorState;
  currentTime: number;
  totalDuration: number;
  onSeek: (time: number) => void;
  onUpdateTrim: (start: number, end: number) => void;
  onReorderSlide: (fromIdx: number, toIdx: number) => void;
  onSelectTab: (tab: ToolTabId) => void;
  onSplitAtPlayhead: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  state,
  currentTime,
  totalDuration,
  onSeek,
  onUpdateTrim,
  onReorderSlide,
  onSelectTab,
  onSplitAtPlayhead,
}) => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const safeDuration = Math.max(1, totalDuration);

  const playheadPct = Math.min(100, Math.max(0, (currentTime / safeDuration) * 100));
  const trimStartPct = Math.min(100, Math.max(0, (state.trim.start / safeDuration) * 100));
  const trimEndPct = Math.min(
    100,
    Math.max(trimStartPct + 2, ((state.trim.end || safeDuration) / safeDuration) * 100)
  );

  const handleTrackClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const relX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const newTime = (relX / rect.width) * safeDuration;
      onSeek(Number(newTime.toFixed(2)));
    },
    [onSeek, safeDuration]
  );

  const startDraggingHandle = useCallback(
    (which: 'start' | 'end' | 'playhead', e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      const moveHandler = (moveEvent: MouseEvent | TouchEvent) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const clientX =
          'touches' in moveEvent
            ? moveEvent.touches[0]?.clientX ?? 0
            : moveEvent.clientX;
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const timeVal = Number((ratio * safeDuration).toFixed(2));

        if (which === 'playhead') {
          onSeek(timeVal);
        } else if (which === 'start') {
          const maxStart = Math.max(0, (state.trim.end || safeDuration) - 0.5);
          const nextStart = Math.min(timeVal, maxStart);
          onUpdateTrim(nextStart, state.trim.end || safeDuration);
          onSeek(nextStart);
        } else if (which === 'end') {
          const minEnd = Math.min(safeDuration, state.trim.start + 0.5);
          const nextEnd = Math.max(timeVal, minEnd);
          onUpdateTrim(state.trim.start, nextEnd);
          onSeek(nextEnd);
        }
      };

      const upHandler = () => {
        window.removeEventListener('mousemove', moveHandler);
        window.removeEventListener('mouseup', upHandler);
        window.removeEventListener('touchmove', moveHandler);
        window.removeEventListener('touchend', upHandler);
      };

      window.addEventListener('mousemove', moveHandler);
      window.addEventListener('mouseup', upHandler);
      window.addEventListener('touchmove', moveHandler);
      window.addEventListener('touchend', upHandler);
    },
    [onSeek, onUpdateTrim, safeDuration, state.trim.end, state.trim.start]
  );

  // Ruler ticks
  const tickCount = 6;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) =>
    Number(((safeDuration / tickCount) * i).toFixed(1))
  );

  return (
    <section
      aria-label="Multi-track video timeline"
      className="flex flex-col border-t border-slate-800/90 bg-[#0D0F17] px-3 py-2.5 md:px-5 select-none"
    >
      {/* Timeline Header Bar */}
      <div className="mb-2 flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="font-semibold text-slate-200">Timeline</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums">
            Active Range: {formatTimecode(state.trim.start, false)} –{' '}
            {formatTimecode(state.trim.end || safeDuration, false)} (
            {((state.trim.end || safeDuration) - state.trim.start).toFixed(1)}s)
          </span>
          {state.trim.segments.length > 1 && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-purple-400 font-mono tabular-nums">
                {state.trim.segments.length} Split Clips
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSplitAtPlayhead}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-300 hover:border-purple-500/40 hover:text-white whitespace-nowrap shrink-0"
          >
            <Scissors className="h-3.5 w-3.5 text-purple-400" />
            <span>Split at Playhead</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Scrubber & Multi-Track Area */}
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className="relative flex flex-col gap-1.5 rounded-xl border border-slate-800/90 bg-[#090A0F] p-2.5 cursor-pointer overflow-hidden"
      >
        {/* Timecode Ruler */}
        <div className="relative flex h-5 items-center justify-between border-b border-slate-800/70 px-1 font-mono text-[10px] text-slate-500 tabular-nums">
          {ticks.map((t, i) => (
            <span key={i}>{formatTimecode(t, false)}</span>
          ))}
        </div>

        {/* Track 1: Video / Slideshow Track with Draggable Trim Handles */}
        <div className="relative h-12 w-full rounded-lg bg-slate-900/90 overflow-hidden">
          {/* Trimmed-out left/right dark masks */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 left-0 z-10 bg-black/70"
            style={{ width: `${trimStartPct}%` }}
          />
          <div
            className="pointer-events-none absolute top-0 bottom-0 right-0 z-10 bg-black/70"
            style={{ width: `${100 - trimEndPct}%` }}
          />

          {/* Track Content: Slideshow blocks OR Video strip */}
          {state.mode === 'slideshow' ? (
            <div className="flex h-full w-full items-stretch gap-0.5 p-0.5">
              {state.slides.map((slide, idx) => {
                const widthPct = (slide.duration / safeDuration) * 100;
                return (
                  <div
                    key={slide.id}
                    style={{ width: `${Math.max(8, widthPct)}%` }}
                    className="group relative flex items-center justify-between gap-1.5 overflow-hidden rounded-md border border-purple-500/30 bg-slate-800/90 px-2 py-1"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <ImageIcon className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                      <span className="truncate text-[11px] font-medium text-slate-200">
                        {slide.name}
                      </span>
                      <span className="font-mono text-[10px] text-purple-300 tabular-nums shrink-0">
                        {slide.duration}s
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 shrink-0">
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReorderSlide(idx, idx - 1);
                          }}
                          aria-label={`Move ${slide.name} earlier`}
                          className="rounded bg-black/60 p-1 text-slate-300 hover:text-white"
                        >
                          <ArrowLeft className="h-3 w-3" />
                        </button>
                      )}
                      {idx < state.slides.length - 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReorderSlide(idx, idx + 1);
                          }}
                          aria-label={`Move ${slide.name} later`}
                          className="rounded bg-black/60 p-1 text-slate-300 hover:text-white"
                        >
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-between bg-gradient-to-r from-purple-950/60 via-slate-900 to-pink-950/60 px-3">
              <div className="flex items-center gap-2 text-xs text-slate-200">
                <Film className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                <span className="font-medium truncate">
                  {state.videoName || 'Studio Sequence (1280×720)'}
                </span>
              </div>

              {/* Split markers */}
              {state.trim.segments.length > 1 &&
                state.trim.segments.slice(0, -1).map((seg) => {
                  const splitPct = (seg.end / safeDuration) * 100;
                  return (
                    <div
                      key={seg.id}
                      style={{ left: `${splitPct}%` }}
                      className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-pink-400/80"
                    />
                  );
                })}
            </div>
          )}

          {/* Active Trim Frame Border & Draggable Start/End Handles */}
          <div
            style={{
              left: `${trimStartPct}%`,
              width: `${Math.max(2, trimEndPct - trimStartPct)}%`,
            }}
            className="pointer-events-none absolute top-0 bottom-0 z-20 rounded-md border-2 border-purple-500"
          >
            {/* Left Start Handle */}
            <button
              type="button"
              aria-label="Trim start handle"
              onMouseDown={(e) => startDraggingHandle('start', e)}
              onTouchStart={(e) => startDraggingHandle('start', e)}
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto absolute -left-2 top-0 bottom-0 flex w-4 cursor-ew-resize items-center justify-center rounded-l bg-purple-500 text-white hover:bg-purple-400"
            >
              <span className="h-4 w-0.5 rounded-full bg-white" />
            </button>

            {/* Right End Handle */}
            <button
              type="button"
              aria-label="Trim end handle"
              onMouseDown={(e) => startDraggingHandle('end', e)}
              onTouchStart={(e) => startDraggingHandle('end', e)}
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto absolute -right-2 top-0 bottom-0 flex w-4 cursor-ew-resize items-center justify-center rounded-r bg-pink-500 text-white hover:bg-pink-400"
            >
              <span className="h-4 w-0.5 rounded-full bg-white" />
            </button>
          </div>
        </div>

        {/* Track 2: Audio Track */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelectTab('audio');
          }}
          className="relative flex h-8 w-full items-center justify-between rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 text-xs hover:border-slate-700"
        >
          <div className="flex items-center gap-2 truncate">
            {state.audio.muted ? (
              <>
                <VolumeX className="h-3.5 w-3.5 text-pink-400 shrink-0" />
                <span className="text-pink-300 font-medium">
                  Audio Track Muted (Sound Removed)
                </span>
              </>
            ) : (
              <>
                <AudioLines className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span className="text-slate-300 truncate">
                  {state.mode === 'slideshow'
                    ? state.slideshowAudioName || 'Synth Ambient Audio'
                    : state.audio.replaceName
                      ? state.audio.mixWithOriginal
                        ? `Mixed: Original (${state.audio.originalVolume}%) + ${state.audio.replaceName} (${state.audio.replaceVolume}%)`
                        : `Replaced: ${state.audio.replaceName} (${state.audio.replaceVolume}%)`
                      : `Original Audio (${state.audio.originalVolume}%)`}
                </span>
              </>
            )}
          </div>

          {/* Decorative static audio waveform visualization */}
          {!state.audio.muted && (
            <div aria-hidden="true" className="hidden sm:flex items-center gap-0.5 h-4">
              {[40, 75, 55, 90, 60, 85, 45, 70, 95, 50, 80, 60, 40, 75, 65, 85].map(
                (h, idx) => (
                  <span
                    key={idx}
                    style={{ height: `${h}%` }}
                    className="w-1 rounded-full bg-emerald-500/40"
                  />
                )
              )}
            </div>
          )}
        </div>

        {/* Track 3: Effects & Text Overlays Track */}
        <div className="flex h-7 w-full items-center justify-between gap-2 rounded-lg border border-slate-800/60 bg-slate-900/40 px-3 text-[11px] text-slate-400">
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelectTab('effects');
            }}
            className="flex items-center gap-2 truncate hover:text-white"
          >
            <Sparkles className="h-3 w-3 text-purple-400 shrink-0" />
            <span className="truncate">
              {[
                state.effects.fadeIn && `Fade In (${state.effects.fadeInDuration}s)`,
                state.effects.fadeOut && `Fade Out (${state.effects.fadeOutDuration}s)`,
                state.effects.glitch && `RGB Glitch (${state.effects.glitchDuration}s)`,
                state.effects.blackAndWhite && 'B&W',
                state.effects.blur > 0 && `Blur ${state.effects.blur}px`,
                state.effects.zoomIn && `Zoom ${state.effects.zoomAmount}x`,
                state.effects.vignette && 'Vignette',
              ]
                .filter(Boolean)
                .join(' · ') || 'No Visual Effects Applied'}
            </span>
          </div>

          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelectTab('text');
            }}
            className="flex items-center gap-1.5 text-pink-300 shrink-0 hover:text-white"
          >
            <Type className="h-3 w-3" />
            <span className="font-mono tabular-nums">
              {state.textOverlays.length} Text{' '}
              {state.textOverlays.length === 1 ? 'Layer' : 'Layers'}
            </span>
          </div>
        </div>

        {/* Playhead Vertical Line & Handle */}
        <div
          style={{ left: `${playheadPct}%` }}
          onMouseDown={(e) => startDraggingHandle('playhead', e)}
          onTouchStart={(e) => startDraggingHandle('playhead', e)}
          className=" absolute top-0 bottom-0 z-30 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] cursor-ew-resize"
        >
          <div className="absolute -top-0.5 -left-2 h-3.5 w-4 rounded-b bg-white text-[8px] flex items-center justify-center text-slate-950 font-bold">
            ▼
          </div>
        </div>
      </div>
    </section>
  );
};
