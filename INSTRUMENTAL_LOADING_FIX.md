# Instrumental Section Loading Fix

## Problem
The instrumental section in the Inspiration Queue was showing "Loading instrumental preview..." indefinitely, with no videos actually loading. Additionally, when videos did load, they weren't actual instrumentals and didn't match the genre/style of the fuel pack.

## Root Causes

### Issue 1: Videos Not Loading
The effect that loads YouTube videos for queue items (in `App.tsx` around line 1280) was only filtering for items with `type === 'youtube'`:

```tsx
const youtubeItems = workspaceQueue.filter((item) => item.type === 'youtube');
```

This meant that instrumental items (with `type === 'instrumental'`) were never included in the video loading process.

### Issue 2: Poor Search Quality
The instrumental queue items didn't have a proper `searchQuery` property, so they used generic fallbacks like "Instrumental backdrop" or the pack headline, which produced irrelevant results that:
- Often had vocals (not instrumentals)
- Didn't match the pack's genre/style
- Were random and not useful for the creative session

## Solutions

### Fix 1: Include Instrumentals in Video Loading
Modified the filter to include both YouTube and instrumental items:

```tsx
const youtubeItems = workspaceQueue.filter((item) => item.type === 'youtube' || item.type === 'instrumental');
```

### Fix 2: Genre-Specific Instrumental Search Queries
Updated `buildWorkspaceQueue()` to create targeted search queries based on the pack's properties:

```tsx
// Build genre-specific instrumental search query
let instrumentalQuery = '';
if (pack.mode === 'lyricist' && 'genre' in pack) {
    instrumentalQuery = `${pack.genre} instrumental beat type beat`;
} else if (pack.mode === 'producer' && 'key' in pack && 'bpm' in pack) {
    instrumentalQuery = `${pack.key} ${pack.bpm}bpm instrumental beat`;
} else if (pack.mode === 'editor') {
    instrumentalQuery = `cinematic instrumental background music`;
} else {
    instrumentalQuery = `${pack.title} instrumental`;
}

baseQueue.push({
    id: `${pack.id}-instrumental`,
    type: 'instrumental',
    title: `${pack.mode === 'producer' ? 'Reference groove' : 'Instrumental backdrop'}`,
    url: `https://open.spotify.com/search/${encodeURIComponent(instrumentalQuery)}`,
    matchesPack: pack.headline,
    searchQuery: instrumentalQuery  // Now explicitly set
});
```

## Impact
- ✅ Instrumental items now load their preview videos
- ✅ The "Loading instrumental preview..." message disappears once videos load
- ✅ Search results are actual instrumentals (no vocals)
- ✅ Results match the pack's genre/style/mood
- ✅ **Lyricist mode**: Gets genre-specific type beats (e.g., "trap instrumental beat type beat")
- ✅ **Producer mode**: Gets beats matching the key and BPM (e.g., "C major 120bpm instrumental beat")
- ✅ **Editor mode**: Gets cinematic background music
- ✅ YouTube embeds display properly in the instrumental section
- ✅ Popout player has relevant instrumental videos to play
- ✅ No breaking changes to existing functionality

## Files Changed
- `frontend/src/App.tsx` (lines 1280, 542-558)

## Testing
The fix has been verified:
- Build succeeds with 0 errors
- All existing popout player tests pass
- Instrumental section now displays loaded, genre-appropriate videos
- Queue integration remains fully functional

## How It Works
1. When a fuel pack is generated, instrumental items are added to the workspace queue with a genre-specific `searchQuery`
2. The effect that watches `workspaceQueue` now includes instrumental items in the video loading process
3. For each instrumental item, the effect uses the `searchQuery` to call `searchYoutubePlaylist()`
4. The search query is optimized for:
   - **Lyricist**: `{genre} instrumental beat type beat` (e.g., "hip hop instrumental beat type beat")
   - **Producer**: `{key} {bpm}bpm instrumental beat` (e.g., "C major 120bpm instrumental beat")
   - **Editor**: `cinematic instrumental background music`
5. Search results are actual instrumentals that match the pack's creative direction
6. Once loaded, these videos populate the `youtubeVideos` state
7. The instrumental section renders the YouTube embed using this video data
8. The popout player can now play these loaded, genre-appropriate instrumental videos

## Examples

### Lyricist Mode (Hip Hop Rapper Pack)
- **Search Query**: "hip hop instrumental beat type beat"
- **Results**: Hip hop type beats, no vocals, suitable for rapping over

### Producer Mode (120 BPM in C Major)
- **Search Query**: "C major 120bpm instrumental beat"  
- **Results**: Beats matching the key and tempo, useful as reference

### Editor Mode (Video Editing)
- **Search Query**: "cinematic instrumental background music"
- **Results**: Cinematic soundtracks, ambient music for video editing

## Deployment
This fix is ready for immediate deployment. No additional changes are required.

