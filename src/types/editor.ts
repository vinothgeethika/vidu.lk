export type ProjectMode = 'video' | 'slideshow';

export type ToolTabId =
  | 'media'
  | 'trim'
  | 'crop'
  | 'audio'
  | 'effects'
  | 'text'
  | 'utilities';

export type AppView = 'landing' | 'editor' | 'pricing' | 'settings';

export type CropPreset = 'free' | '9:16' | '1:1' | '16:9' | '4:5';

export interface SlideImageItem {
  id: string;
  name: string;
  url: string;
  file?: File;
  duration: number; // seconds per slide
  width: number;
  height: number;
}

export interface VideoSegment {
  id: string;
  label: string;
  start: number;
  end: number;
}

export interface VideoTrim {
  start: number;
  end: number;
  segments: VideoSegment[];
}

export interface CropRect {
  preset: CropPreset;
  /** Normalized 0-100 percentage of video frame */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AudioConfig {
  muted: boolean;
  originalVolume: number; // 0 to 200 (%)
  replaceFile?: File | null;
  replaceUrl?: string | null;
  replaceName?: string | null;
  replaceDuration?: number;
  replaceVolume: number; // 0 to 200 (%)
  mixWithOriginal: boolean;
}

export interface EffectsConfig {
  fadeIn: boolean;
  fadeInDuration: number; // 0.5 to 5.0s
  fadeOut: boolean;
  fadeOutDuration: number; // 0.5 to 5.0s
  glitch: boolean;
  glitchIntensity: number; // 1 to 10
  glitchDuration: number; // 0.5 to 10s (or full clip)
  blackAndWhite: boolean;
  blur: number; // 0 to 20
  brightness: number; // -50 to 50 (mapped to -0.5 to 0.5)
  contrast: number; // 50 to 150 (mapped to 0.5 to 1.5)
  zoomIn: boolean;
  zoomAmount: number; // 1.05 to 1.5
  vignette: boolean;
}

export interface TransformConfig {
  speed: number; // 0.5 to 2.0
  rotation: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
}

export interface TextOverlayItem {
  id: string;
  text: string;
  fontFamily: 'Plus Jakarta Sans' | 'DM Sans' | 'JetBrains Mono' | 'Impact' | 'Georgia';
  fontSize: number; // 18 to 72
  color: string;
  backgroundColor: string;
  /** Normalized 0-100 coordinates on canvas */
  x: number;
  y: number;
  startTime: number;
  endTime: number;
}

export type ExportResolution = '480p' | '720p' | '1080p';
export type ExportQuality = 'draft' | 'standard' | 'high';
export type ExportFormat = 'mp4' | 'mp3';

export interface ExportSettings {
  resolution: ExportResolution;
  quality: ExportQuality;
  format: ExportFormat;
  fps: 24 | 30 | 60;
}

export interface EditorState {
  projectName: string;
  mode: ProjectMode;
  /** Video mode source */
  videoFile?: File | null;
  videoUrl?: string | null;
  videoName?: string;
  videoDuration: number;
  videoWidth: number;
  videoHeight: number;
  videoSizeBytes: number;
  /** Slideshow mode sources */
  slides: SlideImageItem[];
  slideshowAudioFile?: File | null;
  slideshowAudioUrl?: string | null;
  slideshowAudioName?: string | null;
  slideshowAudioDuration: number;
  autoMatchAudioLength: boolean;
  /** Editing parameters */
  trim: VideoTrim;
  crop: CropRect;
  audio: AudioConfig;
  effects: EffectsConfig;
  transform: TransformConfig;
  textOverlays: TextOverlayItem[];
}

export interface FileValidationResult {
  valid: boolean;
  warning?: string;
  error?: string;
  category?: 'video' | 'image' | 'audio';
}
