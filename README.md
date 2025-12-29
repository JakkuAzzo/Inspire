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

## Database setup

The backend now ships with PostgreSQL persistence. Provide `DATABASE_URL` in `backend/.env` (e.g. `postgres://user:pass@localhost:5432/inspire`) and the server will run SQL migrations on startup. Without this variable, an in-memory `pg-mem` database is used automatically for local development and tests.

Example local bootstrap:

```bash
docker run --name inspire-postgres -e POSTGRES_PASSWORD=devpass -e POSTGRES_USER=devuser -e POSTGRES_DB=inspire -p 5432:5432 -d postgres:16
cd backend && echo "DATABASE_URL=postgres://devuser:devpass@localhost:5432/inspire" > .env
npm run dev:backend
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

## Story Arc Pack Card (current state)

**How it works today**
- In the Lyricist flow, the Story Arc card accepts summary, optional theme/genre/BPM, and a node-count selector (default 7 beats).
- On Generate, the frontend POSTs to `/api/story-arc` with those fields; the backend tries a local ONNX `flan-t5-small` model first, then falls back to template text.
- Returned beats are slotted into fixed progression labels (Set the scene, Trigger event, Complication, Reversal, Aftershock, Decision, Fallout) and rendered as editable text areas with drag-and-drop ordering.

**What it is supposed to do**
- Produce distinct beat text that evolves the idea across the arc (not just repeat the summary), flavored by theme/genre/BPM and node count.
- Let users lightly edit/reorder beats, then reuse them alongside words/hooks in the pack.

**What is missing**
- No temperature/top-k tuning or prompt diversification to force variety across beats.
- No server-side validation that each beat is unique or expands on the summary; UI currently only checks presence.
- No persistence/export of edited arcs beyond the current pack object.

**What is broken**
- The fallback generation path currently returns identical text for every beat (see Playwright run: all nodes echoed the summary), so progression labels change but content does not diversify.
- ONNX warnings spam the dev console when the model loads; they are non-blocking but noisy.

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

## Local fixes and test notes

- Frontend: fixed a JSON syntax issue in `frontend/package.json` (missing comma after `socket.io-client`) and installed frontend deps. Run:

```bash
cd frontend
npm install
```

- Backend: updated TypeScript test environment to include types for `pg`, `pg-mem`, `express-rate-limit`, `cookie-parser`, and `bcryptjs` in `backend/tsconfig.json` so `ts-jest` can resolve them during tests.

- Tests: added focused integration specs under `backend/__tests__/integration/` for:
   - auth flows (`auth.integration.test.ts`)
   - pack persistence using `pg-mem` (`packs.integration.test.ts`)
   - Socket.IO room join/presence (`socketRooms.integration.test.ts`)

Run backend tests:

```bash
cd backend
npm install
npm test
```

If tests fail due to environment keys, run with `USE_MOCK_FALLBACK=true`.

More CI and healthcheck changes are pending (coverage thresholds, smoke/startup jobs, and third-party contract recordings).

CI and Healthchecks

- A GitHub Actions workflow was added at `.github/workflows/ci.yml` to run unit tests, a smoke start (keyless fallbacks), and a seeded integration job (uses repository secrets).
- The backend exposes `/api/health` that reports overall status plus per-provider status (ok/degraded) and a reason when degraded. The UI can use this endpoint to surface degraded providers and fall back gracefully.

Current functionality status after merging the major feature branches (auth, persistence, real-time, pack lifecycle, and live data), verified December 21, 2025.

### ✅ What Works

- **Live pack generation** for Lyricist/Producer/Editor with mode-specific content, pack-aware headline search, and cache-backed external calls (Datamuse, Freesound, Jamendo, NewsAPI/Imgflip/Unsplash/Piped when keys are present; keyless fallbacks stay online-first).
- **Authentication and user profiles** with email/password, refresh tokens, and HTTP-only cookies; auth middleware now protects pack/room actions and surfaces the active user in remix lineage.
- **PostgreSQL-backed persistence** (with automatic `pg-mem` fallback) for saving packs, remix lineage, shared links, and challenge/achievement progress.
- **Pack lifecycle UI**: generate, remix, share via tokens, open saved packs, and remix from community feed posts; auth modal and session indicator flow through the UI.
- **Daily challenges and gamification**: challenge service emits current prompt, completion tracking, streak/achievement data, and UI badges/hooks reflect server responses.
- **Real-time community features**: Socket.IO rooms/feed events (join, spectate, post, remix) broadcast to connected clients; presence/room snapshots hydrate the UI on connect.

### ⚠️ Needs Attention

- **Backend test suite currently failing** because ts-jest cannot find default exports and misses runtime dependencies while collecting coverage (e.g., `pg`, `pg-mem`, auth exports).【e43446†L1-L74】
- **Frontend package.json is invalid JSON**, so npm/vitest/playwright scripts cannot run until the missing comma in `dependencies` is fixed.【652b82†L14-L19】【3e0fd7†L1-L11】
- **CI safety**: coverage thresholds are effectively zero and tsconfig excludes tests, so regressions can slip by once the suite is unblocked.
- **Prod readiness**: live API behavior still depends on providing real keys; no recorded contract tests assert live responses, so outages could go undetected.

### ❌ Broken or Missing

- **Automated verification**: backend Jest runs fail; frontend unit/E2E suites cannot execute because of the invalid package manifest; playbooks in `TESTING_SUMMARY.md` are stale.
- **Type-safety gaps**: ts-jest errors show missing exports and implicit `any` types in repository code during coverage collection, indicating type drift from recent refactors.【e43446†L1-L66】
- **Operational guardrails**: no migration/seed check in CI for the Postgres path; local dev still silently falls back to in-memory storage without warning.

### 🔧 Plan to Fix

1. **Unblock frontend tooling**: add the missing comma after `"socket.io-client"` in `frontend/package.json`, rerun `npm install`, and re-enable `npm test`/`npm run lint` in CI.
2. **Stabilize backend tests**:
   - Export `server`/`io` from `src/index.ts` (or adjust tests to import named exports) to satisfy ts-jest’s default import checks.
   - Ensure `pg`, `pg-mem`, `express-rate-limit`, `cookie-parser`, and `bcryptjs` types are resolved during tests (tsconfig `types` or jest setup) to stop coverage crashes.
   - Add focused integration specs for auth, pack persistence, and Socket.IO rooms using the `pg-mem` test database.
3. **Strengthen CI gates**: raise coverage thresholds, include migrations in the pipeline, and add a smoke job that starts the stack with keyless fallbacks plus a job that runs with seeded API keys.
4. **Validate live integrations**: record contract tests (or VCR cassettes) for Datamuse/Freesound/Jamendo/NewsAPI/Imgflip/Piped/Unsplash and wire health checks into `/api/health` so the UI can surface degraded providers.
5. **Keep docs aligned**: refresh `TESTING_SUMMARY.md` once the suites pass and note how to run auth+realtime scenarios locally.

## License

MIT
