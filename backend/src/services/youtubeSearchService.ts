import * as yt from 'youtube-search-without-api-key';

export interface YouTubeSearchResult {
  id: string;
  videoId: string;
  title: string;
  url: string;
  description?: string;
  thumbnail?: string;
  channelTitle?: string;
}

/**
 * Search YouTube without an API key using the youtube-search-without-api-key library.
 * Returns a filtered list of playable video results.
 */
export async function searchYoutubeKeyless(query: string, limit: number = 5): Promise<YouTubeSearchResult[]> {
  try {
    // youtube-search-without-api-key returns {id: {videoId}, title, url, description, thumbnail, channelTitle, ...}
    const results = await yt.search(query);
    
    if (!Array.isArray(results) || results.length === 0) {
      return [];
    }

    // Extract and normalize results
    return results
      .slice(0, Math.max(2, Math.min(50, limit)))
      .map((result: any) => ({
        id: result.id?.videoId || result.videoId || '',
        videoId: result.id?.videoId || result.videoId || '',
        title: result.title || 'Untitled',
        url: result.url || `https://www.youtube.com/watch?v=${result.id?.videoId || result.videoId}`,
        description: result.description || '',
        thumbnail: result.thumbnail || '',
        channelTitle: result.channelTitle || result.author || 'Unknown'
      }))
      .filter(v => v.videoId && v.videoId.length > 0);
  } catch (err) {
    console.error('YouTube keyless search error:', err);
    return [];
  }
}

/**
 * Build a contextual YouTube search query based on pack metadata and filters.
 * Example: "deep lofi hip hop instrumental" or "experimental electronic beat"
 */
export function buildYoutubeQuery(packTitle: string, mode: string, genre?: string, tone?: string, semantic?: string): string {
  const modeWord = mode === 'lyricist' ? 'rap' : mode === 'producer' ? 'beat' : 'editing';
  const toneWord = tone === 'funny' ? 'funny' : tone === 'deep' ? 'deep' : 'dark';
  const semanticWord = semantic === 'wild' ? 'experimental' : semantic === 'tight' ? 'focused' : 'balanced';
  const genreTag = genre ? genre.toLowerCase() : 'lo-fi';

  // Build a contextual query that pulls in relevant results
  const parts = [semanticWord, toneWord, genreTag, `${modeWord} instrumental`];
  return parts.filter(Boolean).join(' ');
}
