import type { CSSProperties, DragEvent as ReactDragEvent, ReactNode } from 'react';

import type { FuelPack, InspireAnyPack, ModePack, WorkspaceQueueItem } from '../../types';

export interface SparkDeckCard {
	id: string;
	label: string;
	preview: string;
	detail: ReactNode;
	accent?: string;
}

export interface SparkHeaderChip {
	type: WorkspaceQueueItem['type'] | 'powerWord' | 'instrument' | 'headline' | 'meme' | 'sample' | string;
	label: string;
	index?: number;
}

export interface SparkSessionPanelProps {
	packAnimationKey: number;
	packStageClassName: string;
	fuelPack: InspireAnyPack | null;
	isModePack: (pack: InspireAnyPack | null) => pack is ModePack;
	getPackId: (pack: InspireAnyPack) => string;

	showingDetail: boolean;
	selectedCard: SparkDeckCard | null;
	headerChips: SparkHeaderChip[];

	onBackToPackList: () => void;
	onOpenChipPicker: (chip: { type: 'powerWord' | 'instrument' | 'headline' | 'meme' | 'sample'; index?: number }) => void;

	expandedCard: string | null;
	setExpandedCard: (id: string | null) => void;
	orderedPackDeck: SparkDeckCard[];
	draggedCardId: string | null;
	onCardDragStart: (cardId: string) => (event: ReactDragEvent<HTMLButtonElement>) => void;
	onCardDragEnter: (cardId: string) => (event: ReactDragEvent<HTMLButtonElement>) => void;
	onCardDragOver: (event: ReactDragEvent<HTMLButtonElement>) => void;
	onCardDragEnd: () => void;

	showFocusMixer: boolean;
	mixerHover: boolean;
	combinedFocusCount: number;
	onMixerDragOver: (event: ReactDragEvent<HTMLDivElement>) => void;
	onMixerDragLeave: () => void;
	onMixerDrop: (event: ReactDragEvent<HTMLDivElement>) => void;
	onClearCombined: () => void;
	onOpenCombinedFocus: () => void;

	renderPackDetail: (inFocusMode: boolean) => ReactNode;
	focusMode: boolean;

	emptyState: ReactNode;
}

export function SparkSessionPanel({
	packAnimationKey,
	packStageClassName,
	fuelPack,
	isModePack,
	getPackId,
	showingDetail,
	selectedCard,
	headerChips,
	onBackToPackList,
	onOpenChipPicker,
	expandedCard,
	setExpandedCard,
	orderedPackDeck,
	draggedCardId,
	onCardDragStart,
	onCardDragEnter,
	onCardDragOver,
	onCardDragEnd,
	showFocusMixer,
	mixerHover,
	combinedFocusCount,
	onMixerDragOver,
	onMixerDragLeave,
	onMixerDrop,
	onClearCombined,
	onOpenCombinedFocus,
	renderPackDetail,
	focusMode,
	emptyState
}: SparkSessionPanelProps) {
	return (
		<section key={packAnimationKey} className={packStageClassName}>
			{fuelPack ? (
				<>
					{isModePack(fuelPack) && (
						<header className={`pack-header${showingDetail ? ' detail-open' : ''}`}>
							<div className="pack-header-main">
								{showingDetail && (
									<button type="button" className="btn ghost micro back-to-list" onClick={onBackToPackList}>
										← Back to list
									</button>
								)}
								<p className="pack-id">#{getPackId(fuelPack)}</p>
								<h3>{showingDetail && selectedCard ? selectedCard.label : fuelPack.title}</h3>
								<p className="summary">{showingDetail && selectedCard ? `Pack: ${fuelPack.title}` : fuelPack.summary}</p>
							</div>
							<div className="chips">
								{headerChips.length
									? headerChips.map((chip, index) => (
										<button
											key={`${chip.type}-${index}-${chip.label}`}
											type="button"
											className="chip interactive"
											onClick={() => onOpenChipPicker({ type: chip.type as any, index: chip.index })}
										>
											{chip.label}
										</button>
									))
									: (
										<>
											<span className="chip">{fuelPack.filters.timeframe}</span>
											<span className="chip">{fuelPack.filters.tone}</span>
											<span className="chip">{fuelPack.filters.semantic}</span>
										</>
									)}
							</div>
						</header>
					)}

					{!isModePack(fuelPack) && (
						<div className="legacy-pack">
							<h3>Legacy Fuel Pack</h3>
							<p className="summary">This pack was created with an earlier Inspire generator.</p>
							<div className="legacy-columns">
								<div>
									<h4>Words</h4>
									<div className="word-grid">
										{(fuelPack as FuelPack).words.map((word) => (
											<span key={word} className="word-chip">{word}</span>
										))}
									</div>
								</div>
								<div>
									<h4>Memes</h4>
									<div className="word-grid">
										{(fuelPack as FuelPack).memes.map((meme) => (
											<span key={meme} className="word-chip">{meme}</span>
										))}
									</div>
								</div>
							</div>
						</div>
					)}

					{isModePack(fuelPack) && (
						<>
							{!showingDetail && (
								<div className="pack-deck" role="list">
									{orderedPackDeck.map((card, index) => (
										<button
											key={card.id}
											type="button"
											role="listitem"
											data-card-id={card.id}
											className={`pack-card${expandedCard === card.id ? ' active' : ''}`}
											draggable
											onDragStart={onCardDragStart(card.id)}
											onDragEnter={onCardDragEnter(card.id)}
											onDragOver={onCardDragOver}
											onDragEnd={onCardDragEnd}
											onClick={() => setExpandedCard(card.id)}
											style={{ '--card-index': index } as CSSProperties}
											aria-expanded={expandedCard === card.id}
										>
											<span className="card-label">
												{card.label}
												{draggedCardId === card.id && <span className="snap-indicator" aria-hidden="true">⇕</span>}
											</span>
											<span className="card-preview">{card.preview}</span>
										</button>
									))}
								</div>
							)}
							{showFocusMixer && (
								<section
									className={`focus-mixer glass${mixerHover ? ' hover' : ''}`}
									onDragOver={onMixerDragOver}
									onDragLeave={onMixerDragLeave}
									onDrop={onMixerDrop}
								>
									<div className="focus-mixer-header">
										<div>
											<p className="label">Combined focus</p>
											<h4>Drop pack cards to mix</h4>
										</div>
										<div className="mixer-actions">
											<button type="button" className="btn tertiary micro" onClick={onClearCombined}>Clear</button>
											<button type="button" className="btn secondary micro" onClick={onOpenCombinedFocus}>
												Open focus mode
											</button>
										</div>
									</div>
									<div className={`combined-drop${mixerHover ? ' hover' : ''}`} aria-label="Combined focus drop area">
										<span className="drop-instruction">Drop pack cards here</span>
										<span className="drop-sub">{combinedFocusCount ? `${combinedFocusCount} added` : 'Drag from the pack deck to build this mix.'}</span>
									</div>
								</section>
							)}
							{selectedCard && !focusMode && renderPackDetail(false)}
						</>
					)}
				</>
			) : (
				emptyState
			)}
		</section>
	);
}
