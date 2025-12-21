import React from 'react';

import { trackEvent } from '../../utils/analytics';

export interface CombinedFocusModeProps {
        mixerHover: boolean;
        combinedCount: number;
        onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
        onDragLeave: () => void;
        onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
        onClear: () => void;
        stream: React.ReactNode;
        actions?: React.ReactNode;
        onKeyboardAdd?: () => boolean | void;
        className?: string;
}

export function CombinedFocusMode({
        mixerHover,
        combinedCount,
        onDragOver,
        onDragLeave,
        onDrop,
        onClear,
        stream,
        actions,
        onKeyboardAdd,
        className
}: CombinedFocusModeProps) {
        const dropHelpId = React.useId();

        const handleDragOverEvent = (event: React.DragEvent<HTMLDivElement>) => {
                onDragOver(event);
                trackEvent('combined_focus_drag_over');
        };

        const handleDragLeaveEvent = () => {
                onDragLeave();
                trackEvent('combined_focus_drag_leave');
        };

        const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                const accepted = onKeyboardAdd?.();
                trackEvent('combined_focus_keyboard_add', { accepted });
        };

        const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
                event.preventDefault();
                onDrop(event);
                trackEvent('combined_focus_drop', { total: combinedCount + 1 });
        };

        return (
                <div
                        className={`${className ? `${className} ` : ''}combined-focus glass${mixerHover ? ' hover' : ''}`}
                        onDragOver={handleDragOverEvent}
                        onDragLeave={handleDragLeaveEvent}
                        onDrop={handleDrop}
                        aria-describedby={dropHelpId}
                >
                        {stream}
                        <div className="combined-focus-header">
                                <div>
                                        <p className="label">Combined focus</p>
                                        <h3>Drop pack cards to mix</h3>
                                        <p id={dropHelpId} className="hint">
                                                Drag cards or focus this area and press Enter/Space to mix the selected card.
                                        </p>
                                </div>
                                <div className="mixer-actions">
                                        {actions}
                                        <button
                                                type="button"
                                                className="btn ghost micro"
                                                onClick={() => {
                                                        onClear();
                                                        trackEvent('combined_focus_clear');
                                                }}
                                                title="Remove all cards from the combined mix"
                                        >
                                                Clear
                                        </button>
                                </div>
                        </div>
                        <div
                                className={`combined-drop${mixerHover ? ' hover' : ''}`}
                                aria-label="Combined focus drop area"
                                role="button"
                                tabIndex={0}
                                title="Drop or confirm a pack card to add it to the combined focus stream"
                                onKeyDown={handleKeyDown}
                                onDragOver={handleDragOverEvent}
                                onDragLeave={handleDragLeaveEvent}
                                onDrop={handleDrop}
                        >
                                <span className="drop-instruction">Drop pack cards here</span>
                                <span className="drop-sub" aria-live="polite">
                                        {combinedCount ? `${combinedCount} added` : 'Drag from the pack deck to build this mix.'}
                                </span>
                        </div>
                </div>
        );
}
