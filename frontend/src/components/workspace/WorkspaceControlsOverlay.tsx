import type { CreativeMode, RelevanceFilter } from '../../types';
import { CollapsibleSection } from '../CollapsibleSection';
import { RelevanceSlider } from '../RelevanceSlider';

export interface GenreOption {
	label: string;
	value: string;
}

export interface WorkspaceControlsOverlayProps {
	mode: CreativeMode;
	filters: RelevanceFilter;
	setFilters: (next: RelevanceFilter) => void;
	genre: string;
	genres: GenreOption[];
	setGenre: (next: string) => void;
	lookupId: string;
	setLookupId: (next: string) => void;
	loadingLoad: boolean;
	onLoadById: () => void;
	onClose: () => void;
}

export function WorkspaceControlsOverlay({
	mode,
	filters,
	setFilters,
	genre,
	genres,
	setGenre,
	lookupId,
	setLookupId,
	loadingLoad,
	onLoadById,
	onClose
}: WorkspaceControlsOverlayProps) {
	return (
		<div className="workspace-controls-overlay" role="dialog" aria-modal="true" aria-label="Workspace controls" onClick={onClose}>
			<div className="workspace-controls" id="workspaceControls" onClick={(event) => event.stopPropagation()}>
				<div className="controls-overlay-header">
					<h3>Workspace Controls</h3>
					<button type="button" className="btn ghost micro" onClick={onClose}>Close</button>
				</div>
				<div className="controls-columns">
					<div className="controls-column left">
						<CollapsibleSection title="Relevance Blend" icon="🧭" description="Weight news, tone, and semantic distance." defaultOpen>
							<RelevanceSlider value={filters} onChange={setFilters} />
						</CollapsibleSection>
					</div>
					<div className="controls-column right">
						{mode === 'lyricist' && (
							<CollapsibleSection title="Genre Priority" icon="🎶" description="Tune the dataset toward a sonic lane." defaultOpen>
								<div className="option-group">
									{genres.map((option) => (
										<button
											key={option.value}
											type="button"
											className={option.value === genre ? 'chip active' : 'chip'}
											onClick={() => setGenre(option.value)}
										>
											{option.label}
										</button>
									))}
								</div>
							</CollapsibleSection>
						)}

						<CollapsibleSection title="Archive" icon="🗄️" description="Load any pack by id." defaultOpen={false}>
							<div className="lookup-inline">
								<input
									placeholder="Enter pack id to load"
									value={lookupId}
									onChange={(event) => setLookupId(event.target.value)}
								/>
								<button className="btn tertiary" type="button" onClick={onLoadById} disabled={!lookupId.trim() || loadingLoad}>
									{loadingLoad ? 'Loading…' : 'Load by ID'}
								</button>
							</div>
						</CollapsibleSection>
					</div>
				</div>
			</div>
		</div>
	);
}
