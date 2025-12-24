import { useEffect, useRef, useState } from 'react';

interface Props {
  videoId: string; // initial video id (cue)
  playlist: string[]; // additional video ids
  title?: string;
  width?: number | string;
  height?: number | string;
  noteSelector?: string; // optional CSS selector to write pruned note next to title
}

// Loads IFrame API once per page
function useYouTubeApi() {
  const [ready, setReady] = useState<boolean>(false);
  const initializedRef = useRef(false);
  
  useEffect(() => {
    // Skip if already initialized to prevent multiple hook calls
    if (initializedRef.current) {
      return;
    }
    initializedRef.current = true;
    
    const w = window as any;
    if (w.YT && w.YT.Player) {
      setReady(true);
      return;
    }
    
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]') as HTMLScriptElement | null;
    if (!existing) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      document.head.appendChild(tag);
    }
    
    // Store the callback with error handling
    const originalReady = w.onYouTubeIframeAPIReady;
    w.onYouTubeIframeAPIReady = () => {
      try {
        setReady(true);
      } catch (error) {
        console.warn('Error in onYouTubeIframeAPIReady:', error);
      }
      // Call the original callback if there was one
      if (originalReady) originalReady();
    };
  }, []);
  
  return ready;
}

/**
 * Embeds a resilient playlist player. If a video errors, it will be pruned and playback continues.
 */
export default function YouTubePlaylistEmbed({ videoId, playlist, title, width = '100%', height = 220, noteSelector }: Props) {
  const apiReady = useYouTubeApi();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const [ids, setIds] = useState<string[]>([videoId, ...playlist].filter(Boolean));
  const [prunedCount, setPrunedCount] = useState<number>(0);
  useWritePrunedNote(prunedCount, noteSelector);

  // Update player ids when props change (e.g., user selects a new main track)
  useEffect(() => {
		const newIds = [videoId, ...playlist].filter(Boolean);
		// Only update if the IDs actually changed
		if (newIds.length !== ids.length || newIds.some((id, i) => id !== ids[i])) {
			setIds(newIds);
		}
	}, [videoId, playlist, ids]);

	useEffect(() => {
		if (!apiReady || !containerRef.current || !ids.length) return;
    const w = window as any;

    // Destroy existing player if any
    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch {}
      playerRef.current = null;
    }

    const onError = () => {
      // error codes: https://developers.google.com/youtube/iframe_api_reference#Events
      const currentId = playerRef.current?.getVideoData?.()?.video_id as string | undefined;
      if (!currentId) return;
      // Remove the failing id and rebuild playlist
      setIds(prev => {
        const next = prev.filter(id => id !== currentId);
        // Re-cue remaining
        if (next.length && playerRef.current) {
          playerRef.current.cueVideoById(next[0]);
          if (next.length > 1) playerRef.current.loadPlaylist(next.slice(1));
        }
        setPrunedCount(c => c + 1);
        return next;
      });
    };

    const playerVars = {
      autoplay: 0,
      playsinline: 1,
      modestbranding: 1,
      rel: 0,
      origin: window.location.origin,
    } as const;

    playerRef.current = new w.YT.Player(containerRef.current, {
      width: typeof width === 'number' ? String(width) : width,
      height: typeof height === 'number' ? String(height) : height,
      videoId: ids[0],
      events: {
        onError,
      },
      playerVars,
    });

    // Load playlist after initial creation
    const rest = ids.slice(1);
    if (rest.length) {
      try { playerRef.current.loadPlaylist(rest); } catch {}
    }
  }, [apiReady, width, height, ids]);

  return (
    <div className="yt-embed">
      <div ref={containerRef} title={title || 'YouTube playlist preview'} />
      {prunedCount > 0 && (
        <div className="yt-embed-note" aria-live="polite">{prunedCount} track{prunedCount > 1 ? 's' : ''} skipped due to restrictions</div>
      )}
      <style>{`
        .yt-embed iframe { border: 0; border-radius: 12px; width: 100%; height: ${typeof height === 'number' ? height + 'px' : height}; }
        .yt-embed-note { margin-top: 6px; font-size: 12px; color: rgba(241,245,255,0.7); }
      `}</style>
    </div>
  );
}

// Write pruned note next to title when selector provided
export function useWritePrunedNote(prunedCount: number, noteSelector?: string) {
  useEffect(() => {
    if (!noteSelector) return;
    const el = document.querySelector(noteSelector) as HTMLSpanElement | null;
    if (!el) return;
    if (prunedCount > 0) {
      el.textContent = `${prunedCount} track${prunedCount > 1 ? 's' : ''} skipped`;
      el.style.marginLeft = '8px';
      el.style.fontSize = '12px';
      el.style.color = 'rgba(241,245,255,0.7)';
    } else {
      el.textContent = '';
    }
  }, [prunedCount, noteSelector]);
}
