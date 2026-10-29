import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAudioFilterChain,
  buildCropFilter,
  buildExtractAudioCommand,
  buildFullVideoExportCommand,
  buildImageAudioSlideshowCommand,
  buildRemoveSoundArgs,
  buildSlideshowConcatFileContent,
  buildTransformFilters,
  buildTrimFilterArgs,
  buildVisualEffectsFilters,
  calculatePresetCropRect,
  FFMPEG_CORE_VERSION,
  formatTimecode,
  getFFmpegCdnUrls,
  LARGE_FILE_WARNING_BYTES,
  MAX_BROWSER_FILE_BYTES,
  syncSlidesToAudioDuration,
  validateMediaFile,
} from './ffmpegCommands';
import { EditorState } from '../types/editor';

test('getFFmpegCdnUrls returns pinned jsDelivr single-thread @ffmpeg/core URLs', () => {
  const urls = getFFmpegCdnUrls();
  assert.equal(FFMPEG_CORE_VERSION, '0.12.10');
  assert.equal(
    urls.coreURL,
    'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.js'
  );
  assert.equal(
    urls.wasmURL,
    'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/ffmpeg-core.wasm'
  );
});

test('validateMediaFile validates supported types and warns on >500MB files', () => {
  const normalVideo = validateMediaFile({
    name: 'clip.mp4',
    size: 25 * 1024 * 1024,
    type: 'video/mp4',
  });
  assert.equal(normalVideo.valid, true);
  assert.equal(normalVideo.category, 'video');
  assert.equal(normalVideo.warning, undefined);

  const largeVideo = validateMediaFile({
    name: '4k_raw.mov',
    size: LARGE_FILE_WARNING_BYTES + 10 * 1024 * 1024,
    type: 'video/quicktime',
  });
  assert.equal(largeVideo.valid, true);
  assert.ok(largeVideo.warning?.includes('500 MB'));

  const hugeVideo = validateMediaFile({
    name: 'huge.mp4',
    size: MAX_BROWSER_FILE_BYTES + 1024,
    type: 'video/mp4',
  });
  assert.equal(hugeVideo.valid, false);
  assert.ok(hugeVideo.error?.includes('WebAssembly memory limit'));

  const unsupported = validateMediaFile({
    name: 'archive.zip',
    size: 1024,
    type: 'application/zip',
  });
  assert.equal(unsupported.valid, false);
  assert.ok(unsupported.error?.includes('Unsupported file format'));
});

test('formatTimecode produces tabular MM:SS.d strings', () => {
  assert.equal(formatTimecode(0), '00:00.0');
  assert.equal(formatTimecode(65.42), '01:05.4');
  assert.equal(formatTimecode(125.9, false), '02:05');
});

test('syncSlidesToAudioDuration divides audio length evenly across slides', () => {
  const slides = [
    { id: '1', name: 'a.jpg', url: 'blob:1', duration: 3, width: 1920, height: 1080 },
    { id: '2', name: 'b.jpg', url: 'blob:2', duration: 3, width: 1920, height: 1080 },
    { id: '3', name: 'c.jpg', url: 'blob:3', duration: 3, width: 1920, height: 1080 },
  ];
  const synced = syncSlidesToAudioDuration(slides, 12);
  assert.equal(synced[0].duration, 4);
  assert.equal(synced[1].duration, 4);
  assert.equal(synced[2].duration, 4);
});

test('buildSlideshowConcatFileContent & buildImageAudioSlideshowCommand generate valid MP4 args', () => {
  const concatTxt = buildSlideshowConcatFileContent([
    { filename: 'slide_0.png', duration: 2.5 },
    { filename: 'slide_1.png', duration: 3.5 },
  ]);
  assert.ok(concatTxt.includes("file 'slide_0.png'"));
  assert.ok(concatTxt.includes('duration 2.50'));
  assert.ok(concatTxt.endsWith("file 'slide_1.png'"));

  const cmd = buildImageAudioSlideshowCommand({
    concatListFilename: 'slides.txt',
    audioFilename: 'music.mp3',
    outputFilename: 'slideshow.mp4',
    resolution: '1080p',
    quality: 'high',
    targetDuration: 6,
  });
  assert.ok(cmd.includes('-f'));
  assert.ok(cmd.includes('concat'));
  assert.ok(cmd.includes('libx264'));
  assert.ok(cmd.includes('aac'));
  assert.ok(cmd.includes('-shortest'));
});

test('buildTrimFilterArgs and buildCropFilter compute accurate trim and even pixel crops', () => {
  const trimArgs = buildTrimFilterArgs({ start: 2.5, end: 8.0, segments: [] }, 12.0);
  assert.deepEqual(trimArgs, ['-ss', '2.50', '-t', '5.50']);

  const rect916 = calculatePresetCropRect('9:16', 1920, 1080);
  assert.ok(rect916.width < 40);
  assert.equal(rect916.height, 100);

  const cropStr = buildCropFilter(rect916, 1920, 1080);
  assert.ok(cropStr?.startsWith('crop=606:1080:') || cropStr?.startsWith('crop=608:1080:'));
});

test('buildRemoveSoundArgs and buildAudioFilterChain support mute, replace, and mix', () => {
  assert.deepEqual(buildRemoveSoundArgs(), ['-an']);

  const mixPlan = buildAudioFilterChain({
    audio: {
      muted: false,
      originalVolume: 80,
      replaceUrl: 'blob:music',
      replaceVolume: 120,
      mixWithOriginal: true,
    },
    effects: {
      fadeIn: true,
      fadeInDuration: 1.5,
      fadeOut: true,
      fadeOutDuration: 2.0,
      glitch: false,
      glitchIntensity: 5,
      glitchDuration: 3,
      blackAndWhite: false,
      blur: 0,
      brightness: 0,
      contrast: 100,
      zoomIn: false,
      zoomAmount: 1.2,
      vignette: false,
    },
    speed: 1.25,
    effectiveDuration: 10,
  });

  assert.equal(mixPlan.mixOriginalAndReplacement, true);
  assert.ok(mixPlan.complexFilter?.includes('amix=inputs=2'));
  assert.ok(mixPlan.complexFilter?.includes('afade=t=in:st=0:d=1.50'));
  assert.ok(mixPlan.complexFilter?.includes('afade=t=out:st=8.00:d=2.00'));
});

test('buildVisualEffectsFilters and buildTransformFilters generate fade, glitch, and speed filters', () => {
  const vf = buildVisualEffectsFilters(
    {
      fadeIn: true,
      fadeInDuration: 1,
      fadeOut: true,
      fadeOutDuration: 1.5,
      glitch: true,
      glitchIntensity: 6,
      glitchDuration: 4,
      blackAndWhite: true,
      blur: 4,
      brightness: 10,
      contrast: 120,
      zoomIn: true,
      zoomAmount: 1.2,
      vignette: true,
    },
    8
  );

  const joined = vf.join(',');
  assert.ok(joined.includes('eq=brightness=0.1:contrast=1.2'));
  assert.ok(joined.includes('hue=s=0'));
  assert.ok(joined.includes('boxblur=4:1'));
  assert.ok(joined.includes('rgbashift='));
  assert.ok(joined.includes('noise=alls='));
  assert.ok(joined.includes('fade=t=in:st=0:d=1.00'));
  assert.ok(joined.includes('fade=t=out:st=6.50:d=1.50'));

  const tf = buildTransformFilters({
    speed: 2.0,
    rotation: 90,
    flipH: true,
    flipV: false,
  });
  assert.deepEqual(tf, ['setpts=0.5000*PTS', 'transpose=1', 'hflip']);
});

test('buildExtractAudioCommand and buildFullVideoExportCommand produce valid FFmpeg pipelines', () => {
  const mp3Cmd = buildExtractAudioCommand('input.mp4', 'audio.mp3');
  assert.ok(mp3Cmd.includes('-vn'));
  assert.ok(mp3Cmd.includes('libmp3lame'));

  const mockState: EditorState = {
    projectName: 'Demo Edit',
    mode: 'video',
    videoDuration: 10,
    videoWidth: 1280,
    videoHeight: 720,
    videoSizeBytes: 1024000,
    slides: [],
    slideshowAudioDuration: 0,
    autoMatchAudioLength: true,
    trim: { start: 1, end: 9, segments: [] },
    crop: { preset: '16:9', x: 0, y: 0, width: 100, height: 100 },
    audio: {
      muted: true,
      originalVolume: 100,
      replaceVolume: 100,
      mixWithOriginal: false,
    },
    effects: {
      fadeIn: true,
      fadeInDuration: 1,
      fadeOut: false,
      fadeOutDuration: 1,
      glitch: false,
      glitchIntensity: 4,
      glitchDuration: 2,
      blackAndWhite: false,
      blur: 0,
      brightness: 0,
      contrast: 100,
      zoomIn: false,
      zoomAmount: 1.2,
      vignette: false,
    },
    transform: { speed: 1, rotation: 0, flipH: false, flipV: false },
    textOverlays: [],
  };

  const fullCmd = buildFullVideoExportCommand(mockState, {
    resolution: '720p',
    quality: 'standard',
    format: 'mp4',
    fps: 30,
  });
  assert.ok(fullCmd.includes('-an'));
  assert.ok(fullCmd.includes('libx264'));
});
