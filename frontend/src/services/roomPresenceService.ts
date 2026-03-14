import type { RoomPresenceResponse } from '../types';

export async function fetchRoomPresence(roomCode: string): Promise<RoomPresenceResponse> {
  const response = await fetch(`/api/rooms/${encodeURIComponent(roomCode)}/instances`, {
    credentials: 'include'
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Failed to fetch room presence: ${response.status}`);
  }

  return (await response.json()) as RoomPresenceResponse;
}
