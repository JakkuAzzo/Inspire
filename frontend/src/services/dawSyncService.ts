import type {
  DAWSyncPushRequest,
  DAWSyncPushResponse,
  DAWSyncPullResponse
} from '../types';

export async function pushTrackState(payload: DAWSyncPushRequest): Promise<DAWSyncPushResponse> {
  const response = await fetch('/api/daw-sync/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (response.status === 409) {
    const body = await response.json();
    return {
      ok: false,
      conflict: true,
      current: body.current
    } as DAWSyncPushResponse;
  }

  if (!response.ok) {
    throw new Error(`DAW sync push failed: ${response.status}`);
  }

  return (await response.json()) as DAWSyncPushResponse;
}

export async function pullTrackState(
  roomCode: string,
  trackId: string,
  sinceVersion?: number
): Promise<DAWSyncPullResponse> {
  const params = new URLSearchParams({
    roomCode,
    trackId
  });

  if (typeof sinceVersion === 'number') {
    params.set('sinceVersion', String(sinceVersion));
  }

  const response = await fetch(`/api/daw-sync/pull?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`DAW sync pull failed: ${response.status}`);
  }

  return (await response.json()) as DAWSyncPullResponse;
}
