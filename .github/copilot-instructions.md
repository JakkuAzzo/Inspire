# Copilot Instructions for Inspire

Inspire is a full-stack TypeScript studio for music/creative generators. This guide helps AI agents understand the architecture, conventions, and workflows needed to be productive.

## Project Overview

**What it does**: Builds "fuel packs"—randomized, mode-specific bundles of words, samples, visuals, and creative prompts from 14+ free APIs.

**Core workflow**:
1. Frontend (React/Vite) sends `ModePackRequest` to backend with `submode`, `filters` (timeframe/tone/semantic), and optional `genre`
2. Backend assembles content via `generateModePack()` from multiple API services, each with mock fallbacks
3. Frontend displays pack cards, detail views, workspace queue, and remix history

**Key files**:
- `backend/src/index.ts` – Express API, routes, mode definitions, stores
- `backend/src/modePackGenerator.ts` – Pack assembly logic, all mode types, curated content
- `backend/src/services/` – 8 API wrappers (word, meme, audio, trend, YouTube, news, mood, random)
- `frontend/src/App.tsx` – Main UI, state, pack display, queue, remix tracking
- `frontend/src/components/` – Reusable UI (sliders, collapsibles, toggles)

## Architecture Patterns

### Three Creative Modes + Submodes

Each mode (lyricist/producer/editor) has distinct submodes in `modePackGenerator.ts`:
- **Lyricist**: rapper, singer (words, rhymes, news hooks, emotional arcs)
- **Producer**: musician, sampler, sound-designer (samples, FX, instrumentals, key/tempo)
- **Editor**: image-editor, video-editor, audio-editor (visuals, pacing, color, clips)

Mode assembly is in `generateModePack()` (680+ lines). Submodes don't generate separate API calls; they customize the returned content *type and narrative*.

### Three-Tier Relevance Filter

All packs use `RelevanceFilter: { timeframe, tone, semantic }`:
- **Timeframe**: `'fresh'` (this week), `'recent'` (past month), `'timeless'` (perennial)
- **Tone**: `'funny'`, `'deep'`, `'dark'`
- **Semantic**: `'tight'` (precise/adjacent), `'balanced'` (diverse), `'wild'` (experimental)

**Semantics in action**: Filters are *not* just API parameters. They're metadata tags on content that drive curation and narration:

```typescript
// From modePackGenerator.ts: TaggedWord[] with semantic tags
const LYRICIST_POWER_WORDS: TaggedWord[] = [
  { value: 'neon confession', timeframe: 'fresh', tone: 'deep', semantics: ['balanced', 'wild'], genres: ['r&b', 'pop'] },
  { value: 'bytecode lullaby', timeframe: 'fresh', tone: 'funny', semantics: ['wild'], genres: ['hyperpop', 'lo-fi'] },
  { value: 'opal skyline', timeframe: 'timeless', tone: 'deep', semantics: ['tight', 'balanced'], genres: ['r&b', 'soul'] }
];

// Filtering logic: collect matching words, then shuffle or sort by semantic relevance
const matchingWords = LYRICIST_POWER_WORDS.filter(w => w.timeframe === filter.timeframe && w.tone === filter.tone);
```

**How it works in pack generation**:
1. Fetch from APIs (samples, news, memes) — each item has timeframe/tone/semantic tags in mocks or from live data
2. Filter by user's `RelevanceFilter` to narrow candidates
3. For `semantic: 'tight'`, reorder by precision (e.g., news hooks closest to genre)
4. For `semantic: 'wild'`, shuffle or pick outliers to spark unexpected ideas
5. Narrate the pack differently: tight packs have focused prompts, wild packs have experimental vibes

**Example flow** (in `generateModePack()` for lyricist/rapper):
```typescript
// User selects: timeframe='fresh', tone='funny', semantic='tight'
const freshFunnyWords = LYRICIST_POWER_WORDS.filter(w => 
  w.timeframe === 'fresh' && w.tone === 'funny' && w.semantics.includes('tight')
);
// Result: fewer, more topical words (e.g., 'paper plane flex' for recent memes)
// Pack headline: "Fresh Punchlines — Tight & Topical"

// User selects: semantic='wild'
const wildFunnyWords = LYRICIST_POWER_WORDS.filter(w => 
  w.tone === 'funny' && w.semantics.includes('wild')
);
// Result: eclectic, genre-crossing words (e.g., 'emoji smoke signal', 'glitch gospel')
// Pack headline: "Wild Humor — Push Boundaries"
```

Content tagging is throughout the codebase (see `NewsPrompt.timeframe`, `SampleReference.timeframe`). Use these filters to *narrate and reorder*, not just fetch different APIs.

### Service Layer: Graceful Degradation

Each service in `backend/src/services/` follows:
1. **Factory pattern**: `createWordService()` returns interface with methods like `searchRhymes(word)`, `getDefinition(word)`
2. **Try-live-fallback**: Attempt API call, catch errors, return mock data
3. **No key = no harm**: Missing API keys silently use mocks; `createAllServices()` initializes all 8

**Services**:
- `wordService`: Datamuse (rhymes, syllables, starts-with), Free Dictionary
- `memeService`: Imgflip (trending templates), Picsum (seeded images), Reddit JSON
- `audioService`: Freesound, Jamendo (CC samples/tracks)
- `trendService`: NewsAPI (or static mirror in `data/`), Reddit
- `youtubeService`: Piped (YouTube proxy, no key needed)
- `moodService`: Sentiment analysis (built-in or external)
- `newsService`: NewsAPI
- `randomService`: Random Word API, creative prompts

**Key insight**: Mocks live in `backend/src/mocks/` as exhaustive arrays (e.g., `mockMemes` has 50+ entries). When a service fails or has no key, it returns shuffled mocks. Frontend never knows the difference.

### Frontend State & Rendering

`App.tsx` (~3400 lines) manages:
- **Workspace queue**: `WorkspaceQueueItem[]` persisted in URL/state, tracks remix history
- **Pack deck**: List view with `PackCard` elements (collapsible sections per mode)
- **Pack detail**: Full view of one pack with all sections
- **Filters**: Global relevance sliders (timeframe, tone, semantic) + genre dropdown (lyricist only)
- **Theme toggle**: Accent color per mode (pink, cyan, purple)

No global state library; uses `useState` and `useCallback` for pack generation, queue operations.

## Conventions & Patterns

### TypeScript
- **Union types** for API responses: `Word | WordDefinition` or `Sound | Track`
- **Discriminated unions** for pack types: `LyricistModePack | ProducerModePack | EditorModePack` (each has unique fields)
- All types defined in `backend/src/types.ts` and duplicated in `frontend/src/types.ts` (no shared package)

### Naming
- **Service methods**: Imperative, plural for lists (`searchRhymes`, `getRhymeFamily`), singular for detail (`getDefinition`)
- **Pack creation**: `ModePackRequest` → `generateModePack(mode, submode, filters)` → `LyricistModePack | ...`
- **Fixtures**: In `backend/src/mocks/`, named `mockWords`, `mockMemes`, etc. (not `fixtures/`)

### Error Handling
- Services never throw; they return mock data and log silently
- No try-catch in API routes; assume all services complete
- Tests use `supertest` for HTTP assertions, mock services for unit tests

### Testing
- **Unit tests**: `backend/__tests__/api.test.ts`, test HTTP routes, pack structure, counts
- **E2E tests**: `frontend/tests/layout-flow.spec.ts`, uses Playwright, tests UI flows (list → detail → back), takes screenshots
- Run tests: `npm test` (backend unit), `npm run test:e2e` (frontend Playwright)

## Developer Workflows

### Local Development

```bash
# Install and start both servers (blocking, can Ctrl+C to stop both)
npm run dev
# Uses run_dev.sh: starts backend on :3001, frontend on :5173 with proxy setup
```

Backend runs in watch mode via `nodemon`. Frontend via Vite with HMR. No need to restart manually.

**Port mapping**:
- Backend API: `:3001` (Express)
- Frontend dev: `:5173` (Vite)
- Vite proxies `/api` and `/dev` to `:3001`

### Building
```bash
npm run build              # Builds both
npm run build:backend      # TypeScript → /dist
npm run build:frontend     # Vite bundle → /dist
```

### Environment Variables

`backend/.env.example` lists all keys. Create `backend/.env` and populate:
```env
FREESOUND_API_KEY=...        # Optional; mocks used if missing
JAMENDO_CLIENT_ID=...        # Optional
UNSPLASH_ACCESS_KEY=...      # Optional
IMGFLIP_USERNAME=...         # Optional (for meme captioning)
IMGFLIP_PASSWORD=...
NEWSAPI_KEY=...              # Optional; static mirror used if missing
```

No keys needed to run locally; all defaults to mocks.

### Adding a New Service

**End-to-end example: Add a `quotesService` for inspirational quotes**

1. **Create the service** at `backend/src/services/quotesService.ts`:
   ```typescript
   export interface Quote { text: string; author: string; source: string; }
   export interface QuotesService { 
     searchByTone(tone: string): Promise<Quote[]>;
     random(): Promise<Quote>;
   }
   
   export function createQuotesService(): QuotesService {
     return {
       searchByTone: async (tone: string) => {
         try {
           const res = await fetch(`https://api.quotable.io/random?tags=${tone}`);
           if (!res.ok) throw new Error('API failed');
           const data = await res.json();
           return [{ text: data.content, author: data.author, source: 'Quotable' }];
         } catch (err) {
           console.warn('quotesService error, using mocks:', err);
           return mockQuotes.filter(q => q.tags?.includes(tone)).slice(0, 1);
         }
       },
       random: async () => {
         try {
           const res = await fetch('https://api.quotable.io/random');
           const data = await res.json();
           return { text: data.content, author: data.author, source: 'Quotable' };
         } catch {
           return mockQuotes[Math.floor(Math.random() * mockQuotes.length)];
         }
       }
     };
   }
   ```

2. **Add mocks** at `backend/src/mocks/quoteMocks.ts`:
   ```typescript
   export const mockQuotes = [
     { text: 'Keep it real or keep it surreal.', author: 'Anon', source: 'Mock', tags: ['funny'] },
     { text: 'Art is the lie that enables us to realize the truth.', author: 'Picasso', source: 'Mock', tags: ['deep'] },
     { text: 'In darkness we find light.', author: 'Anonymous', source: 'Mock', tags: ['dark'] }
   ];
   ```

3. **Register in** `backend/src/services/index.ts`:
   ```typescript
   export { QuotesService, createQuotesService } from './quotesService';
   export type { Quote } from './quotesService';
   
   export function createAllServices() {
     return {
       // ... existing services ...
       quotesService: createQuotesService(),
     };
   }
   ```

4. **Update types** in both `backend/src/types.ts` and `frontend/src/types.ts`:
   ```typescript
   export interface Quote { text: string; author: string; source: string; }
   ```

5. **Integrate into** `backend/src/modePackGenerator.ts`:
   ```typescript
   export interface ModePackServices {
     // ... existing services ...
     quotesService?: QuotesService;
   }
   
   // In generateModePack(), add to the case for each mode:
   case 'lyricist':
     const quote = await services.quotesService?.searchByTone(filters.tone) || mockQuotes;
     return {
       id: createId(),
       mode: 'lyricist',
       submode,
       title: `Lyricist Pack — ${submode}`,
       quote: quote[0],  // Add to pack
       // ... other fields ...
     } as LyricistModePack;
   ```

6. **Add to** `LyricistModePack` in `backend/src/types.ts` and `frontend/src/types.ts`:
   ```typescript
   export interface LyricistModePack extends ModePackBase {
     quote?: Quote;
     // ... existing fields ...
   }
   ```

7. **Render in frontend** `frontend/src/App.tsx`:
   ```tsx
   {pack.quote && (
     <CollapsibleSection title="Inspiration">
       <p>"{pack.quote.text}"</p>
       <p>— {pack.quote.author}</p>
     </CollapsibleSection>
   )}
   ```

8. **Test**:
   ```bash
   npm test          # Verify route returns quote
   npm run test:e2e  # Verify quote renders in UI
   ```

**Key patterns**:
- Service always returns a value (never throws); caller doesn't check for errors
- Mocks are the default; API is a bonus
- Types are duplicated frontend/backend (no monorepo)
- Service is injected into `generateModePack()` via `services` param

### Adding a Pack Field

1. Add to `ModePackBase` or mode-specific type (`LyricistModePack`) in both `backend/src/types.ts` and `frontend/src/types.ts`
2. Populate in `generateModePack()` in `modePackGenerator.ts`
3. Render in `App.tsx` via `CollapsibleSection` or inline display

## Integration Points & Cross-Component Communication

### Backend ↔ Frontend

**Key routes** (all in `backend/src/index.ts`):
- `GET /dev/api/health` – Check server
- `POST /api/mode-pack` – Create pack from `ModePackRequest`
- `GET /api/mode-pack/:id` – Retrieve saved pack
- `GET /dev/api/mode-definitions` – List all modes/submodes
- `POST /api/save` – Save pack to in-memory store
- `GET /api/community-feed` – Fake community packs (future expansion)

All requests return `{ id, pack, ... }` with nested `pack` object.

### Frontend Queue & Persistence

Workspace queue is encoded in URL query params or sessionStorage (see `App.tsx` lines ~1000–1200). Each item has:
```typescript
{
  id: string;           // Pack ID
  mode: CreativeMode;   // Which tab it came from
  timestamp: number;
  remix?: { parentId: string; ... };
}
```

Clicking "Fork & Remix" clones a pack and adds to queue. Selecting a queue item shows its detail view.

### Coloring & Theming

Each mode has a CSS accent variable:
- Lyricist: `#ec4899` (pink)
- Producer: `#22d3ee` (cyan)
- Editor: `#a855f7` (purple)

Applied to buttons, active tabs, accents in `frontend/src/App.css` via inline `style={{ color: mode.accent }}`.

## Testing Strategy

### Unit Tests (Backend)

Run: `npm test` (or `npm run test` from root)

Tests in `backend/__tests__/` use `supertest` to POST/GET routes and assert pack structure:
```typescript
expect(res.body.pack.words).toHaveLength(5);
expect(res.body.pack.inspiration).toHaveProperty('quote');
```

**Common patterns**:
```typescript
// Test a route with filter params
test('POST /api/mode-pack with filters returns filtered content', async () => {
  const res = await request(app).post('/api/mode-pack').send({
    submode: 'rapper',
    filters: { timeframe: 'fresh', tone: 'funny', semantic: 'tight' }
  });
  
  expect(res.status).toBe(201);
  expect(res.body.pack.mode).toBe('lyricist');
  expect(res.body.pack.submode).toBe('rapper');
  expect(res.body.pack.words).toBeDefined();
  expect(Array.isArray(res.body.pack.words)).toBe(true);
});

// Test pack structure across all modes
test('All modes return valid pack structure', async () => {
  const modes = ['lyricist', 'producer', 'editor'];
  for (const mode of modes) {
    const res = await request(app).post('/api/mode-pack').send({
      submode: mode === 'lyricist' ? 'rapper' : mode === 'producer' ? 'sampler' : 'image-editor',
      filters: { timeframe: 'fresh', tone: 'funny', semantic: 'tight' }
    });
    expect(res.body.pack.id).toBeDefined();
    expect(res.body.pack.timestamp).toBeDefined();
  }
});

// Test error graceful degradation (missing service key)
test('Routes work even if API keys are missing', async () => {
  // All services should fallback to mocks
  const res = await request(app).post('/api/mode-pack').send({
    submode: 'rapper',
    filters: { timeframe: 'fresh', tone: 'funny', semantic: 'tight' }
  });
  expect(res.status).toBe(201);
  // No error thrown, mocks returned
});
```

Add tests when adding routes or changing pack schema. Use `supertest` for HTTP assertions and mock services for unit logic.

### E2E Tests (Frontend)

Run: `npm run test:e2e` from `frontend/` (or root)

Playwright tests in `frontend/tests/`:
- Start dev server (or reuse `PLAYWRIGHT_BASE_URL=http://localhost:4173`)
- Navigate, click buttons, check visibility
- Capture `test-artifacts/layout-*.png` for visual regression

**Common patterns**:
```typescript
import { expect, test } from '@playwright/test';

test('Pack detail renders all sections', async ({ page }) => {
  await page.goto('/');
  
  // Generate a pack
  await page.getByRole('button', { name: /Generate/i }).click();
  await page.waitForSelector('.pack-card');
  
  // Click to view detail
  await page.locator('.pack-card').first().click();
  
  // Assert detail panel visible
  const detail = page.locator('.pack-card-detail');
  await expect(detail).toBeVisible();
  
  // Check sections render
  await expect(page.locator('h3:has-text("Words")')).toBeVisible();
  await expect(page.locator('h3:has-text("Mood")')).toBeVisible();
  
  // Verify queue disappeared (detail replaces list)
  await expect(page.locator('.workspace-queue')).toHaveCount(0);
});

test('Workspace queue updates on fork', async ({ page }) => {
  await page.goto('/');
  
  // Initial queue should be empty or small
  const queueBefore = page.locator('.workspace-queue-item');
  const countBefore = await queueBefore.count();
  
  // Generate and fork
  await page.getByRole('button', { name: /Generate/i }).click();
  await page.waitForSelector('.pack-card');
  await page.getByRole('button', { name: 'Fork & Remix' }).first().click();
  
  // Queue should grow
  const queueAfter = page.locator('.workspace-queue-item');
  await expect(queueAfter).toHaveCount(countBefore + 1);
});

test('Filter sliders trigger pack regeneration', async ({ page }) => {
  await page.goto('/');
  
  // Get initial pack
  const packTitleBefore = await page.locator('.pack-card-title').first().textContent();
  
  // Drag tone slider to different value
  const toneSlider = page.locator('input[name="tone-slider"]');
  await toneSlider.evaluate((el: HTMLInputElement) => { el.value = '2'; el.dispatchEvent(new Event('change', { bubbles: true })) });
  
  // Wait for pack to regenerate
  await page.waitForTimeout(500);
  
  // Pack title should differ (high probability, not guaranteed)
  // Better: check that request was made
  const networkRequests = [];
  page.on('request', req => {
    if (req.url().includes('/api/mode-pack')) networkRequests.push(req);
  });
});

test('Keyboard shortcut: Ctrl+K toggles theme', async ({ page }) => {
  await page.goto('/');
  const root = page.locator('body');
  
  const classBefore = await root.getAttribute('class');
  
  await page.keyboard.press('Control+K');
  
  const classAfter = await root.getAttribute('class');
  expect(classAfter).not.toBe(classBefore);
});
```

Add tests when changing major UI flows or adding new interactive components. Capture screenshots with `page.screenshot()` for visual regression.

### Debugging Strategies

**For pack generation issues**:
1. Check backend logs in `npm run dev` terminal — service calls logged
2. Inspect DevTools Network tab; look at POST `/api/mode-pack` request/response
3. Add `console.log()` in `generateModePack()` to trace filter application
4. If a service returns unexpected data, check its mock (e.g., `memeMocks.ts`)
5. Test with explicit filter in curl:
   ```bash
   curl -X POST http://localhost:3001/api/mode-pack \
     -H "Content-Type: application/json" \
     -d '{"submode":"rapper","filters":{"timeframe":"fresh","tone":"funny","semantic":"wild"}}'
   ```

**For frontend rendering issues**:
1. Open browser DevTools → Components tab to inspect React tree
2. Check CSS in `frontend/src/App.css` for theme/accent mismatches
3. Verify API response shape matches types in `frontend/src/types.ts`
4. Look for console errors in DevTools Console tab
5. Use Playwright inspector to step through UI:
   ```bash
   npx playwright codegen http://localhost:5173 --output frontend/tests/debug.spec.ts
   ```

**For service/API issues**:
1. Check `.env` file exists and has keys (or verify mocks work without keys)
2. Test service directly by importing in `backend/src/example.ts` and running `npx ts-node src/example.ts`
3. Check rate limits; if hit, service silently falls back to mocks
4. Verify network access (proxy, firewall) doesn't block API endpoints
5. Add temporary logging in service try-catch:
   ```typescript
   catch (err) {
     console.error(`[${serviceName}] API failed:`, err.message, '— using mocks');
     return mocks[Math.floor(Math.random() * mocks.length)];
   }
   ```

## Common Tasks

### Debugging a Pack Generation Issue

1. Check logs in `npm run dev` terminal (backend logs all API calls)
2. Inspect browser DevTools Network tab; look at POST `/api/mode-pack` request/response
3. Add `console.log()` in `generateModePack()` to trace filter application
4. If a service returns unexpected data, check its mock (e.g., `memeMocks.ts`)
5. Test with explicit filter: `?timeframe=fresh&tone=funny&semantic=wild`

### Adding a New Mode Submode

1. Add to `MODE_DEFINITIONS` in `modePackGenerator.ts` and `FALLBACK_MODE_DEFINITIONS` in `App.tsx`
2. Add case in `generateModePack()` switch; return the appropriate pack type
3. Duplicate submode list in frontend for consistency
4. Test via `GET /dev/api/mode-definitions` to confirm it appears

### Changing Pack Structure

1. Update types in both `backend/src/types.ts` and `frontend/src/types.ts`
2. Populate new field in `generateModePack()`
3. Update any tests asserting pack shape
4. Render in `App.tsx` via `CollapsibleSection` or custom component
5. Run `npm test && npm run test:e2e` to validate

## Key Files at a Glance

| File | Purpose | Size |
|------|---------|------|
| `backend/src/index.ts` | Express routes, in-memory stores, mode definitions | 768 lines |
| `backend/src/modePackGenerator.ts` | Pack assembly, all mode logic, curated content | 680 lines |
| `backend/src/types.ts` | TypeScript interfaces (pack, service, filter types) | 175 lines |
| `backend/src/services/` | 8 API wrappers, each with mock fallbacks | ~100 lines each |
| `frontend/src/App.tsx` | UI, state, pack display, queue, remix flows | 3376 lines |
| `frontend/src/components/` | Sliders, collapsibles, toggles (reusable) | ~50–100 lines each |
| `frontend/tests/layout-flow.spec.ts` | E2E smoke test (list → detail → back) | ~50 lines |
| `backend/__tests__/api.test.ts` | Unit tests for HTTP routes and pack structure | ~50 lines |

---

**Last updated**: December 2025  
**Maintained by**: Team Inspire  
**For issues or questions**: Check `docs/IMPLEMENTATION_SUMMARY.md` and `README.md`
