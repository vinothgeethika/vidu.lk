import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Film,
  Loader2,
  Music,
  X,
} from 'lucide-react';
import {
  EditorState,
  ExportFormat,
  ExportQuality,
  ExportResolution,
  ExportSettings,
} from '../types/editor';
import { FFmpegExportResult } from '../hooks/useFFmpeg';

interface ExportModalProps {
  isOpen: boolean;
  state: EditorState;
  settings: ExportSettings;
  isProcessing: boolean;
  progress: number;
  statusMessage: string;
  error: string | null;
  result: FFmpegExportResult | null;
  onClose: () => void;
  onUpdateSettings: (next: ExportSettings) => void;
  onStartExport: () => void;
  onCancelExport: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  state,
  settings,
  isProcessing,
  progress,
  statusMessage,
  error,
  result,
  onClose,
  onUpdateSettings,
  onStartExport,
  onCancelExport,
}) => {
  if (!isOpen) return null;

  const resolutions: { id: ExportResolution; label: string; sub: string }[] = [
    { id: '480p', label: '480p SD', sub: 'Fastest · Mobile' },
    { id: '720p', label: '720p HD', sub: 'Balanced · Social' },
    { id: '1080p', label: '1080p Full HD', sub: 'Crisp · Studio' },
  ];

  const qualities: { id: ExportQuality; label: string; sub: string }[] = [
    { id: 'draft', label: 'Draft', sub: 'Smaller file' },
    { id: 'standard', label: 'Standard', sub: 'Recommended' },
    { id: 'high', label: 'High Bitrate', sub: 'Maximum clarity' },
  ];

  const formats: { id: ExportFormat; label: string; icon: React.ReactNode }[] = [
    {
      id: 'mp4',
      label: 'MP4 Video (H.264 + AAC)',
      icon: <Film className="h-4 w-4 text-purple-400" />,
    },
    {
      id: 'mp3',
      label: 'MP3 Audio Only (Extract Sound)',
      icon: <Music className="h-4 w-4 text-pink-400" />,
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#0F111A] p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div>
            <h2
              id="export-dialog-title"
              className="font-display text-lg font-bold text-white"
            >
              Export Project
            </h2>
            <p className="text-xs text-slate-400">
              Rendered locally in your browser via FFmpeg WebAssembly. Nothing is uploaded.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            aria-label="Close export modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Format Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">
            Output Container Format
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {formats.map((f) => (
              <button
                key={f.id}
                type="button"
                disabled={isProcessing}
                onClick={() => onUpdateSettings({ ...settings, format: f.id })}
                className={`flex items-center gap-2.5 rounded-xl border p-3 text-left text-xs font-medium transition-colors ${
                  settings.format === f.id
                    ? 'border-purple-500 bg-purple-950/30 text-white'
                    : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                }`}
              >
                {f.icon}
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Resolution & Quality (shown when format === mp4) */}
        {settings.format === 'mp4' && (
          <>
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Resolution
              </label>
              <div className="grid grid-cols-3 gap-2">
                {resolutions.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    disabled={isProcessing}
                    onClick={() =>
                      onUpdateSettings({ ...settings, resolution: r.id })
                    }
                    className={`flex flex-col items-center rounded-xl border p-3 text-center transition-colors ${
                      settings.resolution === r.id
                        ? 'border-purple-500 bg-purple-950/30 text-white'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-mono text-xs font-bold tabular-nums">
                      {r.label}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      {r.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Encoding Quality
              </label>
              <div className="grid grid-cols-3 gap-2">
                {qualities.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    disabled={isProcessing}
                    onClick={() =>
                      onUpdateSettings({ ...settings, quality: q.id })
                    }
                    className={`flex flex-col items-center rounded-xl border p-3 text-center transition-colors ${
                      settings.quality === q.id
                        ? 'border-pink-500 bg-pink-950/30 text-white'
                        : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold">{q.label}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      {q.sub}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Active Processing Progress Bar with Percentage & Cancel Button */}
        {isProcessing && (
          <div className="space-y-3 rounded-xl border border-purple-500/40 bg-purple-950/20 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-medium text-purple-200">
                <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                {statusMessage || 'Processing in browser...'}
              </span>
              <span className="font-mono font-bold text-white tabular-nums">
                {progress}%
              </span>
            </div>

            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-900">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={onCancelExport}
                className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-900/50"
              >
                Cancel Encoding
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-red-500/40 bg-red-950/30 p-3.5 text-xs text-red-200"
          >
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Completed Export Result & Download Link */}
        {result && !isProcessing && (
          <div className="space-y-3 rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 font-semibold text-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Ready to Download: {result.filename}
              </span>
              <span className="font-mono text-slate-300 tabular-nums">
                {(result.sizeBytes / 1024).toFixed(1)} KB
              </span>
            </div>

            <a
              href={result.blobUrl}
              download={result.filename}
              className="flex w-full min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-emerald-500"
            >
              <Download className="h-4 w-4" />
              Save {result.filename} to Device
            </a>
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-xl border border-slate-800 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-40 whitespace-nowrap shrink-0"
          >
            Close
          </button>

          {!isProcessing && (
            <button
              type="button"
              onClick={onStartExport}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-950/50 hover:from-purple-500 hover:to-pink-500 whitespace-nowrap shrink-0"
            >
              <Download className="h-4 w-4" />
              {result ? 'Render Again' : `Render ${settings.format.toUpperCase()}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
