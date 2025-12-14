import { CollapsibleSection } from '../CollapsibleSection';

export interface LyricistWorkspaceBaseProps {
	submode: 'rapper' | 'singer';
}

export function LyricistWorkspaceBase({ submode }: LyricistWorkspaceBaseProps) {
	const isRapper = submode === 'rapper';
	return (
		<div className="legacy-pack">
			<h3>{isRapper ? 'Rapper workspace' : 'Singer workspace'}</h3>
			<p className="summary">
				This is your base layout. Generate a pack to fill in live content.
			</p>
			<div className="legacy-columns">
				<div>
					<CollapsibleSection
						title={isRapper ? 'Power Words + Word Lab' : 'Power Words + Motifs'}
						icon="🔤"
						description="Your vocabulary shelf for the session."
						defaultOpen
					>
						<div className="word-grid">
							<span className="word-chip">(generated words appear here)</span>
							<span className="word-chip">(clickable word lab chips)</span>
							<span className="word-chip">(add your own words)</span>
						</div>
					</CollapsibleSection>
					{isRapper && (
						<CollapsibleSection title="Rhyme Families" icon="🎯" description="Rhyming clusters for quick multis." defaultOpen>
							<ul className="detail-list">
								<li>(rhyme families render here)</li>
								<li>(near rhymes + perfect rhymes)</li>
							</ul>
						</CollapsibleSection>
					)}
					<CollapsibleSection title={isRapper ? 'Flow Prompts' : 'Vocal Prompts'} icon="🎙️" description="Cadence and delivery targets." defaultOpen>
						<ul className="detail-list">
							<li>(short, actionable prompts appear here)</li>
							<li>(timing, pockets, phrasing)</li>
						</ul>
					</CollapsibleSection>
				</div>
				<div>
					<CollapsibleSection title="Story Arc" icon="🫀" description="Emotional progression for the take." defaultOpen>
						<ul className="detail-list">
							<li>(start)</li>
							<li>(middle)</li>
							<li>(end)</li>
						</ul>
					</CollapsibleSection>
					<CollapsibleSection title={isRapper ? 'News Hook + Topic Challenge' : 'Theme + Hook'} icon="📰" description="A topical seed to flip into lyrics." defaultOpen>
						<ul className="detail-list">
							<li>(headline + context)</li>
							<li>(topic challenge)</li>
						</ul>
					</CollapsibleSection>
					<CollapsibleSection title="Lyric Fragments" icon="🧩" description="Starting lines to build from." defaultOpen={false}>
						<ul className="detail-list">
							<li>(fragment 1)</li>
							<li>(fragment 2)</li>
							<li>(fragment 3)</li>
						</ul>
					</CollapsibleSection>
				</div>
			</div>
		</div>
	);
}
