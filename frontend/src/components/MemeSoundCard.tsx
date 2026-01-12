import { useCallback, useRef, useState } from 'react';
import type { MemeSound } from '../types';

interface MemeSoundCardProps {
	memeSound?: MemeSound;
}

export function MemeSoundCard({ memeSound }: MemeSoundCardProps) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const audioRef = useRef<HTMLAudioElement | null>(null);

	const handlePlay = useCallback(async () => {
		if (!memeSound?.sampleUrl) {
			setError('No audio URL available for this sound.');
			return;
		}

		try {
			setIsLoading(true);
			setError(null);

			// If audio is already loaded and playing, stop it
			if (audioRef.current && isPlaying) {
				audioRef.current.pause();
				audioRef.current.currentTime = 0;
				setIsPlaying(false);
				setIsLoading(false);
				return;
			}

			// If audio is already loaded but paused, play it
			if (audioRef.current && audioRef.current.src) {
				audioRef.current.play();
				setIsPlaying(true);
				setIsLoading(false);
				return;
			}

			// Create new audio element and attempt to play
			if (!audioRef.current) {
				audioRef.current = new Audio();
				audioRef.current.addEventListener('play', () => setIsPlaying(true));
				audioRef.current.addEventListener('pause', () => setIsPlaying(false));
				audioRef.current.addEventListener('ended', () => setIsPlaying(false));
				audioRef.current.addEventListener('error', (e) => {
					setError('Failed to load or play audio');
					setIsPlaying(false);
					console.error('Audio error:', e);
				});
			}

			// Try using backend proxy first (for soundboardguys)
			if (memeSound.sampleUrl.includes('soundboardguys.com')) {
				try {
					const response = await fetch(
						`/api/proxy-audio?url=${encodeURIComponent(memeSound.sampleUrl)}`,
						{ method: 'GET' }
					);
					if (response.ok) {
						const blob = await response.blob();
						const objectUrl = URL.createObjectURL(blob);
						audioRef.current.src = objectUrl;
						await audioRef.current.play();
						setIsPlaying(true);
						setIsLoading(false);
						return;
					}
				} catch (err) {
					console.warn('Backend proxy failed, trying direct playback', err);
				}
			}

			// Fallback: try direct playback
			audioRef.current.src = memeSound.sampleUrl;
			await audioRef.current.play();
			setIsPlaying(true);
		} catch (err) {
			setError('Unable to play sound. Try opening it in your browser.');
			console.error('Playback error:', err);
		} finally {
			setIsLoading(false);
		}
	}, [memeSound, isPlaying]);

	if (!memeSound) {
		return <p className="hint">No sound available for this pack.</p>;
	}

	return (
		<div className="meme-sound-card">
			<div className="card-detail-copy">
				<p>
					<strong>{memeSound.name}</strong>
				</p>
				<p>{memeSound.description}</p>
				<div className="meme-sound-actions">
					<button
						type="button"
						className={`btn micro ${isPlaying ? 'playing' : ''}`}
						onClick={handlePlay}
						disabled={isLoading || !memeSound.sampleUrl}
						aria-label={isPlaying ? 'Pause sound' : 'Play sound'}
						title={!memeSound.sampleUrl ? 'No audio URL available' : ''}
					>
						{isLoading ? '⏳ Loading…' : isPlaying ? '⏸ Pause' : '▶ Play'}
					</button>
					{memeSound.sampleUrl && (
						<a
							className="btn micro"
							href={memeSound.sampleUrl}
							target="_blank"
							rel="noreferrer"
							title="Open in new window"
						>
							Open
						</a>
					)}
				</div>
				{error && <p className="error" style={{ marginTop: '8px' }}>{error}</p>}
			</div>
		</div>
	);
}
