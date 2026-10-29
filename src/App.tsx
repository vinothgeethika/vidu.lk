import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AudioLines,
  Crop,
  Download,
  FolderOpen,
  Layers,
  Redo2,
  Scissors,
  Sliders,
  Sparkles,
  Type,
  Undo2,
  X,
} from 'lucide-react';
import {
  AppView,
  EditorState,
  ExportSettings,
  SlideImageItem,
  ToolTabId,
} from './types/editor';
import { useHistory } from './hooks/useHistory';
import { FFmpegExportResult, useFFmpeg } from './hooks/useFFmpeg';
import {
  syncSlidesToAudioDuration,
  validateMediaFile,
} from './utils/ffmpegCommands';
import {
  createDemoAudioWavFile,
  createDemoSlideshowImages,
} from './utils/demoMediaGenerator';
import { LandingScreen } from './components/LandingScreen';
import { PreviewPlayer } from './components/PreviewPlayer';
import { Timeline } from './components/Timeline';
import { ToolPanel } from './components/ToolPanel';
import { PropertiesPanel } from './components/PropertiesPanel';
import { ExportModal } from './components/ExportModal';
import { PricingView } from './components/PricingView';
import { SettingsView } from './components/SettingsView';

const INITIAL_EDITOR_STATE: EditorState = {
  projectName: 'Neon Studio Edit',
  mode: 'video',
  videoFile: null,
  videoUrl: null,
  videoName: 'studio_sequence_720p.mp4',
  videoDuration: 9,
  videoWidth: 1280,
  videoHeight: 720,
  videoSizeBytes: 0,
  slides: [],
  slideshowAudioFile: null,
  slideshowAudioUrl: null,
  slideshowAudioName: 'clipforge_synth_beat.wav',
  slideshowAudioDuration: 9,
  autoMatchAudioLength: true,
  trim: {
    start: 0,
    end: 9,
    segments: [
      { id: 'seg-1', label: 'Scene 01', start: 0, end: 9 },
    ],
  },
  crop: {
    preset: '16:9',
    x: 0,
    y: 0,
    width: 100,
    height: 100,
  },
  audio: {
    muted: false,
    originalVolume: 100,
    replaceFile: null,
    replaceUrl: null,
    replaceName: null,
    replaceVolume: 100,
    mixWithOriginal: false,
  },
  effects: {
    fadeIn: false,
    fadeInDuration: 1.0,
    fadeOut: false,
    fadeOutDuration: 1.0,
    glitch: false,
    glitchIntensity: 5,
    glitchDuration: 3.0,
    blackAndWhite: false,
    blur: 0,
    brightness: 0,
    contrast: 100,
    zoomIn: false,
    zoomAmount: 1.15,
    vignette: false,
  },
  transform: {
    speed: 1,
    rotation: 0,
    flipH: false,
    flipV: false,
  },
  textOverlays: [
    {
      id: 'txt-initial',
      text: 'CLIPFORGE STUDIO',
      fontFamily: 'Plus Jakarta Sans',
      fontSize: 36,
      color: '#FFFFFF',
      backgroundColor: 'rgba(15, 23, 42, 0.72)',
      x: 50,
      y: 84,
      startTime: 0,
      endTime: 9,
    },
  ],
};

const TOOL_TABS: { id: ToolTabId; label: string; icon: React.ReactNode }[] = [
  { id: 'media', label: 'Media', icon: <Layers className="h-4 w-4" /> },
  { id: 'trim', label: 'Trim', icon: <Scissors className="h-4 w-4" /> },
  { id: 'crop', label: 'Crop', icon: <Crop className="h-4 w-4" /> },
  { id: 'audio', label: 'Audio', icon: <AudioLines className="h-4 w-4" /> },
  { id: 'effects', label: 'Effects', icon: <Sparkles className="h-4 w-4" /> },
  { id: 'text', label: 'Text', icon: <Type className="h-4 w-4" /> },
  { id: 'utilities', label: 'Speed', icon: <Sliders className="h-4 w-4" /> },
];

export default function App() {
  const isAutostart = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('autostart') === '1';
  }, []);

  const [view, setView] = useState<AppView>(isAutostart ? 'editor' : 'landing');
  const [activeTab, setActiveTab] = useState<ToolTabId>('trim');
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  const {
    state,
    set: setEditorState,
    undo,
    redo,
    reset: resetEditorHistory,
    canUndo,
    canRedo,
  } = useHistory<EditorState>(INITIAL_EDITOR_STATE);

  const {
    isLoaded: isWasmLoaded,
    isLoadingEngine,
    isProcessing,
    progress,
    statusMessage,
    error: ffmpegError,
    loadEngine,
    runExport,
    cancelProcessing,
    clearError,
  } = useFFmpeg();

  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    resolution: '720p',
    quality: 'standard',
    format: 'mp4',
    fps: 30,
  });

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportResult, setExportResult] = useState<FFmpegExportResult | null>(null);
  const [validationNotice, setValidationNotice] = useState<{
    type: 'error' | 'warning';
    message: string;
  } | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const quickUploadInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize built-in procedural demo slides & audio on mount so studio is always ready
  useEffect(() => {
    let mounted = true;
    (async () => {
      const demoSlides = await createDemoSlideshowImages();
      const demoAudio = createDemoAudioWavFile(9, 'clipforge_synth_beat.wav');
      if (!mounted) return;
      setEditorState(
        (prev) => ({
          ...prev,
          slides: prev.slides.length > 0 ? prev.slides : demoSlides,
          slideshowAudioFile: prev.slideshowAudioFile || demoAudio.file,
          slideshowAudioUrl: prev.slideshowAudioUrl || demoAudio.url,
          slideshowAudioDuration: demoAudio.duration,
        }),
        false
      );
    })();
    return () => {
      mounted = false;
    };
  }, [setEditorState]);

  const totalDuration = useMemo(() => {
    if (state.mode === 'slideshow') {
      const slidesSum = state.slides.reduce((acc, s) => acc + s.duration, 0);
      return Math.max(1, slidesSum || state.slideshowAudioDuration || 9);
    }
    return Math.max(1, state.videoDuration || 9);
  }, [state.mode, state.slides, state.slideshowAudioDuration, state.videoDuration]);

  // Playback animation loop
  useEffect(() => {
    if (!isPlaying) return;
    let lastTick = performance.now();
    let rafId = 0;

    const step = (now: number) => {
      const dt = ((now - lastTick) / 1000) * state.transform.speed;
      lastTick = now;

      setCurrentTime((prev) => {
        const endBound = state.trim.end || totalDuration;
        const next = prev + dt;
        if (next >= endBound) {
          setIsPlaying(false);
          return state.trim.start;
        }
        return next;
      });

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, state.transform.speed, state.trim.end, state.trim.start, totalDuration]);

  // Split clip at playhead handler
  const handleSplitAtPlayhead = useCallback(() => {
    setEditorState((prev) => {
      const clipEnd = prev.trim.end || totalDuration;
      const splitPoint =
        currentTime > prev.trim.start + 0.4 && currentTime < clipEnd - 0.4
          ? Number(currentTime.toFixed(2))
          : Number(((prev.trim.start + clipEnd) / 2).toFixed(2));

      const existing =
        prev.trim.segments.length > 0
          ? prev.trim.segments
          : [{ id: 'seg-1', label: 'Scene 1', start: prev.trim.start, end: clipEnd }];

      const nextSegments = existing.flatMap((seg, idx) => {
        if (splitPoint > seg.start + 0.2 && splitPoint < seg.end - 0.2) {
          return [
            {
              id: `${seg.id}-a-${Date.now()}`,
              label: `Part ${idx + 1}A`,
              start: seg.start,
              end: splitPoint,
            },
            {
              id: `${seg.id}-b-${Date.now()}`,
              label: `Part ${idx + 1}B`,
              start: splitPoint,
              end: seg.end,
            },
          ];
        }
        return [seg];
      });

      return {
        ...prev,
        trim: {
          ...prev.trim,
          segments: nextSegments,
        },
      };
    });
  }, [currentTime, setEditorState, totalDuration]);

  // Desktop Keyboard Shortcuts: Space = Play/Pause, S = Split, Ctrl+Z = Undo, Ctrl+Y = Redo, M = Mute
  useEffect(() => {
    if (view !== 'editor') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleSplitAtPlayhead();
      } else if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setEditorState((prev) => ({
          ...prev,
          audio: { ...prev.audio, muted: !prev.audio.muted },
        }));
      } else if (e.key.toLowerCase() === 'e' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsExportModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSplitAtPlayhead, redo, setEditorState, undo, view]);

  // Handle uploading a single video file
  const handleUploadVideoFile = useCallback(
    (file: File) => {
      const validation = validateMediaFile(file);
      if (!validation.valid) {
        setValidationNotice({
          type: 'error',
          message: validation.error || 'Unsupported file',
        });
        return;
      }
      if (validation.warning) {
        setValidationNotice({ type: 'warning', message: validation.warning });
      }

      const url = URL.createObjectURL(file);
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = url;

      tempVideo.onloadedmetadata = () => {
        const dur =
          Number.isFinite(tempVideo.duration) && tempVideo.duration > 0
            ? Number(tempVideo.duration.toFixed(2))
            : 10;
        const w = tempVideo.videoWidth || 1280;
        const h = tempVideo.videoHeight || 720;

        setEditorState((prev) => ({
          ...prev,
          projectName: file.name.replace(/\.[^.]+$/, ''),
          mode: 'video',
          videoFile: file,
          videoUrl: url,
          videoName: file.name,
          videoDuration: dur,
          videoWidth: w,
          videoHeight: h,
          videoSizeBytes: file.size,
          trim: {
            start: 0,
            end: dur,
            segments: [{ id: 'seg-1', label: 'Scene 1', start: 0, end: dur }],
          },
        }));
        setCurrentTime(0);
        setView('editor');
      };

      tempVideo.onerror = () => {
        // Still allow loading into FFmpeg pipeline even if browser native tag can't preview codec
        setEditorState((prev) => ({
          ...prev,
          projectName: file.name.replace(/\.[^.]+$/, ''),
          mode: 'video',
          videoFile: file,
          videoUrl: url,
          videoName: file.name,
          videoDuration: 10,
          videoSizeBytes: file.size,
          trim: { start: 0, end: 10, segments: [] },
        }));
        setCurrentTime(0);
        setView('editor');
      };
    },
    [setEditorState]
  );

  // Handle adding images for Slideshow
  const handleAddSlideshowImages = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const newSlides: SlideImageItem[] = [];

      for (const file of fileArray) {
        const check = validateMediaFile(file);
        if (!check.valid) {
          setValidationNotice({
            type: 'error',
            message: check.error || 'Invalid image',
          });
          continue;
        }
        if (check.warning) {
          setValidationNotice({ type: 'warning', message: check.warning });
        }
        const url = URL.createObjectURL(file);
        newSlides.push({
          id: `slide-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          url,
          file,
          duration: 3,
          width: 1280,
          height: 720,
        });
      }

      if (newSlides.length === 0) return;

      setEditorState((prev) => {
        const combined = [...prev.slides, ...newSlides];
        const synced =
          prev.autoMatchAudioLength && prev.slideshowAudioDuration > 0
            ? syncSlidesToAudioDuration(combined, prev.slideshowAudioDuration)
            : combined;
        const totalDur = synced.reduce((acc, s) => acc + s.duration, 0);
        return {
          ...prev,
          mode: 'slideshow',
          slides: synced,
          trim: { ...prev.trim, start: 0, end: totalDur },
        };
      });
      setView('editor');
    },
    [setEditorState]
  );

  // Handle uploading audio for Slideshow
  const handleUploadSlideshowAudio = useCallback(
    (file: File) => {
      const check = validateMediaFile(file);
      if (!check.valid) {
        setValidationNotice({
          type: 'error',
          message: check.error || 'Unsupported audio file',
        });
        return;
      }
      const url = URL.createObjectURL(file);
      const audioEl = document.createElement('audio');
      audioEl.preload = 'metadata';
      audioEl.src = url;

      audioEl.onloadedmetadata = () => {
        const dur =
          Number.isFinite(audioEl.duration) && audioEl.duration > 0
            ? Number(audioEl.duration.toFixed(2))
            : 12;

        setEditorState((prev) => {
          const nextSlides = prev.autoMatchAudioLength
            ? syncSlidesToAudioDuration(prev.slides, dur)
            : prev.slides;
          const totalDur = nextSlides.reduce((acc, s) => acc + s.duration, 0);
          return {
            ...prev,
            mode: 'slideshow',
            slideshowAudioFile: file,
            slideshowAudioUrl: url,
            slideshowAudioName: file.name,
            slideshowAudioDuration: dur,
            slides: nextSlides,
            trim: { ...prev.trim, start: 0, end: totalDur },
          };
        });
      };
    },
    [setEditorState]
  );

  // Handle uploading replacement audio in Video mode
  const handleUploadReplaceAudio = useCallback(
    (file: File) => {
      const check = validateMediaFile(file);
      if (!check.valid) {
        setValidationNotice({
          type: 'error',
          message: check.error || 'Unsupported audio file',
        });
        return;
      }
      const url = URL.createObjectURL(file);
      setEditorState((prev) => ({
        ...prev,
        audio: {
          ...prev.audio,
          muted: false,
          replaceFile: file,
          replaceUrl: url,
          replaceName: file.name,
        },
      }));
    },
    [setEditorState]
  );

  // Multi-file drop handler from Landing Screen
  const handleLandingFilesSelected = useCallback(
    (files: File[]) => {
      const videos = files.filter(
        (f) => validateMediaFile(f).category === 'video'
      );
      const images = files.filter(
        (f) => validateMediaFile(f).category === 'image'
      );
      const audios = files.filter(
        (f) => validateMediaFile(f).category === 'audio'
      );

      if (videos.length > 0) {
        handleUploadVideoFile(videos[0]);
        if (audios.length > 0) {
          handleUploadReplaceAudio(audios[0]);
        }
        return;
      }

      if (images.length > 0) {
        setEditorState((prev) => ({ ...prev, slides: [] }), false);
        handleAddSlideshowImages(images);
        if (audios.length > 0) {
          handleUploadSlideshowAudio(audios[0]);
        }
        setActiveTab('media');
        setView('editor');
        return;
      }

      if (audios.length > 0) {
        handleUploadSlideshowAudio(audios[0]);
        setActiveTab('media');
        setView('editor');
      }
    },
    [
      handleAddSlideshowImages,
      handleUploadReplaceAudio,
      handleUploadSlideshowAudio,
      handleUploadVideoFile,
      setEditorState,
    ]
  );

  const handleStartExport = useCallback(async () => {
    setExportResult(null);
    const res = await runExport(state, exportSettings);
    if (res) {
      setExportResult(res);
    }
  }, [exportSettings, runExport, state]);

  return (
    <div className="flex min-h-screen flex-col bg-[#090A0F] text-slate-100">
      {/* Strict 3-Zone Top Navigation Bar Contract */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-8 border-b border-slate-800/90 bg-[#090A0F]/95 px-4 md:px-6 backdrop-blur-md">
        {/* Zone 1: Single Text Element Brand Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setView('landing');
          }}
          className="font-display text-lg font-extrabold tracking-tight bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent whitespace-nowrap shrink-0"
        >
          ClipForge
        </a>

        {/* Zone 2: 4–5 Concise Single-Line Navigation Links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400"
        >
          <a
            href="#landing"
            onClick={(e) => {
              e.preventDefault();
              setView('landing');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              view === 'landing' ? 'text-white underline underline-offset-8 decoration-purple-500' : ''
            }`}
          >
            Start
          </a>
          <a
            href="#editor"
            onClick={(e) => {
              e.preventDefault();
              setView('editor');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              view === 'editor' && state.mode === 'video'
                ? 'text-white underline underline-offset-8 decoration-purple-500'
                : ''
            }`}
          >
            Video Editor
          </a>
          <a
            href="#slideshow"
            onClick={(e) => {
              e.preventDefault();
              setEditorState((prev) => ({ ...prev, mode: 'slideshow' }));
              setActiveTab('media');
              setView('editor');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              view === 'editor' && state.mode === 'slideshow'
                ? 'text-white underline underline-offset-8 decoration-pink-500'
                : ''
            }`}
          >
            Slideshow Studio
          </a>
          <a
            href="#pricing"
            onClick={(e) => {
              e.preventDefault();
              setView('pricing');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              view === 'pricing' ? 'text-white underline underline-offset-8 decoration-purple-500' : ''
            }`}
          >
            Pricing
          </a>
          <a
            href="#settings"
            onClick={(e) => {
              e.preventDefault();
              setView('settings');
            }}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              view === 'settings' ? 'text-white underline underline-offset-8 decoration-purple-500' : ''
            }`}
          >
            Settings
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action Button */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() => {
              if (view !== 'editor') setView('editor');
              clearError();
              setIsExportModalOpen(true);
            }}
            className="inline-flex min-h-[38px] items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-purple-950/50 transition-colors hover:from-purple-500 hover:to-pink-500 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Export Video
          </button>
        </div>
      </header>

      {/* View Router */}
      {view === 'landing' && (
        <LandingScreen
          onFilesSelected={handleLandingFilesSelected}
          onStartDemoProject={(mode) => {
            setEditorState((prev) => ({
              ...prev,
              mode,
            }));
            setActiveTab(mode === 'slideshow' ? 'media' : 'trim');
            setView('editor');
          }}
          validationNotice={validationNotice}
          onDismissNotice={() => setValidationNotice(null)}
        />
      )}

      {view === 'pricing' && (
        <PricingView onReturnToEditor={() => setView('editor')} />
      )}

      {view === 'settings' && (
        <SettingsView
          exportSettings={exportSettings}
          isWasmLoaded={isWasmLoaded}
          isLoadingEngine={isLoadingEngine}
          engineError={ffmpegError}
          onUpdateExportSettings={setExportSettings}
          onPreloadEngine={() => {
            loadEngine().catch(() => {});
          }}
          onReturnToEditor={() => setView('editor')}
        />
      )}

      {view === 'editor' && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Workspace Secondary Action Toolbar (Undo / Redo / Mode / Quick Open) */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 bg-[#0D0F17] px-3 py-1.5 md:px-5 text-xs">
            <div className="flex items-center gap-2">
              <input
                ref={quickUploadInputRef}
                type="file"
                multiple
                accept="video/*,image/*,audio/*,.mp4,.webm,.mov,.mp3,.wav,.jpg,.jpeg,.png"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleLandingFilesSelected(Array.from(e.target.files));
                  }
                }}
                className="sr-only"
              />
              <button
                type="button"
                onClick={() => quickUploadInputRef.current?.click()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-2.5 font-medium text-slate-200 hover:border-purple-500/40 hover:text-white whitespace-nowrap shrink-0"
              >
                <FolderOpen className="h-3.5 w-3.5 text-purple-400" />
                <span>Import Media</span>
              </button>

              <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
                <button
                  type="button"
                  onClick={undo}
                  disabled={!canUndo}
                  aria-label="Undo edit"
                  className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-30 whitespace-nowrap shrink-0"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Undo</span>
                </button>
                <button
                  type="button"
                  onClick={redo}
                  disabled={!canRedo}
                  aria-label="Redo edit"
                  className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-30 whitespace-nowrap shrink-0"
                >
                  <Redo2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Redo</span>
                </button>
              </div>
            </div>

            {validationNotice && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-950/30 px-2.5 py-1 text-[11px] text-amber-200 truncate"
              >
                <span className="truncate">{validationNotice.message}</span>
                <button
                  type="button"
                  onClick={() => setValidationNotice(null)}
                  aria-label="Dismiss warning"
                  className="text-amber-300 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Mobile view navigation links for Pricing/Settings */}
            <div className="flex md:hidden items-center gap-2 text-slate-400">
              <button
                type="button"
                onClick={() => setView('pricing')}
                className="hover:text-white whitespace-nowrap"
              >
                Plans
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => setView('settings')}
                className="hover:text-white whitespace-nowrap"
              >
                Settings
              </button>
            </div>
          </div>

          {/* CapCut-Style Main Studio Workspace */}
          <div className="flex flex-1 overflow-hidden">
            {/* Desktop Left Tool Rail + Tool Settings Drawer */}
            <aside
              aria-label="Editing tools panel"
              className="hidden md:flex shrink-0 border-r border-slate-800/90 bg-[#0D0F17]"
            >
              {/* Icon Rail */}
              <div className="flex w-18 flex-col items-center gap-1.5 border-r border-slate-800/80 py-3 px-1.5">
                {TOOL_TABS.map((t) => {
                  const active = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTab(t.id)}
                      className={`flex w-full min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl p-1.5 text-[11px] font-medium transition-colors ${
                        active
                          ? 'bg-gradient-to-b from-purple-600/25 to-pink-600/25 text-white border border-purple-500/40'
                          : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                      }`}
                    >
                      <span className={active ? 'text-purple-400' : ''}>
                        {t.icon}
                      </span>
                      <span className="whitespace-nowrap">{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Active Tool Settings Sub-Panel */}
              <div className="w-80 overflow-y-auto">
                <ToolPanel
                  activeTab={activeTab}
                  state={state}
                  totalDuration={totalDuration}
                  onUpdateState={(updater) => setEditorState(updater, true)}
                  onUploadVideo={handleUploadVideoFile}
                  onAddSlideshowImages={handleAddSlideshowImages}
                  onUploadSlideshowAudio={handleUploadSlideshowAudio}
                  onUploadReplaceAudio={handleUploadReplaceAudio}
                  onSplitAtPlayhead={handleSplitAtPlayhead}
                  onQuickExtractMp3={() => {
                    setExportSettings((prev) => ({ ...prev, format: 'mp3' }));
                    setIsExportModalOpen(true);
                  }}
                />
              </div>
            </aside>

            {/* Center Column: Preview Player + Bottom Timeline */}
            <main className="flex flex-1 flex-col overflow-hidden pb-16 md:pb-0">
              <PreviewPlayer
                state={state}
                activeTab={activeTab}
                isPlaying={isPlaying}
                currentTime={currentTime}
                effectiveDuration={totalDuration}
                onTogglePlay={() => setIsPlaying((p) => !p)}
                onSeek={(t) => {
                  setIsPlaying(false);
                  setCurrentTime(t);
                }}
                onSplitAtPlayhead={handleSplitAtPlayhead}
                onUpdateCrop={(crop) =>
                  setEditorState((prev) => ({ ...prev, crop }), true)
                }
                onToggleMute={() =>
                  setEditorState(
                    (prev) => ({
                      ...prev,
                      audio: { ...prev.audio, muted: !prev.audio.muted },
                    }),
                    true
                  )
                }
              />

              <Timeline
                state={state}
                currentTime={currentTime}
                totalDuration={totalDuration}
                onSeek={(t) => {
                  setIsPlaying(false);
                  setCurrentTime(t);
                }}
                onUpdateTrim={(start, end) =>
                  setEditorState(
                    (prev) => ({
                      ...prev,
                      trim: { ...prev.trim, start, end },
                    }),
                    true
                  )
                }
                onReorderSlide={(fromIdx, toIdx) =>
                  setEditorState((prev) => {
                    const arr = [...prev.slides];
                    const [moved] = arr.splice(fromIdx, 1);
                    arr.splice(toIdx, 0, moved);
                    return { ...prev, slides: arr };
                  }, true)
                }
                onSelectTab={(tab) => {
                  setActiveTab(tab);
                  if (window.innerWidth < 768) {
                    setIsMobileSheetOpen(true);
                  }
                }}
                onSplitAtPlayhead={handleSplitAtPlayhead}
              />
            </main>

            {/* Desktop Right Properties Inspector */}
            <PropertiesPanel
              state={state}
              exportSettings={exportSettings}
              isWasmLoaded={isWasmLoaded}
              onUpdateProjectName={(projectName) =>
                setEditorState((prev) => ({ ...prev, projectName }), false)
              }
              onResetAllEdits={() =>
                resetEditorHistory({
                  ...INITIAL_EDITOR_STATE,
                  slides: state.slides,
                  slideshowAudioFile: state.slideshowAudioFile,
                  slideshowAudioUrl: state.slideshowAudioUrl,
                })
              }
              onOpenExport={() => {
                clearError();
                setIsExportModalOpen(true);
              }}
            />
          </div>

          {/* Mobile Fixed Bottom Tool Bar (Thumb-Zone Ergonomics) */}
          <nav
            aria-label="Mobile editing tools"
            className="fixed bottom-0 left-0 right-0 z-30 flex md:hidden h-14 items-center justify-around border-t border-slate-800 bg-[#090A0F]/95 px-1 backdrop-blur-md"
          >
            {TOOL_TABS.map((t) => {
              const active = activeTab === t.id && isMobileSheetOpen;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(t.id);
                    setIsMobileSheetOpen(true);
                  }}
                  className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center rounded-lg px-1.5 text-[10px] font-medium ${
                    active ? 'text-purple-400' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.icon}
                  <span className="mt-0.5 whitespace-nowrap">{t.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Mobile Bottom Sheet for Tool Settings */}
          <AnimatePresence>
            {isMobileSheetOpen && (
              <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden bg-black/60 backdrop-blur-xs">
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="max-h-[75vh] w-full overflow-y-auto rounded-t-3xl border-t border-slate-800 bg-[#0F111A] pb-8 shadow-2xl"
                >
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800/80 bg-[#0F111A]/95 px-4 py-3 backdrop-blur-md">
                    <div className="h-1.5 w-10 rounded-full bg-slate-700" />
                    <button
                      type="button"
                      onClick={() => setIsMobileSheetOpen(false)}
                      aria-label="Close tool sheet"
                      className="rounded-lg p-1 text-slate-400 hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <ToolPanel
                    activeTab={activeTab}
                    state={state}
                    totalDuration={totalDuration}
                    onUpdateState={(updater) => setEditorState(updater, true)}
                    onUploadVideo={handleUploadVideoFile}
                    onAddSlideshowImages={handleAddSlideshowImages}
                    onUploadSlideshowAudio={handleUploadSlideshowAudio}
                    onUploadReplaceAudio={handleUploadReplaceAudio}
                    onSplitAtPlayhead={handleSplitAtPlayhead}
                    onQuickExtractMp3={() => {
                      setIsMobileSheetOpen(false);
                      setExportSettings((prev) => ({ ...prev, format: 'mp3' }));
                      setIsExportModalOpen(true);
                    }}
                  />
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Export Dialog Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        state={state}
        settings={exportSettings}
        isProcessing={isProcessing}
        progress={progress}
        statusMessage={statusMessage}
        error={ffmpegError}
        result={exportResult}
        onClose={() => setIsExportModalOpen(false)}
        onUpdateSettings={(next) => {
          setExportResult(null);
          setExportSettings(next);
        }}
        onStartExport={handleStartExport}
        onCancelExport={cancelProcessing}
      />
    </div>
  );
}
