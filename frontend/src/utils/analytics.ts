export interface AnalyticsPayload {
        [key: string]: unknown;
}

export function trackEvent(event: string, payload?: AnalyticsPayload) {
        const data = payload ?? {};

        try {
                const tracker = (globalThis as any)?.analytics?.track;
                if (typeof tracker === 'function') {
                        tracker(event, data);
                        return;
                }
        } catch (err) {
                console.warn('analytics tracking failed', err);
        }

        if (typeof console !== 'undefined') {
                console.info(`[analytics] ${event}`, data);
        }
}
