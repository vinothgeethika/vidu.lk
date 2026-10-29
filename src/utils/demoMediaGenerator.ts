import { SlideImageItem } from '../types/editor';

/**
 * Generates an in-memory PCM WAV File with a pleasant ambient chord progression + beat
 * so users can test Image+Audio -> Video and Audio Replacement immediately in the browser.
 */
export function createDemoAudioWavFile(
  durationSeconds = 9,
  filename = 'clipforge_synth_beat.wav'
): { file: File; url: string; duration: number } {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const numChannels = 1;
  const bytesPerSample = 2;
  const dataSize = numSamples * numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 16, true); // 16-bit
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Chords changing every 3 seconds: Am7 -> Fmaj7 -> G6
  const chords = [
    [220.0, 261.63, 329.63, 392.0],
    [174.61, 220.0, 261.63, 329.63],
    [196.0, 246.94, 293.66, 329.63],
  ];

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const chordIdx = Math.floor(t / 3) % chords.length;
    const freqs = chords[chordIdx];

    // Warm pad
    let sample = 0;
    for (const f of freqs) {
      sample += 0.14 * Math.sin(2 * Math.PI * f * t);
    }

    // Soft rhythmic pulse at 120 BPM (every 0.5s)
    const beatPhase = (t % 0.5) / 0.5;
    const kickEnv = Math.exp(-beatPhase * 9);
    const kickFreq = 110 * Math.exp(-beatPhase * 4) + 45;
    sample += 0.25 * kickEnv * Math.sin(2 * Math.PI * kickFreq * t);

    // Envelope at start and end
    const envIn = Math.min(1, t / 0.3);
    const envOut = Math.min(1, (durationSeconds - t) / 0.4);
    const finalVal = Math.max(-1, Math.min(1, sample * envIn * envOut));

    view.setInt16(44 + i * 2, Math.floor(finalVal * 32767), true);
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  const file = new File([blob], filename, { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);

  return { file, url, duration: durationSeconds };
}

/**
 * Generates high-resolution studio slide images via HTML5 Canvas for testing Image + Audio -> Video
 * and visual effects without external image host dependencies.
 */
export async function createDemoSlideshowImages(): Promise<SlideImageItem[]> {
  const specs = [
    {
      id: 'slide-1',
      name: '01_neon_architecture.png',
      title: 'STUDIO SEQUENCE 01',
      subtitle: 'BROWSER-NATIVE NON-LINEAR TIMELINE',
      bgStart: '#0F172A',
      bgEnd: '#3B0764',
      accent: '#C084FC',
    },
    {
      id: 'slide-2',
      name: '02_chromatic_motion.png',
      title: 'CHROMATIC OPTICS 02',
      subtitle: 'REAL-TIME RGB GLITCH & COLOR GRADING',
      bgStart: '#111827',
      bgEnd: '#831843',
      accent: '#F472B6',
    },
    {
      id: 'slide-3',
      name: '03_acoustic_sync.png',
      title: 'ACOUSTIC PULSE 03',
      subtitle: 'FRAME-ACCURATE AUDIO-LOCKED EXPORT',
      bgStart: '#090D16',
      bgEnd: '#1E1B4B',
      accent: '#818CF8',
    },
  ];

  const items: SlideImageItem[] = [];

  for (let idx = 0; idx < specs.length; idx++) {
    const spec = specs[idx];
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 1280, 720);
      grad.addColorStop(0, spec.bgStart);
      grad.addColorStop(1, spec.bgEnd);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);

      // Subtle architectural grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (let x = 80; x < 1280; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 720);
        ctx.stroke();
      }
      for (let y = 80; y < 720; y += 80) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1280, y);
        ctx.stroke();
      }

      // Glowing geometric orb
      const radGrad = ctx.createRadialGradient(920, 340, 20, 920, 340, 280);
      radGrad.addColorStop(0, spec.accent);
      radGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = radGrad;
      ctx.beginPath();
      ctx.arc(920, 340, 280, 0, Math.PI * 2);
      ctx.fill();

      // Framing lines
      ctx.strokeStyle = 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 2;
      ctx.strokeRect(64, 64, 1152, 592);

      // Typography
      ctx.fillStyle = spec.accent;
      ctx.font = '600 20px "JetBrains Mono", monospace';
      ctx.fillText(`FRAME 0${idx + 1} / 03 · 1280x720`, 110, 270);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 58px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(spec.title, 110, 350);

      ctx.fillStyle = '#CBD5E1';
      ctx.font = '500 24px "DM Sans", sans-serif';
      ctx.fillText(spec.subtitle, 110, 405);
    }

    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b || new Blob()), 'image/png')
    );
    const file = new File([blob], spec.name, { type: 'image/png' });
    const url = URL.createObjectURL(blob);

    items.push({
      id: spec.id,
      name: spec.name,
      url,
      file,
      duration: 3,
      width: 1280,
      height: 720,
    });
  }

  return items;
}
