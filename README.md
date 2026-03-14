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

| Capability                     | Provider(s)            | Keys                           |
| ------------------------------ | ---------------------- | ------------------------------ |
| Power words, rhymes, syllables | Datamuse               | none                           |
| Random vocabulary              | Random Word API        | none                           |
| Definitions                    | Free Dictionary API    | none                           |
| Meme templates                 | Picsum (seeded images) | none                           |
| Meme captioning                | Built‑in (dummyimage) | none (Imgflip optional)        |
| Inspirational images           | Picsum                 | none (Unsplash optional)       |
| Trending memes & reddit topics | Reddit JSON            | none                           |
| Audio samples & sound design   | Freesound              | optional:`FREESOUND_API_KEY` |
| Royalty‑free reference tracks | Jamendo                | optional:`JAMENDO_CLIENT_ID` |
| Instrumentals (search)         | Piped (YouTube proxy)  | none                           |
| News headlines & context       | Static NewsAPI mirror  | none (NewsAPI optional)        |

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

## Firebase Cloud Functions Endpoints

Deployed endpoints for the Firebase VST backend:

- createRoom: https://us-central1-inspire-8c6e8.cloudfunctions.net/createRoom
- joinRoom: https://joinroom-kfjkqn5ysq-uc.a.run.app
- listFiles: https://listfiles-kfjkqn5ysq-uc.a.run.app
- getDownloadUrl: https://getdownloadurl-kfjkqn5ysq-uc.a.run.app
- helloWorld: https://helloworld-kfjkqn5ysq-uc.a.run.app

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

## Building InspireVST (VST3 Plugin)

InspireVST is a VST3 audio plugin for Ableton Live that syncs creative content from Inspire collaboration sessions. Use the automated build script to compile and install the plugin.

### Prerequisites for VST3 Build

- macOS 11.0+
- Xcode Command Line Tools: `xcode-select --install`
- CMake 3.18+: `brew install cmake`
- Apple Clang compiler (included with Xcode)

### Quick Build

```bash
# From the repository root, run the build script
./inspirevst-build.sh
```

This automatically:

1. Configures CMake with JUCE 8.0.4
2. Compiles all source files (PluginProcessor, PluginEditor, NetworkClient)
3. Builds the VST3 bundle
4. Installs to `~/Library/Audio/Plug-Ins/VST3/InspireVST.vst3`
5. Verifies the installation

**Build time**: ~10-15 seconds (incremental), ~60-90 seconds (clean rebuild)

### Build Variants

```bash
# Release build (optimized, default)
./inspirevst-build.sh

# Clean rebuild
./inspirevst-build.sh clean

# Debug build (with symbols)
./inspirevst-build.sh debug

# Clean debug rebuild
./inspirevst-build.sh clean debug
```

### After Building: Load in Ableton Live

1. Open **Ableton Live 12+**
2. Go to **Browser** → **Audio Effects**
3. Search for **"InspireVST"**
4. Drag the plugin to an audio track

If the plugin doesn't appear:

- Run `./inspirevst-build.sh` again
- Restart Ableton Live
- Go to **Preferences** → **Plugins** → **Rescan**

### Build Output

**Installation location**: `~/Library/Audio/Plug-Ins/VST3/InspireVST.vst3`

**Binary details**:

```
├── Contents/
│   ├── MacOS/InspireVST    (7.6M executable)
│   ├── Info.plist          (plugin metadata)
│   ├── PkgInfo
│   └── Resources/
│       └── moduleinfo.json
```

### Plugin Features

- **Room Join**: Enter collaboration room ID and code to sync with other users
- **File Sync**: Real-time file list with delta polling (via `?since` parameter)
- **Audio Download**: Download audio files from the collaboration room
- **Live Status**: Visual feedback for room connection, file updates, and errors

### Source Code

All plugin source files are in `InspireVST/Source/`:

| File                       | Purpose                                                           |
| -------------------------- | ----------------------------------------------------------------- |
| `PluginProcessor.h/.cpp` | VST3 AudioProcessor base; MIDI/audio I/O                          |
| `PluginEditor.h/.cpp`    | UI with room join, file sync, downloads                           |
| `NetworkClient.h/.cpp`   | Cloud Functions integration (joinRoom, listFiles, getDownloadUrl) |
| `CMakeLists.txt`         | Build configuration                                               |

### Development Workflow

**Edit and rebuild rapidly**:

```bash
# 1. Edit source code
vim InspireVST/Source/PluginEditor.cpp

# 2. Rebuild (incremental, ~10 seconds)
./inspirevst-build.sh

# 3. Restart Ableton Live and test
# 4. Repeat
```

### Troubleshooting

**"Permission denied" when running script**:

```bash
chmod +x ./inspirevst-build.sh
```

**"CMake not found"**:

```bash
brew install cmake
```

**Plugin not visible in Ableton after rebuild**:

1. Ensure build completed successfully
2. Restart Ableton Live completely
3. Go to **Preferences** → **Plugins** → **Rescan**

**Compilation errors**:

- Try a clean rebuild: `./inspirevst-build.sh clean`
- Ensure Xcode Command Line Tools are installed: `xcode-select --install`
- Check that `InspireVST/` directory exists with `CMakeLists.txt`

**More details**: See [INSPIREVST_BUILD_SCRIPT_GUIDE.md](./INSPIREVST_BUILD_SCRIPT_GUIDE.md) for comprehensive build documentation and CI/CD integration.

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

## 🎬 Collaboration & Real-Time Features

### Collaborative Sessions

Create real-time collaborative sessions where multiple users can work together on music production or editing tasks. Each session includes:

- **Live Video & Audio Streams**: WebRTC-powered multi-user video grid supporting 1-4 simultaneous participants
- **Shared Digital Audio Workstation (DAW)**: Synchronized BPM, tempo, key, and note editing across all participants
- **Guest Session Time Limits**: Guest users are restricted to 1-hour sessions with a countdown timer visible in the session header
- **Session Timer Display**: Real-time MM:SS countdown showing time remaining (for guest sessions)
- **Instant Messaging**: Comments and notes shared within the session
- **Session Persistence**: Sessions remain active until expiry or host closure

### Camera Feed Example

![Collaboration home screen](./docs/screenshots/collaboration/home-with-collab-peak.png)

### How Collaborative Sessions Work

1. **Create or Join**: Click the "Collaborate" peak on the home screen and start a new session or join an existing one
2. **Grant Permissions**: Allow camera and microphone access when prompted
3. **See Participants**: Watch video feeds from all active participants in a responsive grid layout
4. **Share Controls**: Edit shared DAW parameters (BPM, key, notes) that sync in real-time to all participants
5. **Session Timer** (Guests): Guest users see an orange countdown timer showing "MM:SS remaining" that automatically expires after 60 minutes
6. **Leave Anytime**: Click the leave button to exit the session and return to the home screen

### Guest Session Restrictions

To manage resources fairly, guest users have the following limitations:

- **1-Hour Time Limit**: Collaboration sessions expire automatically after 60 minutes for guests
- **Server-Enforced Expiry**: The backend checks expiry on every access and returns HTTP 410 if the session has expired
- **Visible Timer**: Guests see a countdown timer in the session header showing time remaining
- **No Renewal**: Once expired, a guest must create a new session (authenticated users have unlimited sessions)

### Multi-User Testing

To test collaborative features with actual camera feeds:

```bash
# Run automated test with visible browsers showing both users
npx playwright test collaboration-multiuser.spec.ts --headed

# Or run specific test case
npx playwright test collaboration-multiuser.spec.ts -g "should allow two users"
```

Test scenarios include:

- ✅ Two users creating and joining the same session
- ✅ Guest session timer display (60-minute countdown)
- ✅ Expired session cleanup and HTTP 410 handling
- ✅ Camera feed capture (both users visible in video grid)
- ✅ Session metadata synchronization

### Supported Platforms

- Chrome/Chromium (WebRTC video)
- Firefox (WebRTC video)
- Safari (WebRTC video with limited codec support)
- Mobile browsers (limited; camera access varies by OS)

### Known Limitations

- WebRTC requires camera/microphone hardware (physical or virtual camera)
- Sessions use in-memory storage; restart loses all active sessions
- Audio mixing not yet implemented (participants hear only their own microphone)
- Future: Socket.IO event listeners for real-time DAW synchronization

**See [COLLABORATION_VISUAL_GUIDE.md](./COLLABORATION_VISUAL_GUIDE.md) for detailed architecture diagrams, API responses, and implementation details.**

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

**MoSCoW (Story Arc)**

- Must: enforce unique, progressive beat text before returning (dedupe + rewrite where duplicates are detected).
- Should: tune prompts/temperature/top-k to encourage variation and respect theme/genre/BPM; suppress noisy ONNX initializer warnings in dev logs.
- Could: persist edited arcs with packs and export/share as structured text; add user-facing duplicate warnings with a one-click regenerate.
- Won't (for now): add model fine-tuning or remote inference; complex branching narratives beyond linear 5–9 beat scaffolds.

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


Test account


* Email: [test.collab.1773326469@example.com](vscode-file://vscode-app/Applications/Visual%20Studio%20Code.app/Contents/Resources/app/out/vs/code/electron-browser/workbench/workbench.html)
* Password: InspireTest123
* Display name: Collab Test User

## License

MIT
