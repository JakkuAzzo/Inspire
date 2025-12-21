import React from 'react';

import { trackEvent } from '../../utils/analytics';
import { FocusModeOverlay } from '../FocusModeOverlay';

export interface CreatorSettingsModalProps {
        open: boolean;
        collaborationMode: 'solo' | 'live' | 'collaborative';
        viewerMode: 'idle' | 'spectating' | 'joining';
        statusLabel: string;
        autoRefreshMs: number | null;
        onClose: () => void;
        onCollaborationChange: (mode: 'solo' | 'live' | 'collaborative') => void;
        onAutoRefreshChange: (interval: number | null) => void;
        onLeaveViewer: () => void;
}

export function CreatorSettingsModal({
        open,
        collaborationMode,
        viewerMode,
        statusLabel,
        autoRefreshMs,
        onClose,
        onCollaborationChange,
        onAutoRefreshChange,
        onLeaveViewer
}: CreatorSettingsModalProps) {
        const statusId = React.useId();
        const handleCollabClick = (mode: 'live' | 'collaborative') => {
                onCollaborationChange(collaborationMode === mode ? 'solo' : mode);
                trackEvent('creator_settings_collaboration', { mode });
        };

        const handleAutoRefresh = (interval: number | null) => {
                onAutoRefreshChange(interval);
                trackEvent('creator_settings_auto_refresh', { interval });
        };

        return (
                <FocusModeOverlay
                        isOpen={open}
                        onClose={onClose}
                        title="Creator dashboard"
                        ariaLabel="Creator dashboard settings"
                >
                        <section className="settings-section" aria-label="Live studio controls">
                                <h3>Live studio</h3>
                                <div className="settings-collab-row">
                                        <div className="nav-status" aria-live="polite" id={statusId}>
                                                <span>{statusLabel}</span>
                                                {(viewerMode === 'spectating' || viewerMode === 'joining') && (
                                                        <button
                                                                type="button"
                                                                className="btn micro ghost"
                                                                onClick={() => {
                                                                        onLeaveViewer();
                                                                        trackEvent('creator_settings_leave_viewer');
                                                                }}
                                                        >
                                                                Leave
                                                        </button>
                                                )}
                                        </div>
                                        <div className="nav-toggle-group" role="group" aria-label="Collaboration mode">
                                                <button
                                                        type="button"
                                                        className={`nav-pill${collaborationMode === 'live' ? ' active' : ''}`}
                                                        aria-pressed={collaborationMode === 'live'}
                                                        aria-describedby={statusId}
                                                        title="Share your workspace as a live broadcast"
                                                        onClick={() => handleCollabClick('live')}
                                                >
                                                        Go Live
                                                </button>
                                                <button
                                                        type="button"
                                                        className={`nav-pill${collaborationMode === 'collaborative' ? ' active' : ''}`}
                                                        aria-pressed={collaborationMode === 'collaborative'}
                                                        aria-describedby={statusId}
                                                        title="Open a collaboration room"
                                                        onClick={() => handleCollabClick('collaborative')}
                                                >
                                                        Collaborate
                                                </button>
                                        </div>
                                </div>
                                <p className="hint">
                                        These toggles can be reached with the keyboard and persist between sessions for creators.
                                </p>
                        </section>

                        <section className="settings-section" aria-label="Automation settings">
                                <h3>Auto refresh cadence</h3>
                                <p className="hint">
                                        Choose how often your focus stream refreshes itself when a card is selected.
                                </p>
                                <div className="option-group" role="group" aria-label="Auto refresh timer">
                                        {[2000, 5000, 30000].map((interval) => (
                                                <button
                                                        key={interval}
                                                        type="button"
                                                        className={autoRefreshMs === interval ? 'chip active' : 'chip'}
                                                        aria-pressed={autoRefreshMs === interval}
                                                        onClick={() => handleAutoRefresh(interval)}
                                                >
                                                        {interval < 1000 ? `${interval}ms` : `${interval / 1000}s`}
                                                </button>
                                        ))}
                                        <button
                                                type="button"
                                                className={!autoRefreshMs ? 'chip active' : 'chip'}
                                                aria-pressed={!autoRefreshMs}
                                                onClick={() => handleAutoRefresh(null)}
                                        >
                                                Off
                                        </button>
                                </div>
                        </section>
                </FocusModeOverlay>
        );
}
