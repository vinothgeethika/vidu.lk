import React, { useState } from 'react';
import { AlertCircle, Cpu, Keyboard, Loader2, Shield, Sliders } from 'lucide-react';
import { ExportResolution, ExportSettings } from '../types/editor';
import { FFMPEG_CORE_VERSION, JSDELIVR_CORE_BASE_URL } from '../utils/ffmpegCommands';

interface SettingsViewProps {
  exportSettings: ExportSettings;
  isWasmLoaded: boolean;
  isLoadingEngine: boolean;
  engineError?: string | null;
  onUpdateExportSettings: (settings: ExportSettings) => void;
  onPreloadEngine: () => void;
  onReturnToEditor: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  exportSettings,
  isWasmLoaded,
  isLoadingEngine,
  engineError,
  onUpdateExportSettings,
  onPreloadEngine,
  onReturnToEditor,
}) => {
  const [warnLargeFiles, setWarnLargeFiles] = useState(true);
  const [hardwareAccelHint, setHardwareAccelHint] = useState(true);

  return (
    <main className="flex-1 overflow-y-auto px-4 py-8 md:px-10 md:py-12">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-1">
            <p className="text-xs font-medium text-purple-400">
              Studio Configuration & Runtime
            </p>
            <h1 className="font-display text-3xl font-bold text-white">
              Workspace Settings
            </h1>
            <p className="text-sm text-slate-400">
              Manage your local FFmpeg WebAssembly engine, export defaults, and keyboard
              shortcuts.
            </p>
          </div>
          <button
            type="button"
            onClick={onReturnToEditor}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
          >
            Back to Studio
          </button>
        </div>

        {/* WebAssembly Engine Card */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-white font-display font-semibold">
                <Cpu className="h-4 w-4 text-purple-400" />
                <h2>FFmpeg.wasm Single-Thread Core (v{FFMPEG_CORE_VERSION})</h2>
              </div>
              <p className="text-xs text-slate-400">
                Loaded on demand via <code className="font-mono text-purple-300">toBlobURL</code> from{' '}
                <code className="font-mono text-slate-300">{JSDELIVR_CORE_BASE_URL}</code> so static builds stay under Cloudflare Pages&apos; 25 MB file limit.
              </p>
            </div>

            <button
              type="button"
              disabled={isWasmLoaded || isLoadingEngine}
              onClick={onPreloadEngine}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {isLoadingEngine ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading from jsDelivr CDN...
                </>
              ) : isWasmLoaded ? (
                'WASM Engine Active in Memory'
              ) : (
                'Preload FFmpeg Engine Now'
              )}
            </button>
          </div>

          {engineError && (
            <div
              role="alert"
              className="flex items-start justify-between gap-3 rounded-xl border border-red-500/40 bg-red-950/30 p-3.5 text-xs text-red-200"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <span>{engineError}</span>
              </div>
              <button
                type="button"
                onClick={onPreloadEngine}
                className="rounded-lg border border-red-400/40 bg-red-900/40 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-800/50 whitespace-nowrap shrink-0"
              >
                Retry CDN
              </button>
            </div>
          )}
        </section>

        {/* Export Defaults & Safeguards */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-5 text-xs">
          <div className="flex items-center gap-2 text-white font-display text-sm font-semibold">
            <Sliders className="h-4 w-4 text-pink-400" />
            <h2>Default Export & Memory Safeguards</h2>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-slate-800/80 pt-4">
            <div>
              <label htmlFor="default-res-select" className="font-medium text-slate-200 block">
                Default Export Resolution
              </label>
              <p className="text-slate-400 mt-0.5">
                720p HD offers the fastest balance between visual sharpness and mobile RAM usage.
              </p>
            </div>
            <select
              id="default-res-select"
              value={exportSettings.resolution}
              onChange={(e) =>
                onUpdateExportSettings({
                  ...exportSettings,
                  resolution: e.target.value as ExportResolution,
                })
              }
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-white"
            >
              <option value="480p">480p SD</option>
              <option value="720p">720p HD</option>
              <option value="1080p">1080p Full HD</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-slate-800/80 pt-4">
            <div>
              <label htmlFor="warn-500mb-toggle" className="font-medium text-slate-200 block">
                500 MB Mobile Memory Warning
              </label>
              <p className="text-slate-400 mt-0.5">
                Alert before loading files larger than 500 MB that may run slowly on mobile devices.
              </p>
            </div>
            <input
              id="warn-500mb-toggle"
              type="checkbox"
              checked={warnLargeFiles}
              onChange={(e) => setWarnLargeFiles(e.target.checked)}
              className="h-4 w-4 accent-purple-500 rounded"
            />
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-slate-800/80 pt-4">
            <div>
              <label htmlFor="canvas-accel-toggle" className="font-medium text-slate-200 block">
                Real-Time Canvas Filter Preview
              </label>
              <p className="text-slate-400 mt-0.5">
                Preview Fade In/Out, RGB Glitch, and Color Grading at 60fps in the viewport.
              </p>
            </div>
            <input
              id="canvas-accel-toggle"
              type="checkbox"
              checked={hardwareAccelHint}
              onChange={(e) => setHardwareAccelHint(e.target.checked)}
              className="h-4 w-4 accent-purple-500 rounded"
            />
          </div>
        </section>

        {/* Keyboard Shortcuts Reference */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4 text-xs">
          <div className="flex items-center gap-2 text-white font-display text-sm font-semibold">
            <Keyboard className="h-4 w-4 text-purple-400" />
            <h2>Desktop Keyboard Shortcuts</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { key: 'Space', action: 'Play / Pause Timeline Preview' },
              { key: 'S', action: 'Split Clip at Current Playhead' },
              { key: 'Ctrl + Z / ⌘ + Z', action: 'Undo Last Editing Action' },
              { key: 'Ctrl + Y / ⌘ + Shift + Z', action: 'Redo Editing Action' },
              { key: 'M', action: 'Toggle Mute Video Audio' },
              { key: 'E', action: 'Open Export Dialog' },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2.5"
              >
                <span className="text-slate-300">{item.action}</span>
                <kbd className="rounded bg-slate-800 px-2 py-1 font-mono text-[11px] font-semibold text-purple-300">
                  {item.key}
                </kbd>
              </div>
            ))}
          </div>
        </section>

        {/* Privacy Guarantee */}
        <section className="flex items-center gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/30 p-4 text-xs text-slate-400">
          <Shield className="h-5 w-5 text-emerald-400 shrink-0" />
          <span>
            Privacy Architecture: All video decoding, trimming, cropping, audio mixing, and MP4
            encoding execute inside a sandboxed WebAssembly virtual filesystem on your device.
          </span>
        </section>
      </div>
    </main>
  );
};
