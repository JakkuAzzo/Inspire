# Meme Sound Card Enhancement - Playback Integration

## Summary

Enhanced the "Meme Sound" pack card with audio playback capabilities using the Web Audio API and a backend proxy service for handling external audio sources like soundboardguys.com.

## Changes Made

### 1. **Frontend Component** (`frontend/src/components/MemeSoundCard.tsx`)
- **New Component**: Created a reusable `MemeSoundCard` component that replaces inline card detail rendering
- **Playback Control**: Added a play/pause button with loading and error states
- **Audio Handling**:
  - Uses `HTMLAudioElement` for direct MP3 playback
  - Attempts backend proxy first for soundboardguys URLs
  - Falls back to direct playback if proxy is unavailable
  - Error messages if playback fails
- **State Management**:
  - `isPlaying`: Tracks whether audio is currently playing
  - `isLoading`: Shows loading state while fetching audio
  - `error`: Displays user-friendly error messages

### 2. **Backend Service** (`backend/src/index.ts`)
- **New Endpoint**: `GET /api/proxy-audio?url=<URL>`
  - Validates URLs to allow only soundboardguys.com sources
  - For soundboardguys **pages** (not direct MP3s):
    - Fetches the HTML page
    - Extracts the MP3 URL using regex
    - Downloads and streams the MP3 file
  - For direct MP3 URLs:
    - Streams directly with proper CORS headers
  - Sets cache headers (1 week) for performance
  - Returns `Content-Type: audio/mpeg` with CORS allowed

### 3. **App Integration** (`frontend/src/App.tsx`)
- Imported `MemeSoundCard` component
- Replaced inline meme sound card detail with component usage
- No functional changes to pack generation or state management

### 4. **Styling** (`frontend/src/App.css`)
- **New CSS Classes**:
  - `.meme-sound-card`: Container grid
  - `.meme-sound-actions`: Flex layout for play/open buttons
  - Button states: hover, disabled, playing (different colors)
  - Responsive button sizing with min-width

## How It Works

### User Flow
1. User views a lyricist pack and expands the "Meme Sound" card
2. Sees the sound name, description, and two buttons: "▶ Play" and "Open"
3. Clicks "▶ Play" → Component initiates audio playback
4. For soundboardguys URLs:
   - Frontend requests `POST /api/proxy-audio?url=<URL>`
   - Backend fetches the page, extracts MP3 URL, downloads MP3
   - Backend streams MP3 back to frontend with CORS headers
   - Frontend decodes and plays the MP3 locally
5. If proxy fails, falls back to direct playback (may fail due to CORS)
6. Button changes to "⏸ Pause" while playing
7. Clicking pause or sound ends → Button resets to "▶ Play"

### Caching Strategy
- Backend caches MP3s in browser cache (1 week TTL)
- Subsequent requests for same URL served from browser cache
- No local filesystem caching needed (handled by HTTP cache headers)

## Security & Limitations

### URL Validation
- Backend only allows `soundboardguys.com` and `cdn.soundboardguys.com`
- Other sources are rejected with 403 Forbidden
- Prevents SSRF attacks and abuse

### CORS Handling
- Frontend can't directly fetch from soundboardguys due to CORS
- Backend proxy adds `Access-Control-Allow-Origin: *`
- Allows cross-origin playback

### Supported Audio Sources
Currently only soundboardguys.com is whitelisted. To add more:
```typescript
const allowedHosts = ['soundboardguys.com', 'cdn.soundboardguys.com', 'example.com'];
```

## Testing

### Manual Testing
1. Start the dev server: `npm run dev`
2. Generate a lyricist pack
3. Open the "Meme Sound" card
4. Click the "▶ Play" button
5. Verify audio plays (if sampleUrl is set in mock data)
6. Click "⏸ Pause" to stop

### Expected Behavior
- ✅ Play button shows loading spinner while fetching
- ✅ Plays audio once loaded
- ✅ Button changes to pause state
- ✅ Open button still works for direct browser access
- ✅ Error message if audio can't be loaded

## Future Enhancements

1. **Playwright Integration** (Optional)
   - Use Playwright on backend for more robust soundboardguys extraction
   - Handles JavaScript-rendered content better
   - Currently uses regex on static HTML

2. **Volume Control**
   - Add a slider to control playback volume
   - Store preference in localStorage

3. **Download Option**
   - Add "Download MP3" button to cache locally
   - Uses filename from URL or sound name

4. **Multiple Audio Sources**
   - Add support for Freesound, YouTube SoundTrack, etc.
   - Whitelist more domains in backend

5. **Audio Visualization**
   - Show waveform or spectrum analyzer during playback
   - Uses Web Audio API AnalyserNode

## Files Modified

- ✅ `frontend/src/components/MemeSoundCard.tsx` (new)
- ✅ `frontend/src/App.tsx` (import + replace inline detail)
- ✅ `frontend/src/App.css` (meme sound styling)
- ✅ `backend/src/index.ts` (proxy endpoint)

## Status

- [x] Backend proxy endpoint created
- [x] Frontend component implemented
- [x] Styling added
- [x] TypeScript compilation passes
- [ ] Manual testing (pending user action)
- [ ] E2E tests (pending)
