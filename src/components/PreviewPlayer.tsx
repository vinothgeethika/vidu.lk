import React, { useEffect, useMemo, useRef } from 'react';
import {
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Scissors,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CropRect, EditorState, ToolTabId } from '../types/editor';
import { formatTimecode } from '../utils/ffmpegCommands';

interface PreviewPlayerProps {
  state: EditorState;
  activeTab: ToolTabId;
  isPlaying: boolean;
  currentTime: number;
  effectiveDuration: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onSplitAtPlayhead: () => void;
  onUpdateCrop: (crop: CropRect) => void;
  onToggleMute: () => void;
}

export const PreviewPlayer: React.FC<PreviewPlayerProps> = ({
  state,
  activeTab,
  isPlaying,
  currentTime,
  effectiveDuration,
  onTogglePlay,
  onSeek,
  onSplitAtPlayhead,
  onUpdateCrop,
  onToggleMute,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Sync HTML5 video element with timeline currentTime and playback speed
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || state.mode !== 'video' || !state.videoUrl) return;

    vid.playbackRate = state.transform.speed;
    vid.muted = state.audio.muted || (Boolean(state.audio.replaceUrl) && !state.audio.mixWithOriginal);
    vid.volume = Math.min(1, Math.max(0, state.audio.originalVolume / 100));

    if (Math.abs(vid.currentTime - currentTime) > 0.25) {
      vid.currentTime = currentTime;
    }

    if (isPlaying && vid.paused) {
      vid.play().catch(() => {});
    } else if (!isPlaying && !vid.paused) {
      vid.pause();
    }
  }, [
    currentTime,
    isPlaying,
    state.mode,
    state.videoUrl,
    state.transform.speed,
    state.audio.muted,
    state.audio.replaceUrl,
    state.audio.mixWithOriginal,
    state.audio.originalVolume,
  ]);

  // Sync secondary/slideshow audio element
  const activeSecondaryAudioUrl =
    state.mode === 'slideshow'
      ? state.slideshowAudioUrl || state.audio.replaceUrl
      : state.audio.replaceUrl;

  useEffect(() => {
    const aud = audioRef.current;
    if (!aud || !activeSecondaryAudioUrl) return;

    aud.playbackRate = state.transform.speed;
    aud.muted = state.audio.muted;

    // Calculate audio fade in / out envelope
    let fadeMultiplier = 1;
    const relTime = Math.max(0, currentTime - state.trim.start);
    if (state.effects.fadeIn && state.effects.fadeInDuration > 0) {
      if (relTime < state.effects.fadeInDuration) {
        fadeMultiplier = Math.min(1, relTime / state.effects.fadeInDuration);
      }
    }
    if (
      state.effects.fadeOut &&
      state.effects.fadeOutDuration > 0 &&
      effectiveDuration > 0
    ) {
      const timeFromEnd = Math.max(0, state.trim.end - currentTime);
      if (timeFromEnd < state.effects.fadeOutDuration) {
        fadeMultiplier = Math.min(
          fadeMultiplier,
          timeFromEnd / state.effects.fadeOutDuration
        );
      }
    }

    const baseVol = Math.min(1, Math.max(0, state.audio.replaceVolume / 100));
    aud.volume = Math.min(1, Math.max(0, baseVol * fadeMultiplier));

    if (Math.abs(aud.currentTime - relTime) > 0.3) {
      aud.currentTime = relTime % Math.max(1, aud.duration || 10);
    }

    if (isPlaying && aud.paused && !state.audio.muted) {
      aud.play().catch(() => {});
    } else if ((!isPlaying || state.audio.muted) && !aud.paused) {
      aud.pause();
    }
  }, [
    activeSecondaryAudioUrl,
    currentTime,
    effectiveDuration,
    isPlaying,
    state.audio.muted,
    state.audio.replaceVolume,
    state.effects.fadeIn,
    state.effects.fadeInDuration,
    state.effects.fadeOut,
    state.effects.fadeOutDuration,
    state.transform.speed,
    state.trim.end,
    state.trim.start,
  ]);

  // Determine active slide when in slideshow mode or procedural preview mode
  const activeSlide = useMemo(() => {
    if (state.slides.length === 0) return null;
    let accumulated = 0;
    const rel = Math.max(0, currentTime - state.trim.start);
    for (const slide of state.slides) {
      if (rel <= accumulated + slide.duration) {
        return slide;
      }
      accumulated += slide.duration;
    }
    return state.slides[state.slides.length - 1];
  }, [state.slides, currentTime, state.trim.start]);

  // Compute live visual Fade In / Fade Out opacity
  const fadeOpacity = useMemo(() => {
    const relTime = Math.max(0, currentTime - state.trim.start);
    const clipEnd = state.trim.end || effectiveDuration;
    const remaining = Math.max(0, clipEnd - currentTime);

    let alpha = 1;
    if (state.effects.fadeIn && state.effects.fadeInDuration > 0) {
      if (relTime < state.effects.fadeInDuration) {
        alpha = Math.min(1, relTime / state.effects.fadeInDuration);
      }
    }
    if (state.effects.fadeOut && state.effects.fadeOutDuration > 0) {
      if (remaining < state.effects.fadeOutDuration) {
        alpha = Math.min(alpha, remaining / state.effects.fadeOutDuration);
      }
    }
    // When paused at very start/end, keep a 25% dim preview so canvas isn't pitch black while editing
    const minAlpha = isPlaying ? 0 : 0.25;
    return Math.max(minAlpha, Math.min(1, alpha));
  }, [
    currentTime,
    effectiveDuration,
    isPlaying,
    state.effects.fadeIn,
    state.effects.fadeInDuration,
    state.effects.fadeOut,
    state.effects.fadeOutDuration,
    state.trim.end,
    state.trim.start,
  ]);

  // Compute live CSS filter & transform strings
  const visualStyle = useMemo(() => {
    const filters: string[] = [];
    if (state.effects.blackAndWhite) {
      filters.push('grayscale(100%)');
    }
    if (state.effects.blur > 0) {
      filters.push(`blur(${state.effects.blur}px)`);
    }
    const brightnessPct = 100 + state.effects.brightness;
    if (brightnessPct !== 100) {
      filters.push(`brightness(${brightnessPct}%)`);
    }
    if (state.effects.contrast !== 100) {
      filters.push(`contrast(${state.effects.contrast}%)`);
    }

    const transforms: string[] = [];
    if (state.transform.rotation !== 0) {
      transforms.push(`rotate(${state.transform.rotation}deg)`);
    }
    const scaleX =
      (state.transform.flipH ? -1 : 1) *
      (state.effects.zoomIn ? state.effects.zoomAmount : 1);
    const scaleY =
      (state.transform.flipV ? -1 : 1) *
      (state.effects.zoomIn ? state.effects.zoomAmount : 1);

    if (scaleX !== 1 || scaleY !== 1) {
      transforms.push(`scale(${scaleX}, ${scaleY})`);
    }

    // Glitch jitter when glitch is active within glitchDuration
    const relTime = Math.max(0, currentTime - state.trim.start);
    const isGlitchingNow =
      state.effects.glitch && relTime <= state.effects.glitchDuration;

    if (isGlitchingNow) {
      const jitterX = Math.sin((currentTime + 0.5) * 47) * (state.effects.glitchIntensity * 1.2);
      const jitterY = Math.cos((currentTime + 0.5) * 31) * (state.effects.glitchIntensity * 0.7);
      transforms.push(`translate(${jitterX.toFixed(1)}px, ${jitterY.toFixed(1)}px)`);
      filters.push(`hue-rotate(${Math.round(Math.sin((currentTime + 0.5) * 20) * 25)}deg) saturate(150%)`);
    }

    return {
      filter: filters.length > 0 ? filters.join(' ') : 'none',
      transform: transforms.length > 0 ? transforms.join(' ') : 'none',
      isGlitchingNow,
    };
  }, [
    currentTime,
    state.effects,
    state.transform.flipH,
    state.transform.flipV,
    state.transform.rotation,
    state.trim.start,
  ]);

  const visibleOverlays = useMemo(() => {
    return state.textOverlays.filter(
      (t) =>
        t.text.trim().length > 0 &&
        currentTime >= t.startTime &&
        currentTime <= t.endTime
    );
  }, [state.textOverlays, currentTime]);

  const showCropBox =
    activeTab === 'crop' ||
    state.crop.width < 99.5 ||
    state.crop.height < 99.5;

  return (
    <section
      aria-label="Video preview canvas"
      className="flex flex-1 flex-col items-center justify-between bg-[#090A0F] p-2.5 md:p-5 select-none overflow-hidden"
    >
      {/* Top Canvas Metadata Bar */}
      <div className="flex w-full max-w-4xl items-center justify-between gap-2 text-xs text-slate-400 mb-2">
        <div className="flex items-center gap-2 min-w-0 truncate">
          <span className="font-medium text-slate-200 truncate">
            {state.projectName}
          </span>
          <span aria-hidden="true" className="hidden sm:inline">·</span>
          <span className="hidden sm:inline truncate">
            {state.mode === 'slideshow'
              ? `Slideshow (${state.slides.length} slides)`
              : state.videoName || 'Studio Sequence'}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums shrink-0">
            {state.crop.preset === 'free' ? 'Custom' : state.crop.preset}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
          <span>{state.transform.speed}x</span>
          {state.effects.glitch && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-pink-400">RGB Glitch</span>
            </>
          )}
        </div>
      </div>

      {/* Main Preview Viewport */}
      <div
        ref={containerRef}
        data-testid="video-preview-viewport"
        className="relative flex w-full max-w-4xl flex-1 items-center justify-center overflow-hidden rounded-2xl border border-slate-800/90 bg-black shadow-2xl"
        style={{ minHeight: '210px', maxHeight: '52vh' }}
      >
        {/* Media Render Surface */}
        <div
          className="relative flex h-full w-full items-center justify-center overflow-hidden transition-opacity duration-75"
          style={{ opacity: fadeOpacity }}
        >
          {state.mode === 'video' && state.videoUrl ? (
            <video
              ref={videoRef}
              src={state.videoUrl}
              playsInline
              className="max-h-full max-w-full object-contain"
              style={{
                filter: visualStyle.filter,
                transform: visualStyle.transform,
              }}
            />
          ) : activeSlide ? (
            <img
              src={activeSlide.url}
              alt={activeSlide.name}
              referrerPolicy="no-referrer"
              className="max-h-full max-w-full object-contain"
              style={{
                filter: visualStyle.filter,
                transform: visualStyle.transform,
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <p className="text-sm font-medium text-slate-300">
                No active media frame
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Upload a video or add images in the Media panel
              </p>
            </div>
          )}

          {/* Glitch RGB Chromatic Split Overlay */}
          {visualStyle.isGlitchingNow && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 mix-blend-screen opacity-65"
              style={{
                background:
                  'repeating-linear-gradient(0deg, rgba(236,72,153,0.18) 0px, rgba(168,85,247,0.18) 2px, transparent 4px, transparent 8px)',
                boxShadow: `inset ${state.effects.glitchIntensity * 3}px 0 0 rgba(255,0,85,0.45), inset -${state.effects.glitchIntensity * 3}px 0 0 rgba(0,225,255,0.45)`,
              }}
            />
          )}

          {/* Vignette Overlay */}
          {state.effects.vignette && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle, transparent 45%, rgba(0,0,0,0.82) 100%)',
              }}
            />
          )}

          {/* Live Text Overlays */}
          {visibleOverlays.map((item) => (
            <div
              key={item.id}
              style={{
                left: `${item.x}%`,
                top: `${item.y}%`,
                transform: 'translate(-50%, -50%)',
                fontFamily: item.fontFamily,
                fontSize: `${Math.max(14, Math.round(item.fontSize * 0.65))}px`,
                color: item.color,
                backgroundColor: item.backgroundColor,
              }}
              className="pointer-events-none absolute z-20 rounded-md px-3 py-1 font-bold tracking-tight shadow-md whitespace-nowrap"
            >
              {item.text}
            </div>
          ))}
        </div>

        {/* Interactive Visual Crop Overlay Box (Outside fadeOpacity so always crisp) */}
        {showCropBox && (
          <div
            data-testid="crop-overlay-box"
            style={{
              left: `${state.crop.x}%`,
              top: `${state.crop.y}%`,
              width: `${state.crop.width}%`,
              height: `${state.crop.height}%`,
            }}
            className="pointer-events-none absolute z-30 border-2 border-purple-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.62)] transition-all duration-150"
          >
            {/* Rule of thirds grid inside crop box */}
            <div className="grid h-full w-full grid-cols-3 grid-rows-3">
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-white/20" />
              <div className="border-r border-white/20" />
              <div />
            </div>

            {/* Corner handles */}
            <div className="absolute -top-1.5 -left-1.5 h-3 w-3 bg-purple-400 rounded-xs" />
            <div className="absolute -top-1.5 -right-1.5 h-3 w-3 bg-purple-400 rounded-xs" />
            <div className="absolute -bottom-1.5 -left-1.5 h-3 w-3 bg-purple-400 rounded-xs" />
            <div className="absolute -bottom-1.5 -right-1.5 h-3 w-3 bg-purple-400 rounded-xs" />

            <div className="absolute top-2 left-2 rounded bg-black/80 px-2 py-0.5 font-mono text-[11px] text-purple-300 tabular-nums whitespace-nowrap">
              {state.crop.preset.toUpperCase()} · {Math.round(state.crop.width)}% ×{' '}
              {Math.round(state.crop.height)}%
            </div>
          </div>
        )}

        {/* Hidden Secondary Audio Player for Slideshow / Replaced Audio */}
        {activeSecondaryAudioUrl && (
          <audio ref={audioRef} src={activeSecondaryAudioUrl} preload="auto" />
        )}
      </div>

      {/* Transport & Playback Controls Bar */}
      <div className="mt-2.5 flex w-full max-w-4xl items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-slate-900/70 px-3 py-1.5 md:px-4 md:py-2">
        {/* Left: Timecode Display */}
        <div className="flex items-center gap-1.5 font-mono text-xs tabular-nums shrink-0">
          <span className="font-semibold text-white">
            {formatTimecode(currentTime)}
          </span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400">
            {formatTimecode(state.trim.end || effectiveDuration)}
          </span>
        </div>

        {/* Center: Play / Pause & Frame Step */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onSeek(state.trim.start)}
            aria-label="Jump to trim start"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <SkipBack className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pause playback' : 'Play preview'}
            className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md transition-transform active:scale-95 hover:from-purple-500 hover:to-pink-500"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="h-4 w-4 fill-current ml-0.5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onSeek(state.trim.end || effectiveDuration)}
            aria-label="Jump to trim end"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <SkipForward className="h-4 w-4" />
          </button>
        </div>

        {/* Right: Quick Mute, Split & Reset Crop */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onSplitAtPlayhead}
            aria-label="Split clip at playhead"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800/80 px-2.5 text-xs font-medium text-slate-200 transition-colors hover:border-purple-500/50 hover:text-white whitespace-nowrap shrink-0"
          >
            <Scissors className="h-3.5 w-3.5 text-purple-400" />
            <span className="hidden sm:inline">Split (S)</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={state.audio.muted ? 'Unmute audio' : 'Mute audio'}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              state.audio.muted
                ? 'border-pink-500/50 bg-pink-950/40 text-pink-300'
                : 'border-slate-700/80 bg-slate-800/80 text-slate-200 hover:text-white'
            }`}
          >
            {state.audio.muted ? (
              <>
                <VolumeX className="h-3.5 w-3.5 text-pink-400" />
                <span className="hidden sm:inline">Muted</span>
              </>
            ) : (
              <>
                <Volume2 className="h-3.5 w-3.5 text-purple-400" />
                <span className="hidden sm:inline">Sound On</span>
              </>
            )}
          </button>

          {(state.crop.width < 99.5 || state.crop.height < 99.5) && (
            <button
              type="button"
              onClick={() =>
                onUpdateCrop({
                  preset: 'free',
                  x: 0,
                  y: 0,
                  width: 100,
                  height: 100,
                })
              }
              aria-label="Reset crop to full frame"
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-700/80 bg-slate-800/80 px-2 text-xs font-medium text-slate-300 hover:text-white whitespace-nowrap shrink-0"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Reset Crop</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
};
