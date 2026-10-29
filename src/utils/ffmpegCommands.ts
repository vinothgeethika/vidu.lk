import {
  AudioConfig,
  CropPreset,
  CropRect,
  EditorState,
  EffectsConfig,
  ExportQuality,
  ExportResolution,
  ExportSettings,
  FileValidationResult,
  SlideImageItem,
  TextOverlayItem,
  TransformConfig,
  VideoTrim,
} from '../types/editor';

export const LARGE_FILE_WARNING_BYTES = 500 * 1024 * 1024; // 500 MB
export const MAX_BROWSER_FILE_BYTES = 1900 * 1024 * 1024; // ~1.9 GB WASM FS limit

/**
 * Pinned single-thread @ffmpeg/core version loaded at runtime from jsDelivr CDN.
 * Keeps static build output under Cloudflare Pages' 25 MB per-file limit.
 */
export const FFMPEG_CORE_VERSION = '0.12.10';
export const JSDELIVR_CORE_BASE_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;

export function getFFmpegCdnUrls(baseUrl = JSDELIVR_CORE_BASE_URL): {
  coreURL: string;
  wasmURL: string;
} {
  return {
    coreURL: `${baseUrl}/ffmpeg-core.js`,
    wasmURL: `${baseUrl}/ffmpeg-core.wasm`,
  };
}

const SUPPORTED_VIDEO_EXT = ['.mp4', '.webm', '.mov', '.mkv', '.avi', '.m4v'];
const SUPPORTED_IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
const SUPPORTED_AUDIO_EXT = ['.mp3', '.wav', '.aac', '.ogg', '.m4a', '.flac'];

/**
 * Validates an uploaded media file for browser compatibility and memory limits.
 */
export function validateMediaFile(file: {
  name: string;
  size: number;
  type: string;
}): FileValidationResult {
  const lowerName = file.name.toLowerCase();
  const isVideo =
    file.type.startsWith('video/') ||
    SUPPORTED_VIDEO_EXT.some((ext) => lowerName.endsWith(ext));
  const isImage =
    file.type.startsWith('image/') ||
    SUPPORTED_IMAGE_EXT.some((ext) => lowerName.endsWith(ext));
  const isAudio =
    file.type.startsWith('audio/') ||
    SUPPORTED_AUDIO_EXT.some((ext) => lowerName.endsWith(ext));

  if (!isVideo && !isImage && !isAudio) {
    return {
      valid: false,
      error: `Unsupported file format "${file.name}". Please upload MP4, WebM, MOV, JPG, PNG, WebP, MP3, WAV, or AAC.`,
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      error: `File "${file.name}" is empty (0 bytes).`,
    };
  }

  if (file.size > MAX_BROWSER_FILE_BYTES) {
    return {
      valid: false,
      error: `File "${file.name}" (${(file.size / (1024 * 1024 * 1024)).toFixed(2)} GB) exceeds the 1.9 GB browser WebAssembly memory limit. Try a shorter clip.`,
    };
  }

  const category: 'video' | 'image' | 'audio' = isVideo
    ? 'video'
    : isImage
      ? 'image'
      : 'audio';

  if (file.size > LARGE_FILE_WARNING_BYTES) {
    const sizeMb = Math.round(file.size / (1024 * 1024));
    return {
      valid: true,
      category,
      warning: `Large file detected (${sizeMb} MB). Files over 500 MB run entirely in browser memory and may process slowly on mobile devices.`,
    };
  }

  return {
    valid: true,
    category,
  };
}

/**
 * Formats seconds into tabular MM:SS or MM:SS.d string.
 */
export function formatTimecode(seconds: number, includeTenths = true): string {
  const safeSec = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const mins = Math.floor(safeSec / 60);
  const secs = Math.floor(safeSec % 60);
  const tenths = Math.floor((safeSec - Math.floor(safeSec)) * 10);

  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return includeTenths ? `${mm}:${ss}.${tenths}` : `${mm}:${ss}`;
}

/**
 * Maps resolution preset to target dimensions (even integers required by H.264).
 */
export function getResolutionDimensions(
  resolution: ExportResolution,
  aspectPreset: CropPreset = '16:9'
): { width: number; height: number } {
  const baseShortSide =
    resolution === '480p' ? 480 : resolution === '720p' ? 720 : 1080;

  switch (aspectPreset) {
    case '9:16': {
      const width = baseShortSide;
      const height = Math.round((baseShortSide * 16) / 9 / 2) * 2;
      return { width, height };
    }
    case '1:1': {
      return { width: baseShortSide, height: baseShortSide };
    }
    case '4:5': {
      const width = baseShortSide;
      const height = Math.round((baseShortSide * 5) / 4 / 2) * 2;
      return { width, height };
    }
    case '16:9':
    case 'free':
    default: {
      const height = baseShortSide;
      const width = Math.round((baseShortSide * 16) / 9 / 2) * 2;
      return { width, height };
    }
  }
}

/**
 * Calculates normalized crop box (0-100%) inside a source frame for a preset.
 */
export function calculatePresetCropRect(
  preset: CropPreset,
  sourceWidth: number,
  sourceHeight: number
): CropRect {
  if (preset === 'free' || sourceWidth <= 0 || sourceHeight <= 0) {
    return { preset, x: 0, y: 0, width: 100, height: 100 };
  }

  const ratioMap: Record<Exclude<CropPreset, 'free'>, number> = {
    '9:16': 9 / 16,
    '1:1': 1,
    '16:9': 16 / 9,
    '4:5': 4 / 5,
  };

  const targetRatio = ratioMap[preset];
  const sourceRatio = sourceWidth / sourceHeight;

  let widthPct = 100;
  let heightPct = 100;

  if (sourceRatio > targetRatio) {
    // Source is wider than target aspect ratio -> constrain width
    const targetPixelWidth = sourceHeight * targetRatio;
    widthPct = Math.min(100, Math.max(10, (targetPixelWidth / sourceWidth) * 100));
  } else {
    // Source is taller than target aspect ratio -> constrain height
    const targetPixelHeight = sourceWidth / targetRatio;
    heightPct = Math.min(100, Math.max(10, (targetPixelHeight / sourceHeight) * 100));
  }

  return {
    preset,
    x: Number(((100 - widthPct) / 2).toFixed(2)),
    y: Number(((100 - heightPct) / 2).toFixed(2)),
    width: Number(widthPct.toFixed(2)),
    height: Number(heightPct.toFixed(2)),
  };
}

/**
 * Synchronizes slide durations so total video duration matches audio duration.
 */
export function syncSlidesToAudioDuration(
  slides: SlideImageItem[],
  audioDuration: number
): SlideImageItem[] {
  if (slides.length === 0 || audioDuration <= 0) return slides;
  const perSlide = Number((audioDuration / slides.length).toFixed(2));
  const clampedPerSlide = Math.max(0.5, perSlide);
  return slides.map((slide) => ({
    ...slide,
    duration: clampedPerSlide,
  }));
}

/**
 * Feature 1: Image + Audio -> Video command builder.
 * Builds FFmpeg arguments to combine ordered images (via concat demuxer file) + audio into H.264/AAC MP4.
 */
export function buildImageAudioSlideshowCommand(params: {
  concatListFilename: string;
  audioFilename?: string | null;
  outputFilename: string;
  resolution: ExportResolution;
  quality: ExportQuality;
  videoFilters?: string[];
  audioFilters?: string[];
  targetDuration?: number;
}): string[] {
  const {
    concatListFilename,
    audioFilename,
    outputFilename,
    resolution,
    quality,
    videoFilters = [],
    audioFilters = [],
    targetDuration,
  } = params;

  const { width, height } = getResolutionDimensions(resolution, '16:9');
  const crf = quality === 'high' ? '20' : quality === 'standard' ? '24' : '28';

  const args: string[] = ['-f', 'concat', '-safe', '0', '-i', concatListFilename];

  if (audioFilename) {
    args.push('-i', audioFilename);
  }

  const baseScaleFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p`;
  const allVideoFilters = [baseScaleFilter, ...videoFilters].filter(Boolean);

  args.push('-vf', allVideoFilters.join(','));

  if (audioFilename && audioFilters.length > 0) {
    args.push('-af', audioFilters.join(','));
  }

  args.push(
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-crf',
    crf,
    '-pix_fmt',
    'yuv420p'
  );

  if (audioFilename) {
    args.push('-c:a', 'aac', '-b:a', '128k', '-shortest');
  } else {
    args.push('-an');
  }

  if (targetDuration && targetDuration > 0) {
    args.push('-t', targetDuration.toFixed(2));
  }

  args.push('-movflags', '+faststart', '-y', outputFilename);
  return args;
}

/**
 * Generates the content of the FFmpeg concat demuxer file for ordered images.
 */
export function buildSlideshowConcatFileContent(
  slides: { filename: string; duration: number }[]
): string {
  if (slides.length === 0) return '';
  const lines: string[] = [];
  for (const slide of slides) {
    const safeDur = Math.max(0.2, Number(slide.duration) || 3);
    lines.push(`file '${slide.filename}'`);
    lines.push(`duration ${safeDur.toFixed(2)}`);
  }
  // Repeat the last image entry per FFmpeg concat demuxer specification
  lines.push(`file '${slides[slides.length - 1].filename}'`);
  return lines.join('\n');
}

/**
 * Feature 2: Video Trim / Cut argument builder.
 */
export function buildTrimFilterArgs(
  trim: VideoTrim,
  totalDuration: number
): string[] {
  const start = Math.max(0, trim.start);
  const end = totalDuration > 0 ? Math.min(totalDuration, trim.end) : trim.end;
  const duration = Math.max(0.1, end - start);

  const args: string[] = [];
  if (start > 0.01) {
    args.push('-ss', start.toFixed(2));
  }
  if (totalDuration <= 0 || end < totalDuration - 0.01) {
    args.push('-t', duration.toFixed(2));
  }
  return args;
}

/**
 * Feature 3: Video Crop filter builder.
 * Converts normalized percentages (0-100) into even pixel dimensions `crop=w:h:x:y`.
 */
export function buildCropFilter(
  crop: CropRect,
  sourceWidth: number,
  sourceHeight: number
): string | null {
  if (
    crop.x <= 0.5 &&
    crop.y <= 0.5 &&
    crop.width >= 99.5 &&
    crop.height >= 99.5
  ) {
    return null;
  }

  const safeW = Math.max(64, sourceWidth || 1280);
  const safeH = Math.max(64, sourceHeight || 720);

  const cropW = Math.max(16, Math.floor(((crop.width / 100) * safeW) / 2) * 2);
  const cropH = Math.max(16, Math.floor(((crop.height / 100) * safeH) / 2) * 2);
  const cropX = Math.max(0, Math.min(safeW - cropW, Math.floor((crop.x / 100) * safeW)));
  const cropY = Math.max(0, Math.min(safeH - cropH, Math.floor((crop.y / 100) * safeH)));

  return `crop=${cropW}:${cropH}:${cropX}:${cropY}`;
}

/**
 * Feature 4: Remove Sound (One-click mute).
 */
export function buildRemoveSoundArgs(): string[] {
  return ['-an'];
}

/**
 * Feature 5: Audio replacement, volume control, audio mixing, and audio fade in/out.
 */
export function buildAudioFilterChain(params: {
  audio: AudioConfig;
  effects: EffectsConfig;
  speed: number;
  effectiveDuration: number;
}): {
  muted: boolean;
  useReplaceInput: boolean;
  mixOriginalAndReplacement: boolean;
  audioFilters: string[];
  complexFilter?: string;
} {
  const { audio, effects, speed, effectiveDuration } = params;

  if (audio.muted && !audio.replaceFile && !audio.replaceUrl) {
    return {
      muted: true,
      useReplaceInput: false,
      mixOriginalAndReplacement: false,
      audioFilters: [],
    };
  }

  const hasReplacement = Boolean(audio.replaceFile || audio.replaceUrl);
  const filters: string[] = [];

  // Speed atempo adjustment (valid range per filter is 0.5 to 2.0)
  if (Math.abs(speed - 1) > 0.01) {
    const clampedSpeed = Math.max(0.5, Math.min(2.0, speed));
    filters.push(`atempo=${clampedSpeed.toFixed(2)}`);
  }

  // Audio Fade In / Fade Out
  if (effects.fadeIn && effects.fadeInDuration > 0) {
    const d = Math.min(effectiveDuration, effects.fadeInDuration);
    filters.push(`afade=t=in:st=0:d=${d.toFixed(2)}`);
  }
  if (effects.fadeOut && effects.fadeOutDuration > 0 && effectiveDuration > 0) {
    const d = Math.min(effectiveDuration, effects.fadeOutDuration);
    const st = Math.max(0, effectiveDuration - d);
    filters.push(`afade=t=out:st=${st.toFixed(2)}:d=${d.toFixed(2)}`);
  }

  if (hasReplacement && audio.mixWithOriginal && !audio.muted) {
    const origVol = (audio.originalVolume / 100).toFixed(2);
    const repVol = (audio.replaceVolume / 100).toFixed(2);
    const postMix = filters.length > 0 ? `,${filters.join(',')}` : '';
    const complexFilter = `[0:a]volume=${origVol}[a0];[1:a]volume=${repVol}[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2${postMix}[aout]`;
    return {
      muted: false,
      useReplaceInput: true,
      mixOriginalAndReplacement: true,
      audioFilters: filters,
      complexFilter,
    };
  }

  const activeVol = hasReplacement ? audio.replaceVolume : audio.originalVolume;
  if (activeVol !== 100) {
    filters.unshift(`volume=${(activeVol / 100).toFixed(2)}`);
  }

  return {
    muted: false,
    useReplaceInput: hasReplacement,
    mixOriginalAndReplacement: false,
    audioFilters: filters,
  };
}

/**
 * Feature 6: Visual Effects filter builder (Fade In/Out, Glitch RGB split/noise, B&W, Blur, Brightness/Contrast, Zoom In, Vignette).
 */
export function buildVisualEffectsFilters(
  effects: EffectsConfig,
  effectiveDuration: number
): string[] {
  const vf: string[] = [];

  // Brightness & Contrast
  const normBrightness = Number((effects.brightness / 100).toFixed(2));
  const normContrast = Number((effects.contrast / 100).toFixed(2));
  if (Math.abs(normBrightness) > 0.01 || Math.abs(normContrast - 1) > 0.01) {
    vf.push(`eq=brightness=${normBrightness}:contrast=${normContrast}`);
  }

  // Black & White
  if (effects.blackAndWhite) {
    vf.push('hue=s=0');
  }

  // Blur
  if (effects.blur > 0) {
    const lumaRadius = Math.max(1, Math.min(20, Math.round(effects.blur)));
    vf.push(`boxblur=${lumaRadius}:1`);
  }

  // Zoom In (Punch-in center zoom)
  if (effects.zoomIn && effects.zoomAmount > 1.01) {
    const z = Math.min(1.5, Math.max(1.05, effects.zoomAmount)).toFixed(2);
    vf.push(`scale=iw*${z}:ih*${z},crop=iw/${z}:ih/${z}`);
  }

  // Vignette
  if (effects.vignette) {
    vf.push('vignette=PI/4');
  }

  // Glitch Effect (RGB Chromatic Split + Temporal Noise + Shake)
  if (effects.glitch) {
    const shift = Math.max(2, Math.min(24, Math.round(effects.glitchIntensity * 2)));
    const noiseStrength = Math.max(8, Math.min(40, Math.round(effects.glitchIntensity * 3.5)));
    const glitchDur = Math.max(0.5, effects.glitchDuration);
    vf.push(
      `rgbashift=rh=${shift}:bh=-${shift}:rv=${Math.round(shift / 2)}:bv=-${Math.round(shift / 2)}:enable='between(t,0,${glitchDur.toFixed(2)})'`,
      `noise=alls=${noiseStrength}:allf=t+u:enable='between(t,0,${glitchDur.toFixed(2)})'`
    );
  }

  // Video Fade In
  if (effects.fadeIn && effects.fadeInDuration > 0) {
    const d = Math.min(effectiveDuration || 5, effects.fadeInDuration);
    vf.push(`fade=t=in:st=0:d=${d.toFixed(2)}`);
  }

  // Video Fade Out
  if (effects.fadeOut && effects.fadeOutDuration > 0 && effectiveDuration > 0) {
    const d = Math.min(effectiveDuration, effects.fadeOutDuration);
    const st = Math.max(0, effectiveDuration - d);
    vf.push(`fade=t=out:st=${st.toFixed(2)}:d=${d.toFixed(2)}`);
  }

  return vf;
}

/**
 * Feature 7a: Speed, Rotate, and Flip video filter builder.
 */
export function buildTransformFilters(transform: TransformConfig): string[] {
  const vf: string[] = [];

  // Speed change via PTS scaling
  if (Math.abs(transform.speed - 1) > 0.01) {
    const ptsFactor = (1 / Math.max(0.5, Math.min(2.0, transform.speed))).toFixed(4);
    vf.push(`setpts=${ptsFactor}*PTS`);
  }

  // Rotation
  if (transform.rotation === 90) {
    vf.push('transpose=1');
  } else if (transform.rotation === 180) {
    vf.push('transpose=1,transpose=1');
  } else if (transform.rotation === 270) {
    vf.push('transpose=2');
  }

  // Horizontal & Vertical Flip
  if (transform.flipH) {
    vf.push('hflip');
  }
  if (transform.flipV) {
    vf.push('vflip');
  }

  return vf;
}

/**
 * Feature 7b: Text Overlay filter builder (using drawtext when font is available).
 */
export function buildTextOverlayFilters(overlays: TextOverlayItem[]): string[] {
  return overlays
    .filter((item) => item.text.trim().length > 0)
    .map((item) => {
      const escapedText = item.text
        .replace(/\\/g, '\\\\')
        .replace(/:/g, '\\:')
        .replace(/'/g, '');
      const xExpr = `(w*${(item.x / 100).toFixed(2)}-text_w/2)`;
      const yExpr = `(h*${(item.y / 100).toFixed(2)}-text_h/2)`;
      const color = item.color.startsWith('#') ? item.color : '#FFFFFF';
      return `drawtext=text='${escapedText}':fontsize=${item.fontSize}:fontcolor=${color}:x=${xExpr}:y=${yExpr}:enable='between(t,${item.startTime.toFixed(1)},${item.endTime.toFixed(1)})'`;
    });
}

/**
 * Feature 7c: Extract Audio from Video as MP3.
 */
export function buildExtractAudioCommand(
  inputFilename: string,
  outputFilename = 'extracted_audio.mp3',
  trim?: VideoTrim,
  totalDuration = 0
): string[] {
  const args: string[] = [];
  if (trim) {
    args.push(...buildTrimFilterArgs(trim, totalDuration));
  }
  args.push(
    '-i',
    inputFilename,
    '-vn',
    '-acodec',
    'libmp3lame',
    '-q:a',
    '2',
    '-y',
    outputFilename
  );
  return args;
}

/**
 * Master command builder combining Trim, Crop, Mute/Replace Audio, Effects, Transforms, and Export Settings.
 */
export function buildFullVideoExportCommand(
  state: EditorState,
  settings: ExportSettings,
  inputVideoName = 'input.mp4',
  replaceAudioName = 'replace_audio.mp3',
  outputName = 'output.mp4',
  includeDrawtext = false
): string[] {
  if (settings.format === 'mp3') {
    return buildExtractAudioCommand(
      inputVideoName,
      outputName.endsWith('.mp3') ? outputName : 'output.mp3',
      state.trim,
      state.videoDuration
    );
  }

  const rawTrimDuration = Math.max(
    0.5,
    (state.trim.end || state.videoDuration || 10) - state.trim.start
  );
  const effectiveDuration = rawTrimDuration / Math.max(0.5, state.transform.speed);

  const trimArgs = buildTrimFilterArgs(state.trim, state.videoDuration);
  const cropFilter = buildCropFilter(
    state.crop,
    state.videoWidth,
    state.videoHeight
  );
  const transformFilters = buildTransformFilters(state.transform);
  const effectFilters = buildVisualEffectsFilters(
    state.effects,
    effectiveDuration
  );
  const textFilters = includeDrawtext
    ? buildTextOverlayFilters(state.textOverlays)
    : [];

  const targetDims = getResolutionDimensions(
    settings.resolution,
    state.crop.preset
  );
  const scaleFilter = `scale=${targetDims.width}:${targetDims.height}:force_original_aspect_ratio=decrease,pad=${targetDims.width}:${targetDims.height}:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p`;

  const videoFilterChain = [
    cropFilter,
    ...transformFilters,
    ...effectFilters,
    ...textFilters,
    scaleFilter,
  ].filter((f): f is string => Boolean(f));

  const audioPlan = buildAudioFilterChain({
    audio: state.audio,
    effects: state.effects,
    speed: state.transform.speed,
    effectiveDuration,
  });

  const crf =
    settings.quality === 'high'
      ? '20'
      : settings.quality === 'standard'
        ? '24'
        : '28';

  const args: string[] = [...trimArgs, '-i', inputVideoName];

  if (audioPlan.useReplaceInput) {
    args.push('-i', replaceAudioName);
  }

  if (audioPlan.complexFilter) {
    const fullComplex = `[0:v]${videoFilterChain.join(',')}[vout];${audioPlan.complexFilter}`;
    args.push(
      '-filter_complex',
      fullComplex,
      '-map',
      '[vout]',
      '-map',
      '[aout]'
    );
  } else {
    args.push('-vf', videoFilterChain.join(','));
    if (audioPlan.muted) {
      args.push(...buildRemoveSoundArgs());
    } else if (audioPlan.useReplaceInput) {
      args.push('-map', '0:v:0', '-map', '1:a:0');
      if (audioPlan.audioFilters.length > 0) {
        args.push('-af', audioPlan.audioFilters.join(','));
      }
    } else if (audioPlan.audioFilters.length > 0) {
      args.push('-af', audioPlan.audioFilters.join(','));
    }
  }

  args.push(
    '-r',
    String(settings.fps),
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-crf',
    crf,
    '-pix_fmt',
    'yuv420p'
  );

  if (!audioPlan.muted) {
    args.push('-c:a', 'aac', '-b:a', '128k', '-shortest');
  }

  args.push('-movflags', '+faststart', '-y', outputName);
  return args;
}
