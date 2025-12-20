# Inspire

Latest UI tour (captured with Playwright against `http://localhost:8080` on Dec 10, 2025):

![Inspire home](./docs/screenshots/2025-12/01-home.png)
![Community remix](./docs/screenshots/2025-12/03-remixed-pack.png)
![Pack list](./docs/screenshots/2025-12/04-pack-list.png)
![Pack detail](./docs/screenshots/2025-12/05-pack-detail.png)

## What Is Inspire?

Inspire is a full-stack TypeScript studio that blends live cultural signals with curated randomness to help musicians and creators break creative blocks. Every "fuel pack" assembles words, samples, visuals, and challenges from real-time APIs so you can start writing, producing, or editing without staring at a blank page.

## Who It's For

- Vocalists who need story sparks, rhyme families, and melodic prompts.
- Producers hunting for royalty-friendly samples, FX ideas, and sonic constraints.
- Editors crafting clips, memes, or reels and looking for mood boards and pacing cues.
- Creative facilitators running writing rooms, workshops, or classroom sessions.

## How Inspire Works

1. Pick a creative mode (Lyricist, Producer, or Editor) and adjust the relevance blend for tone, recency, and experimentation.
2. The backend fans out to live services like Datamuse, Freesound, Jamendo, and Piped (YouTube proxy) — with keyless defaults for images (Picsum), memes (Picsum templates + built‑in caption), and a static NewsAPI mirror.
3. Inspire builds a fuel pack with power words, meme-ready visuals, news hooks, sample choices, FX prompts, emotional arcs, and timeline beats so you can ship ideas fast.

## Feature Highlights

- Live news hooks with contextual writing prompts pulled from NewsAPI searches every generation.
- Producer packs combine Freesound samples, Jamendo tracks, and Creative Commons instrumentals from Piped search results.
- Meme tools surface trending templates via Imgflip and let you caption them on demand for shareable drafts.
- Word explorer exposes Datamuse filters for rhymes, syllable counts, and starting letters directly in the interface.
- Theme-aware UI with collapsible workbench controls so you can focus on the content that matters.

## Live Data Sources

Keyless by default with graceful fallbacks. Optional keys unlock richer data.

| Capability | Provider(s) | Keys |
| --- | --- | --- |
| Power words, rhymes, syllables | Datamuse | none |
| Random vocabulary | Random Word API | none |
| Definitions | Free Dictionary API | none |
| Meme templates | Picsum (seeded images) | none |
| Meme captioning | Built‑in (dummyimage) | none (Imgflip optional) |
| Inspirational images | Picsum | none (Unsplash optional) |
| Trending memes & reddit topics | Reddit JSON | none |
| Audio samples & sound design | Freesound | optional: `FREESOUND_API_KEY` |
| Royalty‑free reference tracks | Jamendo | optional: `JAMENDO_CLIENT_ID` |
| Instrumentals (search) | Piped (YouTube proxy) | none |
| News headlines & context | Static NewsAPI mirror | none (NewsAPI optional) |

## Project Tour

```
Inspire/
├── backend/
│   ├── src/
│   │   ├── index.ts               # Express server & API routes (/api)
│   │   ├── modePackGenerator.ts   # Mode-specific pack assembly (async)
│   │   ├── services/
│   │   │   ├── audioService.ts    # Freesound & Jamendo
│   │   │   ├── memeService.ts     # Imgflip, Unsplash, Reddit
│   │   │   # Keyless fallbacks: Picsum images, caption via dummyimage
│   │   │   ├── trendService.ts    # NewsAPI & Reddit trends
│   │   │   ├── wordService.ts     # Datamuse & word utilities
│   │   │   ├── youtubeService.ts  # Piped instrumentals
│   │   │   └── apiClient.ts       # Shared axios wrapper
│   │   └── utils/                 # Helpers (ID generation, etc.)
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx                # Primary UI & orchestration
│   │   ├── components/            # Sliders, collapsible sections, etc.
│   │   └── assets/                # Logos and theme art
│   ├── vite.config.ts             # Dev proxy for /api (and /dev for back-compat)
│   └── package.json
├── docs/                          # Product specs and research notes
└── run_dev.sh                     # Dual-serve script for local dev
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- API keys for Unsplash, Freesound, Jamendo, NewsAPI, and Imgflip (username + password) to unlock live data.

### Configure Environment Variables

`backend/.env.example` documents every supported key. Create your local file and populate the secrets before starting the servers.

```bash
cd backend
cp .env.example .env
# Then edit .env and provide the values listed below
```

Required keys for live mode:

```env
FREESOUND_API_KEY=your_freesound_key
JAMENDO_CLIENT_ID=your_jamendo_client_id
UNSPLASH_ACCESS_KEY=your_unsplash_access_key
NEWS_API_KEY=your_news_api_key
IMGFLIP_USERNAME=your_imgflip_username
IMGFLIP_PASSWORD=your_imgflip_password
USE_MOCK_FALLBACK=false
```

Optional keys:

```env
HUGGINGFACE_API_KEY=...
RANDOM_WORD_API_URL=...
PIPED_API_URL=https://piped.video/api/v1
ENABLE_DEV_CONSOLE=false
```

### Install Dependencies

```bash
# From the repository root
npm install
(cd backend && npm install)
(cd frontend && npm install)
```

### Run The Stack Locally

Use the bundled helper script to launch both servers with one command.

```bash
./run_dev.sh
```

- Backend runs on `http://localhost:3001`
- Frontend runs on `http://localhost:8080`
- Vite proxies `/api/*` requests to the backend so the UI always hits the real services.

Stop the servers with `Ctrl+C`. Nodemon hot-reloads backend changes and Vite hot-updates the React app.

### Useful npm Scripts

```bash
npm run lint            # Lint backend + frontend
npm test                # Run backend Jest suite
npm run build           # Build backend (tsc) and frontend (vite)
npx playwright test     # Run E2E (builds + serves the app)
```

## Product Walkthrough

1. Land on the studio picker and choose Lyricist, Producer, or Editor.
2. Tune the Relevance Blend controls for timeframe, tone, and experimentation.
3. Generate a pack to receive:
   - Lyricist: power words, rhyme clusters, lyric fragments, meme sounds, live headlines, and story arcs.
   - Producer: BPM/key suggestions, Freesound sample pairings, FX constraints, instrument palettes, and Creative Commons instrumentals.
   - Editor: moodboard clips, audio cues, pacing beats, visual constraints, and share-ready title prompts.
4. Remix packs to merge favorite elements across runs or share them with collaborators using encoded URLs.

### New UI Utilities

- Save & Archive: save current pack and open your saved list (local snapshot storage on the backend).
- Word Explorer: live Datamuse filters (starts-with, rhyme, syllables, topic) inside the UI.
- Meme Caption: pick a keyless template (Picsum preview) and generate a caption image (dummyimage).
- Inspiration Image: per‑pack Picsum visual spark, with a refresh button.

## Contributing

Issues and pull requests are welcome. If you are adding a new integration:

1. Provide mock data in `backend/src/mocks/` for offline development.
2. Add a service wrapper under `backend/src/services/` with graceful fallbacks.
3. Extend `createAllServices()` so the integration is globally available.
4. Update docs and the README to reflect new capabilities.

## Keyless Mode

You can run completely without API keys and still get a great experience.

- Leave all optional keys empty
- Set `USE_MOCK_FALLBACK=true` (recommended for CI)
- You get: Datamuse word explorer, Piped instrumentals, static news, Picsum images/templates, built‑in meme captioning, and curated audio/text fallbacks.

## Functionality

This section lists exactly what was inspected and tested in this repository (verified as of Dec 20, 2025).

- **What works (verified by code inspection and runtime checks where possible):**
   - Backend API routes implemented in `backend/src/index.ts`: `/api/health`, `/api/modes`, `/api/modes/:mode/fuel-pack` (mode pack generator with graceful fallbacks), `/api/mock/words`, `/api/mock/memes`, `/api/mock/samples`, `/api/mock/news`, `/api/fuel-pack` (legacy), `/api/packs/:id`, `/api/packs/:id/save`, `/api/packs/saved`, `/api/instrumentals/search`, `/api/news/search`, `/api/youtube/search`, `/api/words/search`, `/api/memes/templates`, `/api/images/random`, plus asset/auth/billing stubs.
   - Mode pack assembly is implemented in `backend/src/modePackGenerator.ts` and returns mode-specific packs for `lyricist`, `producer`, and `editor` with fallbacks to mock data in `backend/src/mocks/` when external services are unavailable.
   - Frontend (`frontend/src/App.tsx`) requests `GET /api/modes` and `POST /api/modes/:mode/fuel-pack` and includes UI components for sliders, collapsibles, and pack rendering in `frontend/src/components/`.
   - Keyless operation is supported: when API keys are not provided the code paths fall back to mock data (Picsum, mock samples, mock news, etc.).

- **What I ran and the results (verification steps):**
   - `cd backend && npm test` — attempted to run backend Jest tests. Result: Jest failed to parse an ESM-only dependency (`youtube-search-without-api-key`) with "SyntaxError: Cannot use import statement outside a module". Tests need either a transform or a mock for that module.
   - `cd backend && npm run dev` — started the backend with `nodemon --exec ts-node src/index.ts`. The process printed startup logs including the data directory and a line indicating the API was running on `http://localhost:3001`. In this environment an immediate `curl` to `/api/health` was attempted but returned intermittent connection failures; the server start log was observed but a stable runtime reachability check did not succeed consistently here.

- **What doesn't work / immediate blockers:**
   - Backend unit tests do not run as-is: Jest fails on an ESM dependency (`youtube-search-without-api-key`). Fixing tests requires updating Jest/ts-jest configuration, mocking that dependency, or replacing the module with a CommonJS-compatible adapter.
   - End-to-end automation (Playwright) was not executed in this session — E2E requires building the frontend (`npm run build` inside `frontend`) and a stable backend instance.

- **Recommended next steps (must / should):**
- **Recommended next steps (must / should):**
   - Implemented: Jest ESM issue mitigated by adding a CommonJS Jest mock for `youtube-search-without-api-key` and mapping it in `backend/jest.config.cjs` (`moduleNameMapper`). Mock implemented at `backend/src/services/__mocks__/youtube-search-without-api-key.js`.
   - Implemented: Lightweight integration test added at `backend/__tests__/modepack.integration.test.ts` that POSTs to `/api/modes/lyricist/fuel-pack` and asserts expected pack fields.
   - Implemented: CI Playwright smoke workflow added at `.github/workflows/playwright-smoke.yml` and a simple Playwright spec at `e2e/playwright-smoke.spec.ts` to build the frontend and exercise the backend dev console.
   - Remaining: Consider standardizing CI to run tests against built `dist/` artifacts (optional), and remove or reduce debug logging added during investigation if desired.

- **Nice-to-have / could be implemented later:**
   - Convert the YouTube helper to a thin adapter (or dynamic import) so tests can stub it without transpiling node_modules.
   - Add a CI job that builds backend + frontend, starts the backend on the built `dist/` artifact, runs Jest against compiled code, and then runs Playwright smoke tests.

## License

MIT
