import React, { useRef } from 'react';
import {
  ArrowDown,
  ArrowUp,
  AudioLines,
  Crop,
  Download,
  FlipHorizontal,
  FlipVertical,
  Image as ImageIcon,
  Plus,
  RotateCw,
  Scissors,
  Sliders,
  Sparkles,
  Trash2,
  Type,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  CropPreset,
  EditorState,
  SlideImageItem,
  TextOverlayItem,
  ToolTabId,
} from '../types/editor';
import {
  calculatePresetCropRect,
  formatTimecode,
  syncSlidesToAudioDuration,
} from '../utils/ffmpegCommands';
import { createDemoAudioWavFile } from '../utils/demoMediaGenerator';

interface ToolPanelProps {
  activeTab: ToolTabId;
  state: EditorState;
  totalDuration: number;
  onUpdateState: (updater: (prev: EditorState) => EditorState) => void;
  onUploadVideo: (file: File) => void;
  onAddSlideshowImages: (files: FileList) => void;
  onUploadSlideshowAudio: (file: File) => void;
  onUploadReplaceAudio: (file: File) => void;
  onSplitAtPlayhead: () => void;
  onQuickExtractMp3: () => void;
}

export const ToolPanel: React.FC<ToolPanelProps> = ({
  activeTab,
  state,
  totalDuration,
  onUpdateState,
  onUploadVideo,
  onAddSlideshowImages,
  onUploadSlideshowAudio,
  onUploadReplaceAudio,
  onSplitAtPlayhead,
  onQuickExtractMp3,
}) => {
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const slideImagesInputRef = useRef<HTMLInputElement | null>(null);
  const slideAudioInputRef = useRef<HTMLInputElement | null>(null);
  const replaceAudioInputRef = useRef<HTMLInputElement | null>(null);

  const safeDuration = Math.max(1, totalDuration);

  // Render Media & Slideshow Panel (Feature 1)
  if (activeTab === 'media') {
    return (
      <div className="space-y-6 p-4 text-sm">
        <div className="space-y-1">
          <h2 className="font-display text-base font-semibold text-white">
            Media & Image Slideshow
          </h2>
          <p className="text-xs text-slate-400">
            Switch between single-video editing or build an MP4 video from ordered images and
            an audio track.
          </p>
        </div>

        {/* Mode Segmented Toggle */}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-900 p-1 border border-slate-800">
          <button
            type="button"
            onClick={() =>
              onUpdateState((prev) => ({
                ...prev,
                mode: 'video',
              }))
            }
            className={`rounded-lg py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              state.mode === 'video'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Video Clip Mode
          </button>
          <button
            type="button"
            onClick={() =>
              onUpdateState((prev) => {
                const slidesDur = prev.slides.reduce((a, b) => a + b.duration, 0) || 9;
                return {
                  ...prev,
                  mode: 'slideshow',
                  trim: { ...prev.trim, start: 0, end: slidesDur },
                };
              })
            }
            className={`rounded-lg py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              state.mode === 'slideshow'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Image + Audio Mode
          </button>
        </div>

        {state.mode === 'video' ? (
          <div className="space-y-4">
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*,.mp4,.webm,.mov,.mkv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onUploadVideo(f);
              }}
              className="sr-only"
            />
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-dashed border-purple-500/50 bg-purple-950/20 px-4 py-3 text-xs font-semibold text-purple-200 hover:bg-purple-950/40 whitespace-nowrap shrink-0"
            >
              <Upload className="h-4 w-4 text-purple-400" />
              Upload Video File (MP4 / WebM / MOV)
            </button>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-medium">Current Source</span>
                <span className="font-mono text-purple-400 tabular-nums">
                  {state.videoWidth}×{state.videoHeight}
                </span>
              </div>
              <p className="truncate text-slate-400">
                {state.videoName || 'Built-in Studio Sequence'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Upload Images & Audio for Slideshow */}
            <div className="grid grid-cols-1 gap-2.5">
              <input
                ref={slideImagesInputRef}
                type="file"
                multiple
                accept="image/*,.jpg,.jpeg,.png,.webp"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    onAddSlideshowImages(e.target.files);
                  }
                }}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => slideImagesInputRef.current?.click()}
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-purple-500/40 bg-purple-950/20 px-3 py-2.5 text-xs font-semibold text-purple-200 hover:bg-purple-950/40 whitespace-nowrap shrink-0"
              >
                <ImageIcon className="h-4 w-4 text-purple-400" />
                Add Slide Images (JPG / PNG / WebP)
              </button>

              <input
                ref={slideAudioInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.aac,.m4a"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadSlideshowAudio(f);
                }}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => slideAudioInputRef.current?.click()}
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-pink-500/40 bg-pink-950/20 px-3 py-2.5 text-xs font-semibold text-pink-200 hover:bg-pink-950/40 whitespace-nowrap shrink-0"
              >
                <AudioLines className="h-4 w-4 text-pink-400" />
                Upload Slideshow Audio Track
              </button>
            </div>

            {/* Auto-Match Audio Length Toggle */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="auto-match-audio-toggle"
                  className="text-xs font-medium text-slate-200"
                >
                  Match Video Length to Audio ({state.slideshowAudioDuration.toFixed(1)}s)
                </label>
                <input
                  id="auto-match-audio-toggle"
                  type="checkbox"
                  checked={state.autoMatchAudioLength}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    onUpdateState((prev) => {
                      const nextSlides =
                        checked && prev.slideshowAudioDuration > 0
                          ? syncSlidesToAudioDuration(
                              prev.slides,
                              prev.slideshowAudioDuration
                            )
                          : prev.slides;
                      const totalDur = nextSlides.reduce((a, b) => a + b.duration, 0);
                      return {
                        ...prev,
                        autoMatchAudioLength: checked,
                        slides: nextSlides,
                        trim: { ...prev.trim, start: 0, end: totalDur },
                      };
                    });
                  }}
                  className="h-4 w-4 accent-purple-500 rounded"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Audio: {state.slideshowAudioName || 'clipforge_synth_beat.wav'}
              </p>
            </div>

            {/* Ordered Slides List with Per-Image Duration & Reorder */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Slide Sequence ({state.slides.length})</span>
                <span className="font-mono tabular-nums">
                  Total:{' '}
                  {state.slides
                    .reduce((acc, s) => acc + s.duration, 0)
                    .toFixed(1)}
                  s
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {state.slides.map((slide: SlideImageItem, index: number) => (
                  <div
                    key={slide.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/80 p-2.5"
                  >
                    <img
                      src={slide.url}
                      alt={slide.name}
                      referrerPolicy="no-referrer"
                      className="h-10 w-14 rounded object-cover bg-slate-800 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-200">
                        {index + 1}. {slide.name}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <label
                          htmlFor={`slide-dur-${slide.id}`}
                          className="text-[11px] text-slate-400"
                        >
                          Duration (s):
                        </label>
                        <input
                          id={`slide-dur-${slide.id}`}
                          type="number"
                          min={0.5}
                          max={60}
                          step={0.5}
                          value={slide.duration}
                          onChange={(e) => {
                            const val = Math.max(0.5, Number(e.target.value) || 1);
                            onUpdateState((prev) => {
                              const nextSlides = prev.slides.map((s) =>
                                s.id === slide.id ? { ...s, duration: val } : s
                              );
                              const totalDur = nextSlides.reduce(
                                (a, b) => a + b.duration,
                                0
                              );
                              return {
                                ...prev,
                                autoMatchAudioLength: false,
                                slides: nextSlides,
                                trim: { ...prev.trim, end: totalDur },
                              };
                            });
                          }}
                          className="w-16 rounded border border-slate-700 bg-slate-950 px-1.5 py-0.5 font-mono text-xs text-white tabular-nums"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() =>
                          onUpdateState((prev) => {
                            const arr = [...prev.slides];
                            const [moved] = arr.splice(index, 1);
                            arr.splice(index - 1, 0, moved);
                            return { ...prev, slides: arr };
                          })
                        }
                        aria-label={`Move slide ${index + 1} up`}
                        className="rounded bg-slate-800 p-1 text-slate-300 hover:text-white disabled:opacity-30"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={index === state.slides.length - 1}
                        onClick={() =>
                          onUpdateState((prev) => {
                            const arr = [...prev.slides];
                            const [moved] = arr.splice(index, 1);
                            arr.splice(index + 1, 0, moved);
                            return { ...prev, slides: arr };
                          })
                        }
                        aria-label={`Move slide ${index + 1} down`}
                        className="rounded bg-slate-800 p-1 text-slate-300 hover:text-white disabled:opacity-30"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>

                    {state.slides.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateState((prev) => {
                            const nextSlides = prev.slides.filter(
                              (s) => s.id !== slide.id
                            );
                            const totalDur = nextSlides.reduce(
                              (a, b) => a + b.duration,
                              0
                            );
                            return {
                              ...prev,
                              slides: nextSlides,
                              trim: { ...prev.trim, end: totalDur },
                            };
                          })
                        }
                        aria-label={`Remove ${slide.name}`}
                        className="rounded p-1.5 text-slate-400 hover:bg-red-950/50 hover:text-red-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Render Video Trim / Cut Panel (Feature 2)
  if (activeTab === 'trim') {
    return (
      <div className="space-y-6 p-4 text-sm">
        <div className="space-y-1">
          <h2 className="font-display text-base font-semibold text-white">
            Video Trim & Split
          </h2>
          <p className="text-xs text-slate-400">
            Drag the purple and pink handles on the timeline or set exact start and end
            timestamps below.
          </p>
        </div>

        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <label htmlFor="trim-start-range" className="text-slate-300 font-medium">
                Start Point (In)
              </label>
              <span className="font-mono text-purple-400 tabular-nums">
                {formatTimecode(state.trim.start)}
              </span>
            </div>
            <input
              id="trim-start-range"
              type="range"
              min={0}
              max={Math.max(0.5, (state.trim.end || safeDuration) - 0.5)}
              step={0.1}
              value={state.trim.start}
              onChange={(e) => {
                const val = Number(e.target.value);
                onUpdateState((prev) => ({
                  ...prev,
                  trim: { ...prev.trim, start: val },
                }));
              }}
              className="w-full accent-purple-500"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <label htmlFor="trim-end-range" className="text-slate-300 font-medium">
                End Point (Out)
              </label>
              <span className="font-mono text-pink-400 tabular-nums">
                {formatTimecode(state.trim.end || safeDuration)}
              </span>
            </div>
            <input
              id="trim-end-range"
              type="range"
              min={Math.min(safeDuration, state.trim.start + 0.5)}
              max={safeDuration}
              step={0.1}
              value={state.trim.end || safeDuration}
              onChange={(e) => {
                const val = Number(e.target.value);
                onUpdateState((prev) => ({
                  ...prev,
                  trim: { ...prev.trim, end: val },
                }));
              }}
              className="w-full accent-pink-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
            <span className="text-slate-400">Trimmed Clip Duration</span>
            <span className="font-mono font-semibold text-white tabular-nums">
              {Math.max(0.1, (state.trim.end || safeDuration) - state.trim.start).toFixed(2)}s
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onSplitAtPlayhead}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 whitespace-nowrap shrink-0"
          >
            <Scissors className="h-4 w-4 text-purple-400" />
            Split Clip at Playhead (Shortcut: S)
          </button>

          <button
            type="button"
            onClick={() =>
              onUpdateState((prev) => ({
                ...prev,
                trim: { start: 0, end: safeDuration, segments: [] },
              }))
            }
            className="flex min-h-[40px] items-center justify-center rounded-xl border border-slate-800 px-4 py-2 text-xs font-medium text-slate-400 hover:text-white whitespace-nowrap shrink-0"
          >
            Reset Full Duration
          </button>
        </div>
      </div>
    );
  }

  // Render Video Crop Panel (Feature 3)
  if (activeTab === 'crop') {
    const presets: { id: CropPreset; label: string; desc: string }[] = [
      { id: '9:16', label: '9:16', desc: 'TikTok / Reels' },
      { id: '1:1', label: '1:1', desc: 'Square Post' },
      { id: '16:9', label: '16:9', desc: 'YouTube / Wide' },
      { id: '4:5', label: '4:5', desc: 'Portrait Feed' },
      { id: 'free', label: 'Free', desc: 'Custom Box' },
    ];

    return (
      <div className="space-y-6 p-4 text-sm">
        <div className="space-y-1">
          <h2 className="font-display text-base font-semibold text-white">
            Visual Frame Crop
          </h2>
          <p className="text-xs text-slate-400">
            Select a social aspect ratio preset or adjust custom crop boundaries over the
            preview canvas.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {presets.map((p) => {
            const isSelected = state.crop.preset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  const nextRect = calculatePresetCropRect(
                    p.id,
                    state.videoWidth || 1280,
                    state.videoHeight || 720
                  );
                  onUpdateState((prev) => ({
                    ...prev,
                    crop: nextRect,
                  }));
                }}
                className={`flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-colors ${
                  isSelected
                    ? 'border-purple-500 bg-purple-950/30 text-white'
                    : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                <Crop className="h-4 w-4 mb-1 text-purple-400" />
                <span className="font-mono text-xs font-bold">{p.label}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">{p.desc}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between">
              <label htmlFor="crop-width-slider" className="text-slate-300">
                Crop Width (%)
              </label>
              <span className="font-mono text-purple-400 tabular-nums">
                {Math.round(state.crop.width)}%
              </span>
            </div>
            <input
              id="crop-width-slider"
              type="range"
              min={20}
              max={100}
              value={state.crop.width}
              onChange={(e) => {
                const width = Number(e.target.value);
                onUpdateState((prev) => ({
                  ...prev,
                  crop: {
                    ...prev.crop,
                    preset: 'free',
                    width,
                    x: Math.min(prev.crop.x, 100 - width),
                  },
                }));
              }}
              className="w-full accent-purple-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <label htmlFor="crop-height-slider" className="text-slate-300">
                Crop Height (%)
              </label>
              <span className="font-mono text-purple-400 tabular-nums">
                {Math.round(state.crop.height)}%
              </span>
            </div>
            <input
              id="crop-height-slider"
              type="range"
              min={20}
              max={100}
              value={state.crop.height}
              onChange={(e) => {
                const height = Number(e.target.value);
                onUpdateState((prev) => ({
                  ...prev,
                  crop: {
                    ...prev.crop,
                    preset: 'free',
                    height,
                    y: Math.min(prev.crop.y, 100 - height),
                  },
                }));
              }}
              className="w-full accent-purple-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <label htmlFor="crop-x-slider" className="text-slate-300">
                Horizontal Offset (X)
              </label>
              <span className="font-mono text-slate-400 tabular-nums">
                {Math.round(state.crop.x)}%
              </span>
            </div>
            <input
              id="crop-x-slider"
              type="range"
              min={0}
              max={Math.max(0, 100 - state.crop.width)}
              value={state.crop.x}
              onChange={(e) => {
                const x = Number(e.target.value);
                onUpdateState((prev) => ({
                  ...prev,
                  crop: { ...prev.crop, preset: 'free', x },
                }));
              }}
              className="w-full accent-purple-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <label htmlFor="crop-y-slider" className="text-slate-300">
                Vertical Offset (Y)
              </label>
              <span className="font-mono text-slate-400 tabular-nums">
                {Math.round(state.crop.y)}%
              </span>
            </div>
            <input
              id="crop-y-slider"
              type="range"
              min={0}
              max={Math.max(0, 100 - state.crop.height)}
              value={state.crop.y}
              onChange={(e) => {
                const y = Number(e.target.value);
                onUpdateState((prev) => ({
                  ...prev,
                  crop: { ...prev.crop, preset: 'free', y },
                }));
              }}
              className="w-full accent-purple-500"
            />
          </div>
        </div>
      </div>
    );
  }

  // Render Audio Panel (Features 4, 5 & 7d)
  if (activeTab === 'audio') {
    return (
      <div className="space-y-6 p-4 text-sm">
        <div className="space-y-1">
          <h2 className="font-display text-base font-semibold text-white">
            Audio Mixer & Sound Replacement
          </h2>
          <p className="text-xs text-slate-400">
            Mute original video sound in one click, replace with custom music, or mix both
            tracks together.
          </p>
        </div>

        {/* Feature 4: One-Click Mute Video */}
        <button
          type="button"
          onClick={() =>
            onUpdateState((prev) => ({
              ...prev,
              audio: { ...prev.audio, muted: !prev.audio.muted },
            }))
          }
          className={`flex w-full min-h-[44px] items-center justify-between rounded-xl border px-4 py-3 text-xs font-semibold transition-colors ${
            state.audio.muted
              ? 'border-pink-500/60 bg-pink-950/30 text-pink-200'
              : 'border-slate-800 bg-slate-900/80 text-slate-200 hover:border-slate-700'
          }`}
        >
          <span className="flex items-center gap-2">
            {state.audio.muted ? (
              <VolumeX className="h-4 w-4 text-pink-400" />
            ) : (
              <Volume2 className="h-4 w-4 text-purple-400" />
            )}
            Mute Video (Strip Audio Track)
          </span>
          <span className="font-mono uppercase">
            {state.audio.muted ? 'MUTED' : 'ACTIVE'}
          </span>
        </button>

        {/* Original Audio Volume */}
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between">
              <label htmlFor="orig-volume-slider" className="text-slate-300 font-medium">
                Original Audio Volume
              </label>
              <span className="font-mono text-purple-400 tabular-nums">
                {state.audio.originalVolume}%
              </span>
            </div>
            <input
              id="orig-volume-slider"
              type="range"
              min={0}
              max={200}
              value={state.audio.originalVolume}
              disabled={state.audio.muted}
              onChange={(e) => {
                const originalVolume = Number(e.target.value);
                onUpdateState((prev) => ({
                  ...prev,
                  audio: { ...prev.audio, originalVolume },
                }));
              }}
              className="w-full accent-purple-500"
            />
          </div>
        </div>

        {/* Feature 5: Replace / Mix Audio Track */}
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">Replace / Add Music Track</span>
            {state.audio.replaceName && (
              <button
                type="button"
                onClick={() =>
                  onUpdateState((prev) => ({
                    ...prev,
                    audio: {
                      ...prev.audio,
                      replaceFile: null,
                      replaceUrl: null,
                      replaceName: null,
                    },
                  }))
                }
                className="text-[11px] text-red-400 hover:underline"
              >
                Remove
              </button>
            )}
          </div>

          <input
            ref={replaceAudioInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.aac,.m4a,.ogg"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUploadReplaceAudio(f);
            }}
            className="sr-only"
          />

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => replaceAudioInputRef.current?.click()}
              className="flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-purple-500/40 bg-purple-950/20 px-3 py-2 font-semibold text-purple-200 hover:bg-purple-950/40 whitespace-nowrap shrink-0"
            >
              <Upload className="h-4 w-4 text-purple-400" />
              Upload Replacement Audio
            </button>

            <button
              type="button"
              onClick={() => {
                const synth = createDemoAudioWavFile(
                  Math.ceil(safeDuration),
                  'studio_ambient_mix.wav'
                );
                onUpdateState((prev) => ({
                  ...prev,
                  audio: {
                    ...prev.audio,
                    muted: false,
                    replaceFile: synth.file,
                    replaceUrl: synth.url,
                    replaceName: synth.file.name,
                  },
                }));
              }}
              className="flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-slate-300 hover:text-white whitespace-nowrap shrink-0"
            >
              <AudioLines className="h-3.5 w-3.5 text-pink-400" />
              Load Built-In Synth Soundtrack
            </button>
          </div>

          {state.audio.replaceName && (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <p className="truncate text-emerald-300 font-medium">
                Loaded: {state.audio.replaceName}
              </p>

              <div className="space-y-1">
                <div className="flex justify-between">
                  <label htmlFor="replace-vol-slider" className="text-slate-300">
                    New Audio Volume
                  </label>
                  <span className="font-mono text-pink-400 tabular-nums">
                    {state.audio.replaceVolume}%
                  </span>
                </div>
                <input
                  id="replace-vol-slider"
                  type="range"
                  min={0}
                  max={200}
                  value={state.audio.replaceVolume}
                  onChange={(e) => {
                    const replaceVolume = Number(e.target.value);
                    onUpdateState((prev) => ({
                      ...prev,
                      audio: { ...prev.audio, replaceVolume },
                    }));
                  }}
                  className="w-full accent-pink-500"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <label htmlFor="mix-original-toggle" className="text-slate-200">
                  Mix with Original Video Audio
                </label>
                <input
                  id="mix-original-toggle"
                  type="checkbox"
                  checked={state.audio.mixWithOriginal}
                  onChange={(e) => {
                    const mixWithOriginal = e.target.checked;
                    onUpdateState((prev) => ({
                      ...prev,
                      audio: { ...prev.audio, mixWithOriginal },
                    }));
                  }}
                  className="h-4 w-4 accent-purple-500 rounded"
                />
              </div>
            </div>
          )}
        </div>

        {/* Feature 7d: Extract Audio as MP3 */}
        <button
          type="button"
          onClick={onQuickExtractMp3}
          className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:border-purple-500/50 hover:text-white whitespace-nowrap shrink-0"
        >
          <Download className="h-4 w-4 text-purple-400" />
          Extract Audio from Video (MP3)
        </button>
      </div>
    );
  }

  // Render Effects Panel (Feature 6)
  if (activeTab === 'effects') {
    return (
      <div className="space-y-5 p-4 text-sm">
        <div className="space-y-1">
          <h2 className="font-display text-base font-semibold text-white">
            Visual & Audio Effects
          </h2>
          <p className="text-xs text-slate-400">
            All effects preview live on the canvas and compile to FFmpeg filtergraphs on
            export.
          </p>
        </div>

        {/* Fade In & Fade Out (Video + Audio) */}
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 text-xs">
          <div className="flex items-center justify-between">
            <label htmlFor="fade-in-toggle" className="font-semibold text-white">
              Fade In (Video & Audio)
            </label>
            <input
              id="fade-in-toggle"
              type="checkbox"
              checked={state.effects.fadeIn}
              onChange={(e) => {
                const fadeIn = e.target.checked;
                onUpdateState((prev) => ({
                  ...prev,
                  effects: { ...prev.effects, fadeIn },
                }));
              }}
              className="h-4 w-4 accent-purple-500 rounded"
            />
          </div>
          {state.effects.fadeIn && (
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Fade In Duration</span>
                <span className="font-mono text-purple-400 tabular-nums">
                  {state.effects.fadeInDuration.toFixed(1)}s
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={5.0}
                step={0.5}
                value={state.effects.fadeInDuration}
                aria-label="Fade in duration"
                onChange={(e) => {
                  const fadeInDuration = Number(e.target.value);
                  onUpdateState((prev) => ({
                    ...prev,
                    effects: { ...prev.effects, fadeInDuration },
                  }));
                }}
                className="w-full accent-purple-500"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <label htmlFor="fade-out-toggle" className="font-semibold text-white">
              Fade Out (Video & Audio)
            </label>
            <input
              id="fade-out-toggle"
              type="checkbox"
              checked={state.effects.fadeOut}
              onChange={(e) => {
                const fadeOut = e.target.checked;
                onUpdateState((prev) => ({
                  ...prev,
                  effects: { ...prev.effects, fadeOut },
                }));
              }}
              className="h-4 w-4 accent-pink-500 rounded"
            />
          </div>
          {state.effects.fadeOut && (
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Fade Out Duration</span>
                <span className="font-mono text-pink-400 tabular-nums">
                  {state.effects.fadeOutDuration.toFixed(1)}s
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={5.0}
                step={0.5}
                value={state.effects.fadeOutDuration}
                aria-label="Fade out duration"
                onChange={(e) => {
                  const fadeOutDuration = Number(e.target.value);
                  onUpdateState((prev) => ({
                    ...prev,
                    effects: { ...prev.effects, fadeOutDuration },
                  }));
                }}
                className="w-full accent-pink-500"
              />
            </div>
          )}
        </div>

        {/* Glitch Effect (RGB Split / Noise / Shake) */}
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 text-xs">
          <div className="flex items-center justify-between">
            <label
              htmlFor="glitch-toggle"
              className="flex items-center gap-1.5 font-semibold text-white"
            >
              <Sparkles className="h-3.5 w-3.5 text-pink-400" />
              Glitch Effect (RGB Split & Shake)
            </label>
            <input
              id="glitch-toggle"
              type="checkbox"
              checked={state.effects.glitch}
              onChange={(e) => {
                const glitch = e.target.checked;
                onUpdateState((prev) => ({
                  ...prev,
                  effects: { ...prev.effects, glitch },
                }));
              }}
              className="h-4 w-4 accent-pink-500 rounded"
            />
          </div>

          {state.effects.glitch && (
            <div className="space-y-2.5 pt-1">
              <div className="space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Chromatic Split Intensity</span>
                  <span className="font-mono text-pink-400 tabular-nums">
                    {state.effects.glitchIntensity} / 10
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={state.effects.glitchIntensity}
                  aria-label="Glitch intensity"
                  onChange={(e) => {
                    const glitchIntensity = Number(e.target.value);
                    onUpdateState((prev) => ({
                      ...prev,
                      effects: { ...prev.effects, glitchIntensity },
                    }));
                  }}
                  className="w-full accent-pink-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Glitch Active Duration</span>
                  <span className="font-mono text-pink-400 tabular-nums">
                    {state.effects.glitchDuration.toFixed(1)}s
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={Math.max(2, safeDuration)}
                  step={0.5}
                  value={state.effects.glitchDuration}
                  aria-label="Glitch duration"
                  onChange={(e) => {
                    const glitchDuration = Number(e.target.value);
                    onUpdateState((prev) => ({
                      ...prev,
                      effects: { ...prev.effects, glitchDuration },
                    }));
                  }}
                  className="w-full accent-pink-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Extra Studio Filters: B&W, Vignette, Zoom In, Blur, Brightness, Contrast */}
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3.5 text-xs">
          <span className="font-semibold text-white block">
            Color Grading & Optics
          </span>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() =>
                onUpdateState((prev) => ({
                  ...prev,
                  effects: {
                    ...prev.effects,
                    blackAndWhite: !prev.effects.blackAndWhite,
                  },
                }))
              }
              className={`rounded-lg border py-2 px-2 font-medium transition-colors whitespace-nowrap shrink-0 ${
                state.effects.blackAndWhite
                  ? 'border-purple-500 bg-purple-950/40 text-white'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              B&W Mono
            </button>

            <button
              type="button"
              onClick={() =>
                onUpdateState((prev) => ({
                  ...prev,
                  effects: {
                    ...prev.effects,
                    vignette: !prev.effects.vignette,
                  },
                }))
              }
              className={`rounded-lg border py-2 px-2 font-medium transition-colors whitespace-nowrap shrink-0 ${
                state.effects.vignette
                  ? 'border-purple-500 bg-purple-950/40 text-white'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              Vignette
            </button>

            <button
              type="button"
              onClick={() =>
                onUpdateState((prev) => ({
                  ...prev,
                  effects: {
                    ...prev.effects,
                    zoomIn: !prev.effects.zoomIn,
                  },
                }))
              }
              className={`rounded-lg border py-2 px-2 font-medium transition-colors whitespace-nowrap shrink-0 ${
                state.effects.zoomIn
                  ? 'border-purple-500 bg-purple-950/40 text-white'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              Zoom In
            </button>
          </div>

          {state.effects.zoomIn && (
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Zoom Magnification</span>
                <span className="font-mono text-purple-400 tabular-nums">
                  {state.effects.zoomAmount.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min={1.05}
                max={1.5}
                step={0.05}
                value={state.effects.zoomAmount}
                aria-label="Zoom amount"
                onChange={(e) => {
                  const zoomAmount = Number(e.target.value);
                  onUpdateState((prev) => ({
                    ...prev,
                    effects: { ...prev.effects, zoomAmount },
                  }));
                }}
                className="w-full accent-purple-500"
              />
            </div>
          )}

          <div className="space-y-1">
            <div className="flex justify-between text-slate-400">
              <label htmlFor="blur-slider">Gaussian Blur</label>
              <span className="font-mono text-purple-400 tabular-nums">
                {state.effects.blur}px
              </span>
            </div>
            <input
              id="blur-slider"
              type="range"
              min={0}
              max={16}
              step={1}
              value={state.effects.blur}
              onChange={(e) => {
                const blur = Number(e.target.value);
                onUpdateState((prev) => ({
                  ...prev,
                  effects: { ...prev.effects, blur },
                }));
              }}
              className="w-full accent-purple-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-slate-400">
              <label htmlFor="brightness-slider">Brightness</label>
              <span className="font-mono text-purple-400 tabular-nums">
                {state.effects.brightness > 0
                  ? `+${state.effects.brightness}`
                  : state.effects.brightness}
              </span>
            </div>
            <input
              id="brightness-slider"
              type="range"
              min={-40}
              max={40}
              step={5}
              value={state.effects.brightness}
              onChange={(e) => {
                const brightness = Number(e.target.value);
                onUpdateState((prev) => ({
                  ...prev,
                  effects: { ...prev.effects, brightness },
                }));
              }}
              className="w-full accent-purple-500"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-slate-400">
              <label htmlFor="contrast-slider">Contrast</label>
              <span className="font-mono text-purple-400 tabular-nums">
                {state.effects.contrast}%
              </span>
            </div>
            <input
              id="contrast-slider"
              type="range"
              min={60}
              max={150}
              step={5}
              value={state.effects.contrast}
              onChange={(e) => {
                const contrast = Number(e.target.value);
                onUpdateState((prev) => ({
                  ...prev,
                  effects: { ...prev.effects, contrast },
                }));
              }}
              className="w-full accent-purple-500"
            />
          </div>
        </div>
      </div>
    );
  }

  // Render Text Overlay Panel (Feature 7c)
  if (activeTab === 'text') {
    const addTextLayer = () => {
      const newLayer: TextOverlayItem = {
        id: `txt-${Date.now()}`,
        text: 'CLIPFORGE STUDIO',
        fontFamily: 'Plus Jakarta Sans',
        fontSize: 36,
        color: '#FFFFFF',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        x: 50,
        y: 82,
        startTime: 0,
        endTime: Number(safeDuration.toFixed(1)),
      };
      onUpdateState((prev) => ({
        ...prev,
        textOverlays: [...prev.textOverlays, newLayer],
      }));
    };

    return (
      <div className="space-y-5 p-4 text-sm">
        <div className="space-y-1">
          <h2 className="font-display text-base font-semibold text-white">
            Typography & Titles
          </h2>
          <p className="text-xs text-slate-400">
            Add customizable text overlays with font, color, screen position, and timing.
          </p>
        </div>

        <button
          type="button"
          onClick={addTextLayer}
          className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:from-purple-500 hover:to-pink-500 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Text Overlay
        </button>

        {state.textOverlays.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 text-center text-xs text-slate-400">
            No text overlays added yet. Click &ldquo;Add Text Overlay&rdquo; to place a title on
            the video canvas.
          </div>
        ) : (
          <div className="space-y-3">
            {state.textOverlays.map((layer, idx) => (
              <div
                key={layer.id}
                className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-purple-300">
                    Text Layer #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateState((prev) => ({
                        ...prev,
                        textOverlays: prev.textOverlays.filter((t) => t.id !== layer.id),
                      }))
                    }
                    aria-label={`Delete text layer ${idx + 1}`}
                    className="rounded p-1 text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div>
                  <label htmlFor={`text-content-${layer.id}`} className="sr-only">
                    Overlay Text
                  </label>
                  <input
                    id={`text-content-${layer.id}`}
                    type="text"
                    value={layer.text}
                    onChange={(e) => {
                      const text = e.target.value;
                      onUpdateState((prev) => ({
                        ...prev,
                        textOverlays: prev.textOverlays.map((t) =>
                          t.id === layer.id ? { ...t, text } : t
                        ),
                      }));
                    }}
                    placeholder="Enter caption text..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white focus:border-purple-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor={`font-select-${layer.id}`}
                      className="block text-[11px] text-slate-400 mb-1"
                    >
                      Font Family
                    </label>
                    <select
                      id={`font-select-${layer.id}`}
                      value={layer.fontFamily}
                      onChange={(e) => {
                        const fontFamily = e.target.value as TextOverlayItem['fontFamily'];
                        onUpdateState((prev) => ({
                          ...prev,
                          textOverlays: prev.textOverlays.map((t) =>
                            t.id === layer.id ? { ...t, fontFamily } : t
                          ),
                        }));
                      }}
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white"
                    >
                      <option value="Plus Jakarta Sans">Jakarta Sans</option>
                      <option value="DM Sans">DM Sans</option>
                      <option value="JetBrains Mono">JetBrains Mono</option>
                      <option value="Impact">Impact Bold</option>
                      <option value="Georgia">Georgia Serif</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor={`color-select-${layer.id}`}
                      className="block text-[11px] text-slate-400 mb-1"
                    >
                      Text Color
                    </label>
                    <input
                      id={`color-select-${layer.id}`}
                      type="color"
                      value={layer.color}
                      onChange={(e) => {
                        const color = e.target.value;
                        onUpdateState((prev) => ({
                          ...prev,
                          textOverlays: prev.textOverlays.map((t) =>
                            t.id === layer.id ? { ...t, color } : t
                          ),
                        }));
                      }}
                      className="h-8 w-full cursor-pointer rounded border border-slate-700 bg-slate-950 p-0.5"
                    />
                  </div>
                </div>

                {/* Quick Position Presets */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {[
                    { label: 'Top', y: 18 },
                    { label: 'Center', y: 50 },
                    { label: 'Bottom', y: 82 },
                  ].map((pos) => (
                    <button
                      key={pos.label}
                      type="button"
                      onClick={() =>
                        onUpdateState((prev) => ({
                          ...prev,
                          textOverlays: prev.textOverlays.map((t) =>
                            t.id === layer.id ? { ...t, x: 50, y: pos.y } : t
                          ),
                        }))
                      }
                      className={`rounded border py-1 text-[11px] font-medium ${
                        Math.abs(layer.y - pos.y) < 5
                          ? 'border-purple-500 bg-purple-950/40 text-white'
                          : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Render Speed, Rotate & Utilities Panel (Feature 7)
  return (
    <div className="space-y-6 p-4 text-sm">
      <div className="space-y-1">
        <h2 className="font-display text-base font-semibold text-white">
          Speed, Rotate & Utilities
        </h2>
        <p className="text-xs text-slate-400">
          Control playback velocity (0.5x to 2x), rotate or mirror orientation, and extract
          MP3 audio.
        </p>
      </div>

      {/* Speed Control (0.5x to 2x) */}
      <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-white">Playback Speed</span>
          <span className="font-mono text-purple-400 font-bold tabular-nums">
            {state.transform.speed.toFixed(2)}x
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() =>
                onUpdateState((prev) => ({
                  ...prev,
                  transform: { ...prev.transform, speed: spd },
                }))
              }
              className={`rounded-lg border py-2 font-mono text-xs font-medium transition-colors tabular-nums ${
                Math.abs(state.transform.speed - spd) < 0.02
                  ? 'border-purple-500 bg-purple-950/40 text-white'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>

      {/* Rotate & Flip */}
      <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs">
        <span className="font-semibold text-white block">
          Orientation & Mirroring
        </span>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() =>
              onUpdateState((prev) => ({
                ...prev,
                transform: {
                  ...prev.transform,
                  rotation: ((prev.transform.rotation + 90) % 360) as 0 | 90 | 180 | 270,
                },
              }))
            }
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-slate-800 bg-slate-950 p-3 text-slate-300 hover:border-purple-500/40 hover:text-white"
          >
            <RotateCw className="h-4 w-4 text-purple-400" />
            <span>Rotate 90°</span>
            <span className="font-mono text-[10px] text-slate-500 tabular-nums">
              ({state.transform.rotation}°)
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              onUpdateState((prev) => ({
                ...prev,
                transform: {
                  ...prev.transform,
                  flipH: !prev.transform.flipH,
                },
              }))
            }
            className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-3 ${
              state.transform.flipH
                ? 'border-purple-500 bg-purple-950/30 text-white'
                : 'border-slate-800 bg-slate-950 text-slate-300 hover:text-white'
            }`}
          >
            <FlipHorizontal className="h-4 w-4 text-pink-400" />
            <span>Flip Horiz</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onUpdateState((prev) => ({
                ...prev,
                transform: {
                  ...prev.transform,
                  flipV: !prev.transform.flipV,
                },
              }))
            }
            className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-3 ${
              state.transform.flipV
                ? 'border-purple-500 bg-purple-950/30 text-white'
                : 'border-slate-800 bg-slate-950 text-slate-300 hover:text-white'
            }`}
          >
            <FlipVertical className="h-4 w-4 text-pink-400" />
            <span>Flip Vert</span>
          </button>
        </div>
      </div>

      {/* Extract Audio Utility */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2.5 text-xs">
        <span className="font-semibold text-white block">
          Audio Track Extraction
        </span>
        <p className="text-slate-400">
          Strip the video stream and export only the trimmed audio track as an MP3 file.
        </p>
        <button
          type="button"
          onClick={onQuickExtractMp3}
          className="flex w-full min-h-[42px] items-center justify-center gap-2 rounded-xl bg-slate-800 px-3 py-2 font-semibold text-white hover:bg-slate-700 whitespace-nowrap shrink-0"
        >
          <Download className="h-4 w-4 text-purple-400" />
          Extract Audio (MP3)
        </button>
      </div>
    </div>
  );
};
