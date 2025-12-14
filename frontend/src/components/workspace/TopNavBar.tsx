import type { CreativeMode, InspireAnyPack, ModeDefinition, ModeSubmode } from '../../types';

export interface TopNavBarProps {
	mode: CreativeMode;
	activeModeDefinition: ModeDefinition | null;
	activeSubmodeDefinition: ModeSubmode | null;
	controlsToggleLabel: string;
	controlsCollapsed: boolean;
	loadingGenerate: boolean;
	fuelPack: InspireAnyPack | null;
	showShareDisabled?: boolean;

	onBackToModes: () => void;
	onGeneratePack: () => void;
	onSharePack: () => void;
	onSavePack: () => void;
	onOpenSaved: () => void;
	onOpenWordExplorer: () => void;
	onToggleWorkspaceControls: () => void;
	onOpenSettings: () => void;
}

export function TopNavBar({
	activeModeDefinition,
	activeSubmodeDefinition,
	controlsToggleLabel,
	controlsCollapsed,
	loadingGenerate,
	fuelPack,
	onBackToModes,
	onGeneratePack,
	onSharePack,
	onSavePack,
	onOpenSaved,
	onOpenWordExplorer,
	onToggleWorkspaceControls,
	onOpenSettings
}: TopNavBarProps) {
	return (
		<header className="top-nav glass">
			<div className="nav-left">
				<button className="back-button" type="button" onClick={onBackToModes}>
					← Studios
				</button>
				<div className="nav-title-block">
					<h2>{activeModeDefinition ? `${activeModeDefinition.icon} ${activeModeDefinition.label}` : 'Creative Studio'}</h2>
					{(activeSubmodeDefinition || activeModeDefinition) && (
						<p>{activeSubmodeDefinition?.description ?? activeModeDefinition?.description}</p>
					)}
				</div>
			</div>
			<div className="nav-actions">
				<div className="actions-group" role="group" aria-label="Workspace actions">
					<button
						type="button"
						className="icon-button"
						title="Generate fuel pack"
						aria-label="Generate fuel pack"
						onClick={onGeneratePack}
						disabled={loadingGenerate}
					>
						⚡
					</button>
					<button
						type="button"
						className="icon-button"
						title="Share pack link"
						aria-label="Share pack link"
						onClick={onSharePack}
						disabled={!fuelPack}
					>
						🔗
					</button>
					<button
						type="button"
						className="icon-button"
						title="Save to archive"
						aria-label="Save to archive"
						onClick={onSavePack}
						disabled={!fuelPack}
					>
						💾
					</button>
					<button
						type="button"
						className="icon-button"
						title="Open saved packs"
						aria-label="Open saved packs"
						onClick={onOpenSaved}
					>
						📁
					</button>
					<button
						type="button"
						className="icon-button"
						title="Word Explorer"
						aria-label="Open Word Explorer"
						onClick={onOpenWordExplorer}
					>
						🔤
					</button>
					<button
						type="button"
						className="icon-button"
						title={controlsToggleLabel}
						aria-label={controlsToggleLabel}
						aria-pressed={!controlsCollapsed}
						aria-controls="workspaceControls"
						onClick={onToggleWorkspaceControls}
					>
						🎛️
					</button>
				</div>
				<button
					type="button"
					className="nav-settings"
					aria-label="Open creator settings"
					onClick={onOpenSettings}
				>
					⚙️
				</button>
			</div>
		</header>
	);
}
