import React, { useCallback, useRef, useState } from 'react';
import {
  AudioLines,
  Film,
  FolderPlus,
  Image as ImageIcon,
  Layers,
  Lock,
  Scissors,
  Sliders,
  Upload,
  Wand2,
} from 'lucide-react';
import { validateMediaFile } from '../utils/ffmpegCommands';

interface LandingScreenProps {
  onFilesSelected: (files: File[]) => void;
  onStartDemoProject: (mode: 'video' | 'slideshow') => void;
  validationNotice: { type: 'error' | 'warning'; message: string } | null;
  onDismissNotice: () => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onFilesSelected,
  onStartDemoProject,
  validationNotice,
  onDismissNotice,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return;
      setLocalError(null);
      const validFiles: File[] = [];

      for (let i = 0; i < fileList.length; i++) {
        const f = fileList[i];
        const res = validateMediaFile(f);
        if (!res.valid) {
          setLocalError(res.error || 'Unsupported file.');
          return;
        }
        validFiles.push(f);
      }

      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    },
    [onFilesSelected]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <main className="flex-1 overflow-y-auto px-4 py-8 md:px-10 md:py-12">
      <div className="mx-auto max-w-6xl space-y-12">
        {/* Hero Split */}
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
          {/* Left Hero Copy & Quick Actions */}
          <div className="flex flex-col justify-between space-y-6 lg:col-span-6">
            <div className="space-y-4">
              <p className="text-xs font-medium tracking-wide text-purple-400">
                Browser-Native Non-Linear Studio · Powered by FFmpeg WebAssembly
              </p>
              <h1
                className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl"
                style={{ textWrap: 'balance' }}
              >
                Precision video editing directly in your browser.
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-slate-300">
                Trim clips, build audio-synced image slideshows, crop for vertical social
                formats, mix multi-track audio, and apply chromatic glitch or fade effects—with
                zero server uploads.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onStartDemoProject('video')}
                  className="inline-flex min-h-[44px] items-center gap-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-purple-950/50 transition-transform active:scale-[0.98] hover:from-purple-500 hover:to-pink-500 whitespace-nowrap shrink-0"
                >
                  <FolderPlus className="h-4 w-4" />
                  Start New Project
                </button>

                <button
                  type="button"
                  onClick={() => onStartDemoProject('slideshow')}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-purple-500/60 hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  <ImageIcon className="h-4 w-4 text-pink-400" />
                  Image + Audio Slideshow
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                <Lock className="h-3.5 w-3.5 text-purple-400" />
                <span>100% On-Device Privacy</span>
                <span aria-hidden="true">·</span>
                <span>H.264 MP4 & MP3 Export</span>
                <span aria-hidden="true">·</span>
                <span>Files over 500 MB may run slower on mobile</span>
              </div>
            </div>
          </div>

          {/* Right Drag & Drop Zone */}
          <div className="flex flex-col lg:col-span-6">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                isDragging
                  ? 'border-purple-500 bg-purple-950/20'
                  : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="video/*,image/*,audio/*,.mp4,.webm,.mov,.mkv,.mp3,.wav,.aac,.jpg,.jpeg,.png,.webp"
                onChange={(e) => handleFiles(e.target.files)}
                className="sr-only"
                id="landing-media-upload"
              />

              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30">
                <Upload className="h-7 w-7 text-purple-400" />
              </div>

              <h2 className="font-display text-lg font-semibold text-white">
                Drop video, image or audio here
              </h2>
              <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-400">
                Drop a video to trim, crop, or apply effects—or select multiple images and an
                audio track to build an automated MP4 slideshow.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-slate-200 whitespace-nowrap shrink-0"
                >
                  <Upload className="h-4 w-4" />
                  Browse Local Files
                </button>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-400">
                <span>MP4 / WebM / MOV</span>
                <span aria-hidden="true">·</span>
                <span>JPG / PNG / WebP</span>
                <span aria-hidden="true">·</span>
                <span>MP3 / WAV / AAC</span>
              </div>
            </div>
          </div>
        </section>

        {/* Validation or Warning Notice */}
        {(localError || validationNotice) && (
          <div
            role="alert"
            className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 text-sm ${
              localError || validationNotice?.type === 'error'
                ? 'border-red-500/40 bg-red-950/30 text-red-200'
                : 'border-amber-500/40 bg-amber-950/30 text-amber-200'
            }`}
          >
            <span>{localError || validationNotice?.message}</span>
            <button
              type="button"
              onClick={() => {
                setLocalError(null);
                onDismissNotice();
              }}
              className="rounded-lg px-2.5 py-1 text-xs font-medium hover:bg-white/10 whitespace-nowrap shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Studio Capabilities Grid */}
        <section className="space-y-4 pt-4 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-xl font-semibold text-white">
                Built-In Studio Capabilities
              </h2>
              <p className="text-sm text-slate-400">
                Every editing operation compiles to a clean, deterministic FFmpeg pipeline in
                browser memory.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              7 Core Modules · Single-Thread WASM
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-800/90 bg-slate-900/40 p-5 space-y-2">
              <div className="flex items-center gap-2.5 text-purple-400">
                <Layers className="h-5 w-5 shrink-0" />
                <h3 className="font-display text-sm font-semibold text-white">
                  01. Image + Audio to MP4
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                Combine multiple images in custom sequence with an audio file. Automatically
                calculates per-slide duration to match audio length.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800/90 bg-slate-900/40 p-5 space-y-2">
              <div className="flex items-center gap-2.5 text-pink-400">
                <Scissors className="h-5 w-5 shrink-0" />
                <h3 className="font-display text-sm font-semibold text-white">
                  02. Non-Linear Trim & Split
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                Drag start and end handles on the interactive timeline, split clips at the
                playhead with keyboard shortcut S, and preview frame-accurately.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800/90 bg-slate-900/40 p-5 space-y-2">
              <div className="flex items-center gap-2.5 text-purple-400">
                <Sliders className="h-5 w-5 shrink-0" />
                <h3 className="font-display text-sm font-semibold text-white">
                  03. Aspect Ratio & Free Crop
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                Visual crop overlay with instant presets for 9:16 Vertical, 1:1 Square, 16:9
                Widescreen, 4:5 Portrait, and custom Free regions.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800/90 bg-slate-900/40 p-5 space-y-2">
              <div className="flex items-center gap-2.5 text-pink-400">
                <AudioLines className="h-5 w-5 shrink-0" />
                <h3 className="font-display text-sm font-semibold text-white">
                  04. Mute, Replace & Mix Audio
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                Strip video sound in one click, replace with custom music, mix original and
                background audio tracks, or extract MP3 audio.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800/90 bg-slate-900/40 p-5 space-y-2">
              <div className="flex items-center gap-2.5 text-purple-400">
                <Wand2 className="h-5 w-5 shrink-0" />
                <h3 className="font-display text-sm font-semibold text-white">
                  05. Fade, Glitch & Color Grading
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                Real-time preview for video/audio Fade In & Out, RGB chromatic Glitch split,
                Black & White, Blur, Brightness/Contrast, Zoom, and Vignette.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800/90 bg-slate-900/40 p-5 space-y-2">
              <div className="flex items-center gap-2.5 text-pink-400">
                <Film className="h-5 w-5 shrink-0" />
                <h3 className="font-display text-sm font-semibold text-white">
                  06. Speed, Rotate & Text Overlays
                </h3>
              </div>
              <p className="text-xs leading-relaxed text-slate-400">
                Adjust playback speed from 0.5x to 2x, rotate 90°/180°/270°, flip horizontally
                or vertically, and position custom typography overlays.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};
