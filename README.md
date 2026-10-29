# ClipForge — Browser Video Studio

ClipForge is a responsive, privacy-first browser video editor built with **React 19**, **TypeScript**, **Tailwind CSS**, **Motion**, and **FFmpeg.wasm (`@ffmpeg/ffmpeg`)**. All video and audio processing runs 100% locally in the user's browser—files are never uploaded to a server.

## Architecture & Cloudflare Pages Compatibility

- **Pure Static SPA**: Compiles via `vite build` into the `dist/` directory with zero backend server requirements.
- **Under 25 MB Asset Limit**: The ~31 MB `ffmpeg-core.wasm` binary is **not** bundled into `dist/`. Instead, ClipForge lazily fetches the pinned single-thread build (`@ffmpeg/core@0.12.10`) at runtime from the **jsDelivr CDN** (`https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm/`) using `toBlobURL`.
- **Single-Thread WASM Core**: Works out-of-the-box on any static host without requiring `Cross-Origin-Embedder-Policy` (`COEP`) or `Cross-Origin-Opener-Policy` (`COOP`) headers.
- **Security Headers**: Includes `public/_headers` (copied automatically to `dist/_headers` during `npm run build`) with Cloudflare Pages security and asset caching rules.

---

## Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server** (http://localhost:3000):
   ```bash
   npm run dev
   ```

3. **Run unit tests**:
   ```bash
   npx tsx --test src/utils/ffmpegCommands.test.ts
   ```

4. **Build static production bundle**:
   ```bash
   npm run build
   ```

---

## Deploying to Cloudflare Pages

### Option 1: Git Integration (Recommended)

1. Push this repository to **GitHub** or **GitLab**.
2. Log in to the **Cloudflare Dashboard** and navigate to **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Select your repository and configure the build settings:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node.js version**: `20` (or `22`)
4. Click **Save and Deploy**. No environment variables or API keys are required.

### Option 2: Direct Upload / Wrangler CLI

```bash
npm run build
npx wrangler pages deploy dist --project-name=clipforge
```
