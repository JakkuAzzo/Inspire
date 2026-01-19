import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import inspireLogo from '../assets/Inspire_transparent_white.png';
import MouseParticles from '../components/MouseParticles';
import type { CreativeMode } from '../types';

interface HomeProps {
	onModeSelect: (mode: CreativeMode) => void;
	showModePicker: boolean;
	onToggleModePicker: () => void;
	expandedPeak: string | null;
	onPeakEnter: (peak: string | null) => void;
	liveSessions: Array<{ id: string; title: string; owner: string; participants: number }>;
	collaborativeSessions: Array<{ id: string; title: string; owner: string; participants: number }>;
	communityPosts: Array<{ id: string; author: string; content: string; createdAt: string; reactions: number; comments: number; remixCount: number }>;
	heroMetaContent: ReactNode;
	onSpectateSession: (sessionId: string) => void;
	onJoinSession: (sessionId: string) => void;
	onForkCommunityPost: (post: any) => void;
}

export function Home({
	onModeSelect,
	showModePicker,
	onToggleModePicker,
	expandedPeak,
	onPeakEnter,
	liveSessions,
	collaborativeSessions,
	communityPosts,
	heroMetaContent,
	onSpectateSession,
	onJoinSession,
	onForkCommunityPost
}: HomeProps) {
	const [hoveredCard, setHoveredCard] = useState<string | null>(null);
	const [modeCards] = useState([
		{
			id: 'lyricist' as const,
			label: 'Writer Lab',
			description: 'Storytelling, hooks, rhyme families, and emotions.',
			detailedDescription: 'Spin packs with power words, rhyme families, story arcs, emotional prompts, trending hooks from news/memes, and genre-specific inspiration. Perfect for rappers, singers, and songwriters looking for creative fuel.',
			packIncludes: [
				'Power words & phrases',
				'Rhyme families & sound-alikes',
				'Story arc prompts',
				'Emotional journey maps',
				'Trending news hooks',
				'Meme culture references'
			]
		},
		{
			id: 'producer' as const,
			label: 'Producer Lab',
			description: 'Samples, FX, constraints, and sonic experiments.',
			detailedDescription: 'Generate packs with curated samples, FX chains, key/tempo suggestions, instrumental snippets, and creative constraints. Built for musicians, samplers, and sound designers.',
			packIncludes: [
				'Curated audio samples',
				'FX chain ideas',
				'Key & tempo suggestions',
				'Instrumental references',
				'Creative production constraints',
				'Sonic texture prompts'
			]
		},
		{
			id: 'editor' as const,
			label: 'Editor Suite',
			description: 'Visual storytelling, pacing, and timeline beats.',
			detailedDescription: 'Create packs with visual references, color palettes, pacing guides, B-roll suggestions, and editorial prompts. Ideal for video editors, image editors, and audio post-production.',
			packIncludes: [
				'Visual reference images',
				'Color palette suggestions',
				'Pacing & rhythm guides',
				'B-roll & clip ideas',
				'Editorial constraints',
				'Timeline beat markers'
			]
		}
	]);

	const handleModeCardParallax = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
		const target = event.currentTarget;
		const rect = target.getBoundingClientRect();
		const pointerX = event.clientX - rect.left;
		const pointerY = event.clientY - rect.top;
		const centeredX = pointerX / rect.width - 0.5;
		const centeredY = pointerY / rect.height - 0.5;
		const rotateX = (centeredY * -1) * 16;
		const rotateY = centeredX * 18;
		target.style.setProperty('--tilt-x', `${rotateX}deg`);
		target.style.setProperty('--tilt-y', `${rotateY}deg`);
		target.style.setProperty('--glow-x', `${pointerX}px`);
		target.style.setProperty('--glow-y', `${pointerY}px`);
		target.classList.add('hovering');
	}, []);

	const handleModeCardLeave = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
		const target = event.currentTarget;
		target.style.removeProperty('--tilt-x');
		target.style.removeProperty('--tilt-y');
		target.style.removeProperty('--glow-x');
		target.style.removeProperty('--glow-y');
		target.classList.remove('hovering');
	}, []);

	return (
		<>
			<div className="home-background-logo" aria-hidden="true">
				<img src={inspireLogo} alt="" />
			</div>
			<MouseParticles particleCount={500} repelDistance={80} colors={['#ec4899', '#22d3ee', '#a855f7', '#8b5cf6', '#06b6d4', '#f472b6']} particleSize={2} />

			<div className="home-content">
				<header className="hero">
					<div className="hero-copy">
						<div className="hero-heading">
							<img src={inspireLogo} alt="Inspire" className="hero-logo" />
							<h1>Make Something</h1>
						</div>
						<p className="hero-tagline">Choose your creative studio and spin a fresh challenge.</p>
					</div>
					<div className="hero-meta glass">
						{heroMetaContent}
					</div>
				</header>

			{/* Three Separate Session Peaks */}
			<div className="session-peaks">
				{/* Spectate Live Peak */}
				<section 
					className={`session-peak glass ${expandedPeak === 'spectate' ? 'expanded' : ''}`}
					onMouseEnter={() => onPeakEnter('spectate')}
					onMouseLeave={() => onPeakEnter(null)}
				>
					<div className="session-peak-header">
						<h3>Spectate live</h3>
						<p>Jump into an active room.</p>
					</div>
					<ul className="session-peak-list">
						{liveSessions.map((session) => (
							<li key={session.id}>
								<div className="session-meta">
									<strong>{session.title}</strong>
									<span>{session.owner} · {session.participants} viewers</span>
								</div>
								<button type="button" className="btn micro" onClick={() => onSpectateSession(session.id)}>
									Spectate
								</button>
							</li>
						))}
					</ul>
				</section>

				{/* Join Collab Peak */}
				<section 
					className={`session-peak glass ${expandedPeak === 'collab' ? 'expanded' : ''}`}
					onMouseEnter={() => onPeakEnter('collab')}
					onMouseLeave={() => onPeakEnter(null)}
				>
					<div className="session-peak-header">
						<h3>Join a collab</h3>
						<p>Build alongside other artists.</p>
					</div>
					<ul className="session-peak-list">
						{collaborativeSessions.map((session) => (
							<li key={session.id}>
								<div className="session-meta">
									<strong>{session.title}</strong>
									<span>{session.owner} · {session.participants} creators</span>
								</div>
								<button type="button" className="btn micro halo" onClick={() => onJoinSession(session.id)}>
									Join
								</button>
							</li>
						))}
					</ul>
				</section>

				{/* Community Feed Peak */}
				<section 
					className={`session-peak glass ${expandedPeak === 'community' ? 'expanded' : ''}`}
					onMouseEnter={() => onPeakEnter('community')}
					onMouseLeave={() => onPeakEnter(null)}
				>
					<div className="session-peak-header">
						<h3>Community feed</h3>
						<p>Fresh remixes and drops.</p>
					</div>
					<ul className="session-peak-list">
						{communityPosts.slice(0, 4).map((post) => (
							<li key={post.id}>
								<div className="session-meta">
									<strong>{post.author}</strong>
									<span>{formatRelativeTime(post.createdAt)}</span>
								</div>
								<p className="session-snippet">{post.content.length > 120 ? `${post.content.slice(0, 120)}…` : post.content}</p>
								<button
									type="button"
									className="btn micro green"
									onClick={() => onForkCommunityPost(post)}
									title="Fork this pack into your studio"
								>
									Fork
								</button>
							</li>
						))}
					</ul>
				</section>
			</div>

				{showModePicker ? (
				<>
					<section className="mode-selector">
						{modeCards.map((entry) => (
							<div 
								key={entry.id} 
								className="mode-card-container"
								onMouseEnter={() => setHoveredCard(entry.id)}
								onMouseLeave={() => setHoveredCard(null)}
							>
								<button
									type="button"
									className="mode-card"
									onClick={() => onModeSelect(entry.id)}
									onPointerMove={handleModeCardParallax}
									onPointerLeave={handleModeCardLeave}
								>
									<span className="mode-card-glow" aria-hidden="true" />
									<h2 className={entry.id === 'lyricist' ? 'pulse-text' : ''}>{entry.label}</h2>
									<p>{entry.description}</p>
								</button>
								<div className={`mode-card-dropdown ${hoveredCard === entry.id ? 'visible' : ''}`}>
									<div className="mode-card-dropdown-content">
										<p className="dropdown-description">{entry.detailedDescription}</p>
										<div className="dropdown-pack-includes">
											<h4>Pack includes:</h4>
											<ul>
												{entry.packIncludes.map((item, idx) => (
													<li key={idx}>
														<span className="check-icon">✓</span> {item}
													</li>
												))}
											</ul>
										</div>
									</div>
								</div>
							</div>
						))}
					</section>
				</>
			) : (
				<div className="mode-gate-row">
					<div className="mode-gate">
						<button type="button" className="btn primary" onClick={onToggleModePicker}>
							Get Started - Pick a Lab
						</button>
					</div>
				</div>
			)}
			</div>
		</>
	);
}

function formatRelativeTime(timestamp: string): string {
	const base = new Date(timestamp);
	const diffMs = Date.now() - base.getTime();
	const diffMinutes = Math.floor(diffMs / (1000 * 60));
	if (diffMinutes < 1) return 'just now';
	if (diffMinutes < 60) return `${diffMinutes}m ago`;
	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) return `${diffHours}h ago`;
	const diffDays = Math.floor(diffHours / 24);
	return `${diffDays}d ago`;
}
