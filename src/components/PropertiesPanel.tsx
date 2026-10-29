import React from 'react';
import {
  CheckCircle2,
  Cpu,
  Download,
  RotateCcw,
  Terminal,
} from 'lucide-react';
import { EditorState, ExportSettings } from '../types/editor';
import {
  buildFullVideoExportCommand,
  buildImageAudioSlideshowCommand,
  formatTimecode,
} from '../utils/ffmpegCommands';

interface PropertiesPanelProps {
  state: EditorState;
  exportSettings: ExportSettings;
  isWasmLoaded: boolean;
  onUpdateProjectName: (name: string) => void;
  onResetAllEdits: () => void;
  onOpenExport: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  state,
  exportSettings,
  isWasmLoaded,
  onUpdateProjectName,
  onResetAllEdits,
  onOpenExport,
}) => {
  const previewCommandArgs =
    state.mode === 'slideshow'
      ? buildImageAudioSlideshowCommand({
          concatListFilename: 'slides.txt',
          audioFilename: state.audio.muted ? null : 'audio.wav',
          outputFilename: 'output.mp4',
          resolution: exportSettings.resolution,
          quality: exportSettings.quality,
        })
      : buildFullVideoExportCommand(
          state,
          exportSettings,
          state.videoName || 'input.mp4',
          state.audio.replaceName || 'replace.mp3',
          'output.mp4',
          true
        );

  const trimLength = Math.max(
    0.5,
    (state.trim.end || state.videoDuration) - state.trim.start
  );
  const outputDuration = trimLength / Math.max(0.5, state.transform.speed);

  return (
    <aside
      aria-label="Project properties and inspector"
      className="hidden lg:flex w-72 shrink-0 flex-col justify-between border-l border-slate-800/90 bg-[#0D0F17] p-4 text-xs overflow-y-auto"
    >
      <div className="space-y-5">
        {/* Project Title */}
        <div className="space-y-1.5">
          <label
            htmlFor="project-name-input"
            className="text-[11px] font-semibold text-slate-400"
          >
            Project Name
          </label>
          <input
            id="project-name-input"
            type="text"
            value={state.projectName}
            onChange={(e) => onUpdateProjectName(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-white focus:border-purple-500 focus:outline-none"
          />
        </div>

        {/* Output Summary Metrics */}
        <div className="space-y-2.5 rounded-xl border border-slate-800/90 bg-slate-900/50 p-3.5">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200">Sequence Summary</span>
            <span className="font-mono text-[11px] text-purple-400 tabular-nums">
              {state.mode === 'slideshow' ? 'Slideshow' : 'Video'}
            </span>
          </div>

          <div className="space-y-1.5 text-slate-400 border-t border-slate-800/80 pt-2">
            <div className="flex justify-between">
              <span>Output Duration</span>
              <span className="font-mono text-slate-200 tabular-nums">
                {formatTimecode(outputDuration)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Aspect / Crop</span>
              <span className="font-mono text-slate-200 tabular-nums">
                {state.crop.preset.toUpperCase()} ({Math.round(state.crop.width)}%×
                {Math.round(state.crop.height)}%)
              </span>
            </div>
            <div className="flex justify-between">
              <span>Playback Speed</span>
              <span className="font-mono text-slate-200 tabular-nums">
                {state.transform.speed}x
              </span>
            </div>
            <div className="flex justify-between">
              <span>Orientation</span>
              <span className="font-mono text-slate-200 tabular-nums">
                {state.transform.rotation}°
                {state.transform.flipH ? ' · FlipH' : ''}
                {state.transform.flipV ? ' · FlipV' : ''}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Audio Status</span>
              <span className="font-mono text-slate-200">
                {state.audio.muted
                  ? 'Muted (-an)'
                  : state.audio.replaceName
                    ? state.audio.mixWithOriginal
                      ? 'Mixed 2ch'
                      : 'Replaced'
                    : `${state.audio.originalVolume}% Vol`}
              </span>
            </div>
          </div>
        </div>

        {/* Active Filter Stack */}
        <div className="space-y-2 rounded-xl border border-slate-800/90 bg-slate-900/50 p-3.5">
          <span className="font-semibold text-slate-200 block">
            Active Filter Chain
          </span>
          <ul className="space-y-1 text-slate-400">
            {state.effects.fadeIn && (
              <li className="flex justify-between">
                <span>Fade In</span>
                <span className="font-mono text-purple-300 tabular-nums">
                  {state.effects.fadeInDuration}s
                </span>
              </li>
            )}
            {state.effects.fadeOut && (
              <li className="flex justify-between">
                <span>Fade Out</span>
                <span className="font-mono text-pink-300 tabular-nums">
                  {state.effects.fadeOutDuration}s
                </span>
              </li>
            )}
            {state.effects.glitch && (
              <li className="flex justify-between">
                <span>RGB Glitch + Shake</span>
                <span className="font-mono text-pink-300 tabular-nums">
                  Lv.{state.effects.glitchIntensity} ({state.effects.glitchDuration}s)
                </span>
              </li>
            )}
            {state.effects.blackAndWhite && (
              <li className="flex justify-between">
                <span>Monochrome</span>
                <span className="font-mono text-slate-300">hue=s=0</span>
              </li>
            )}
            {state.effects.blur > 0 && (
              <li className="flex justify-between">
                <span>Box Blur</span>
                <span className="font-mono text-slate-300 tabular-nums">
                  {state.effects.blur}px
                </span>
              </li>
            )}
            {state.effects.zoomIn && (
              <li className="flex justify-between">
                <span>Center Zoom</span>
                <span className="font-mono text-slate-300 tabular-nums">
                  {state.effects.zoomAmount}x
                </span>
              </li>
            )}
            {state.effects.vignette && (
              <li className="flex justify-between">
                <span>Optical Vignette</span>
                <span className="font-mono text-slate-300">PI/4</span>
              </li>
            )}
            {!state.effects.fadeIn &&
              !state.effects.fadeOut &&
              !state.effects.glitch &&
              !state.effects.blackAndWhite &&
              state.effects.blur === 0 &&
              !state.effects.zoomIn &&
              !state.effects.vignette && (
                <li className="text-slate-500">None applied</li>
              )}
          </ul>
        </div>

        {/* Live FFmpeg Command Builder Preview */}
        <div className="space-y-2 rounded-xl border border-slate-800/90 bg-slate-950 p-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Terminal className="h-3.5 w-3.5 text-purple-400" />
              FFmpeg Pipeline
            </span>
            <span className="font-mono text-[10px] text-slate-500">WASM CLI</span>
          </div>
          <pre className="max-h-28 overflow-x-auto overflow-y-auto rounded bg-slate-900/90 p-2 font-mono text-[10px] leading-relaxed text-purple-200">
            ffmpeg {previewCommandArgs.join(' ')}
          </pre>
        </div>
      </div>

      {/* Bottom Engine Status & Quick Actions */}
      <div className="space-y-2.5 pt-4 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5 text-purple-400" />
            WASM Core
          </span>
          <span className="flex items-center gap-1 font-mono text-slate-300">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            {isWasmLoaded ? 'Loaded in RAM' : 'Lazy On-Demand'}
          </span>
        </div>

        <button
          type="button"
          onClick={onResetAllEdits}
          className="flex w-full min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white whitespace-nowrap shrink-0"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset All Parameters
        </button>

        <button
          type="button"
          onClick={onOpenExport}
          className="flex w-full min-h-[42px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-purple-950/40 hover:from-purple-500 hover:to-pink-500 whitespace-nowrap shrink-0"
        >
          <Download className="h-4 w-4" />
          Export Media
        </button>
      </div>
    </aside>
  );
};
