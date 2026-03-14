import type { CollabVisualizationResponse } from '../types';

export async function fetchCollabVisualization(roomCode: string, limit = 300): Promise<CollabVisualizationResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await fetch(`/api/collab/${encodeURIComponent(roomCode)}/visualization?${params.toString()}`, {
    credentials: 'include'
  });

  if (!response.ok) {
    const detail = await response.text();
    try {
      const parsed = JSON.parse(detail) as { error?: string; message?: string };
      throw new Error(parsed.message || parsed.error || `Failed to fetch collaboration visualization: ${response.status}`);
    } catch {
      throw new Error(detail || `Failed to fetch collaboration visualization: ${response.status}`);
    }
  }

  return (await response.json()) as CollabVisualizationResponse;
}
