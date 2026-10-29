import { useCallback, useRef, useState } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { EditorState, ExportSettings } from '../types/editor';
import {
  buildAudioFilterChain,
  buildFullVideoExportCommand,
  buildImageAudioSlideshowCommand,
  buildSlideshowConcatFileContent,
  buildVisualEffectsFilters,
  FFMPEG_CORE_VERSION,
  getFFmpegCdnUrls,
} from '../utils/ffmpegCommands';
import { createDemoSlideshowImages } from '../utils/demoMediaGenerator';

export interface FFmpegExportResult {
  blobUrl: string;
  filename: string;
  sizeBytes: number;
  commandUsed: string;
}

export function useFFmpeg() {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const cancelledRef = useRef(false);

  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoadingEngine, setIsLoadingEngine] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [lastLog, setLastLog] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const loadEngine = useCallback(async (): Promise<FFmpeg> => {
    if (ffmpegRef.current && ffmpegRef.current.loaded) {
      setIsLoaded(true);
      return ffmpegRef.current;
    }

    setIsLoadingEngine(true);
    setError(null);
    setStatusMessage(
      `Downloading FFmpeg WebAssembly core (v${FFMPEG_CORE_VERSION}) from jsDelivr CDN...`
    );

    try {
      const ffmpeg = new FFmpeg();

      ffmpeg.on('log', ({ message }) => {
        setLastLog(message);
      });

      ffmpeg.on('progress', ({ progress: rawProgress }) => {
        if (Number.isFinite(rawProgress)) {
          const pct = Math.min(99, Math.max(5, Math.round(rawProgress * 100)));
          setProgress(pct);
        }
      });

      const { coreURL, wasmURL } = getFFmpegCdnUrls();

      const [resolvedCoreBlobUrl, resolvedWasmBlobUrl] = await Promise.all([
        toBlobURL(coreURL, 'text/javascript'),
        toBlobURL(wasmURL, 'application/wasm'),
      ]);

      await ffmpeg.load({
        coreURL: resolvedCoreBlobUrl,
        wasmURL: resolvedWasmBlobUrl,
      });

      ffmpegRef.current = ffmpeg;
      setIsLoaded(true);
      setIsLoadingEngine(false);
      setStatusMessage(`FFmpeg.wasm v${FFMPEG_CORE_VERSION} ready (jsDelivr CDN)`);
      return ffmpeg;
    } catch (err) {
      setIsLoadingEngine(false);
      const details =
        err instanceof Error ? err.message : 'Network or WebAssembly error';
      const friendlyCdnError = `Unable to load the video processing engine from the jsDelivr CDN (cdn.jsdelivr.net, @ffmpeg/core@${FFMPEG_CORE_VERSION}). Please check your internet connection or disable any content blockers blocking cdn.jsdelivr.net and try again. (${details})`;
      setError(friendlyCdnError);
      throw new Error(friendlyCdnError);
    }
  }, []);

  const cancelProcessing = useCallback(() => {
    cancelledRef.current = true;
    if (ffmpegRef.current) {
      try {
        ffmpegRef.current.terminate();
      } catch {
        // Ignore terminate error
      }
      ffmpegRef.current = null;
      setIsLoaded(false);
    }
    setIsProcessing(false);
    setProgress(0);
    setStatusMessage('Export cancelled by user.');
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const runExport = useCallback(
    async (
      state: EditorState,
      settings: ExportSettings
    ): Promise<FFmpegExportResult | null> => {
      cancelledRef.current = false;
      setError(null);
      setIsProcessing(true);
      setProgress(5);
      setStatusMessage(
        `Loading FFmpeg.wasm v${FFMPEG_CORE_VERSION} from jsDelivr CDN...`
      );

      try {
        const ffmpeg = await loadEngine();
        if (cancelledRef.current) return null;

        setProgress(12);
        setStatusMessage('Writing source files into private browser memory...');

        const ext = settings.format === 'mp3' ? 'mp3' : 'mp4';
        const safeBaseName =
          state.projectName
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, '_')
            .replace(/^_+|_+$/g, '') || 'clipforge_export';
        const outputFilename = `${safeBaseName}_${settings.resolution}.${ext}`;

        let commandArgs: string[] = [];

        if (state.mode === 'slideshow' || (!state.videoFile && state.slides.length > 0)) {
          // Feature 1: Image + Audio -> Video Slideshow
          const slidesToUse =
            state.slides.length > 0
              ? state.slides
              : await createDemoSlideshowImages();

          const concatEntries: { filename: string; duration: number }[] = [];
          for (let i = 0; i < slidesToUse.length; i++) {
            const slide = slidesToUse[i];
            const slideFilename = `slide_${i}.png`;
            const fileData = slide.file
              ? await fetchFile(slide.file)
              : await fetchFile(slide.url);
            await ffmpeg.writeFile(slideFilename, fileData);
            concatEntries.push({
              filename: slideFilename,
              duration: slide.duration,
            });
          }

          const concatTxt = buildSlideshowConcatFileContent(concatEntries);
          await ffmpeg.writeFile(
            'concat_list.txt',
            new TextEncoder().encode(concatTxt)
          );

          let audioFilename: string | null = null;
          if (!state.audio.muted) {
            if (state.slideshowAudioFile) {
              audioFilename = 'slideshow_audio.wav';
              await ffmpeg.writeFile(
                audioFilename,
                await fetchFile(state.slideshowAudioFile)
              );
            } else if (state.audio.replaceFile) {
              audioFilename = 'slideshow_audio.wav';
              await ffmpeg.writeFile(
                audioFilename,
                await fetchFile(state.audio.replaceFile)
              );
            }
          }

          const totalDuration = concatEntries.reduce(
            (acc, item) => acc + item.duration,
            0
          );

          const vf = buildVisualEffectsFilters(state.effects, totalDuration);
          const audioPlan = buildAudioFilterChain({
            audio: state.audio,
            effects: state.effects,
            speed: state.transform.speed,
            effectiveDuration: totalDuration,
          });

          commandArgs = buildImageAudioSlideshowCommand({
            concatListFilename: 'concat_list.txt',
            audioFilename,
            outputFilename,
            resolution: settings.resolution,
            quality: settings.quality,
            videoFilters: vf,
            audioFilters: audioPlan.audioFilters,
            targetDuration:
              state.autoMatchAudioLength && state.slideshowAudioDuration > 0
                ? state.slideshowAudioDuration
                : totalDuration,
          });
        } else {
          // Video Editing Mode
          if (state.videoFile) {
            const inputName = 'input_video.mp4';
            await ffmpeg.writeFile(inputName, await fetchFile(state.videoFile));

            const replaceName = 'replace_audio.wav';
            if (state.audio.replaceFile) {
              await ffmpeg.writeFile(
                replaceName,
                await fetchFile(state.audio.replaceFile)
              );
            }

            commandArgs = buildFullVideoExportCommand(
              state,
              settings,
              inputName,
              replaceName,
              outputFilename,
              false
            );
          } else {
            // Demo video mode (synthesize from high-res procedural frames + audio)
            const demoSlides = await createDemoSlideshowImages();
            const concatEntries: { filename: string; duration: number }[] = [];
            const trimDur = Math.max(
              1,
              (state.trim.end || state.videoDuration) - state.trim.start
            );
            const perSlide = Number((trimDur / demoSlides.length).toFixed(2));

            for (let i = 0; i < demoSlides.length; i++) {
              const fname = `demo_frame_${i}.png`;
              await ffmpeg.writeFile(
                fname,
                await fetchFile(demoSlides[i].file || demoSlides[i].url)
              );
              concatEntries.push({ filename: fname, duration: perSlide });
            }

            const concatTxt = buildSlideshowConcatFileContent(concatEntries);
            await ffmpeg.writeFile(
              'concat_list.txt',
              new TextEncoder().encode(concatTxt)
            );

            let audioFilename: string | null = null;
            if (!state.audio.muted && state.slideshowAudioFile) {
              audioFilename = 'demo_audio.wav';
              await ffmpeg.writeFile(
                audioFilename,
                await fetchFile(state.slideshowAudioFile)
              );
            }

            if (settings.format === 'mp3' && audioFilename) {
              commandArgs = [
                '-i',
                audioFilename,
                '-vn',
                '-acodec',
                'libmp3lame',
                '-q:a',
                '2',
                '-y',
                outputFilename,
              ];
            } else {
              const vf = buildVisualEffectsFilters(state.effects, trimDur);
              commandArgs = buildImageAudioSlideshowCommand({
                concatListFilename: 'concat_list.txt',
                audioFilename,
                outputFilename,
                resolution: settings.resolution,
                quality: settings.quality,
                videoFilters: vf,
                targetDuration: trimDur,
              });
            }
          }
        }

        if (cancelledRef.current) return null;

        setProgress(25);
        setStatusMessage(
          `Encoding ${settings.format.toUpperCase()} (${settings.resolution}) in browser...`
        );

        const exitCode = await ffmpeg.exec(commandArgs);
        if (cancelledRef.current) return null;

        if (exitCode !== 0) {
          throw new Error(
            `FFmpeg exited with code ${exitCode}. Last log: ${lastLog || 'encoding error'}`
          );
        }

        setProgress(95);
        setStatusMessage('Finalizing media container...');

        const data = await ffmpeg.readFile(outputFilename);
        const uint8 =
          data instanceof Uint8Array
            ? data
            : new TextEncoder().encode(String(data));
        const mimeType =
          settings.format === 'mp3' ? 'audio/mpeg' : 'video/mp4';
        const blob = new Blob([uint8.buffer as ArrayBuffer], { type: mimeType });
        const blobUrl = URL.createObjectURL(blob);

        setProgress(100);
        setIsProcessing(false);
        setStatusMessage('Export complete!');

        return {
          blobUrl,
          filename: outputFilename,
          sizeBytes: blob.size,
          commandUsed: `ffmpeg ${commandArgs.join(' ')}`,
        };
      } catch (err) {
        if (cancelledRef.current) return null;
        setIsProcessing(false);
        const rawMsg = err instanceof Error ? err.message : String(err);
        if (rawMsg.includes('jsDelivr CDN')) {
          setError(rawMsg);
          return null;
        }
        const friendlyMsg = rawMsg.toLowerCase().includes('memory')
          ? 'Browser ran out of WebAssembly memory while processing this file. Try exporting at 480p/720p or trimming a shorter segment.'
          : `Export failed: ${rawMsg}`;
        setError(friendlyMsg);
        return null;
      }
    },
    [loadEngine, lastLog]
  );

  return {
    isLoaded,
    isLoadingEngine,
    isProcessing,
    progress,
    statusMessage,
    lastLog,
    error,
    loadEngine,
    runExport,
    cancelProcessing,
    clearError,
  };
}
