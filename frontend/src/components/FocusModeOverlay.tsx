import React from 'react';

export interface FocusModeOverlayProps {
	isOpen: boolean;
	onClose: () => void;
	title?: string;
	children: React.ReactNode;
	showCloseButton?: boolean;
	ariaLabel?: string;
	ariaLabelledBy?: string;
	extended?: boolean;
}

/**
 * Unified Focus Mode Overlay Component
 * 
 * Provides consistent glass morphism design, backdrop blur animation,
 * and smooth entry animation for all focus modes (Word Explorer, Combined Focus, Pack Detail).
 * 
 * Features:
 * - Glass morphism styling with backdrop blur
 * - Smooth fade-in with scale/translate animation
 * - Centered overlay presentation
 * - Support for custom title and close button
 * - Keyboard support (Esc to close)
 * - Accessibility (aria-modal, aria-label)
 */
export function FocusModeOverlay({
	isOpen,
	onClose,
	title,
	children,
	showCloseButton = true,
	ariaLabel,
	ariaLabelledBy,
	extended = false
}: FocusModeOverlayProps) {
	React.useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && isOpen) {
				onClose();
			}
		};

		if (isOpen) {
			window.addEventListener('keydown', handleKeyDown);
			return () => window.removeEventListener('keydown', handleKeyDown);
		}
	}, [isOpen, onClose]);

	if (!isOpen) return null;

	const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	return (
		<div
			className="overlay-backdrop focus-mode-backdrop"
			role="dialog"
			aria-modal="true"
			aria-label={ariaLabel}
			aria-labelledby={ariaLabelledBy}
			onClick={handleBackdropClick}
		>
			<div className={`focus-mode-overlay glass${extended ? ' extended' : ''}`}>
				{(title || showCloseButton) && (
					<div className="overlay-header">
						{title && <h2>{title}</h2>}
						{showCloseButton && (
							<button
								type="button"
								className="icon-button"
								aria-label="Close focus mode"
								onClick={onClose}
								title="Close (Esc)"
							>
								✕
							</button>
						)}
					</div>
				)}
				<div className="focus-mode-content">
					{children}
				</div>
			</div>
		</div>
	);
}
