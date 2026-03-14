import { useEffect, useMemo, useState } from 'react';

type DashboardRoom = {
  id: string;
  roomCode?: string;
  roomPassword?: string;
  title: string;
  mode: string;
  submode: string;
  createdAt?: number;
  expiresAt?: number;
  status?: string;
  participants: number;
  viewers: number;
  active: boolean;
};

type DashboardResponse = {
  active: DashboardRoom[];
  inactive: DashboardRoom[];
  total: number;
};

function formatTime(value?: number): string {
  if (!value) return 'N/A';
  return new Date(value).toLocaleString();
}

export function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rooms, setRooms] = useState<DashboardResponse>({ active: [], inactive: [], total: 0 });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/sessions/my-rooms', { credentials: 'include' });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body?.error || body?.message || 'Unable to load dashboard rooms');
        }
        if (!cancelled) {
          setRooms({
            active: Array.isArray(body.active) ? body.active : [],
            inactive: Array.isArray(body.inactive) ? body.inactive : [],
            total: Number(body.total || 0)
          });
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Unable to load dashboard rooms');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const title = useMemo(() => `My Collaboration Rooms (${rooms.total})`, [rooms.total]);

  return (
    <main className="dashboard-page">
      <header className="dashboard-header glass">
        <div>
          <h1>{title}</h1>
          <p>Rooms created by your account, grouped by active and inactive status.</p>
        </div>
        <button type="button" className="btn secondary" onClick={() => window.location.assign('/')}>
          Back to Inspire
        </button>
      </header>

      {loading && <p className="hint">Loading your rooms...</p>}
      {error && <p className="hint error-text">{error}</p>}

      {!loading && !error && (
        <section className="dashboard-grid">
          <div className="dashboard-column glass">
            <h2>Active Rooms</h2>
            {rooms.active.length === 0 ? (
              <p className="hint">No active rooms.</p>
            ) : (
              <ul className="dashboard-room-list">
                {rooms.active.map((room) => (
                  <li key={room.id} className="dashboard-room-card">
                    <h3>{room.title}</h3>
                    <p><strong>Room:</strong> {room.roomCode || room.id}</p>
                    <p><strong>Password:</strong> {room.roomPassword || 'hidden'}</p>
                    <p><strong>Mode:</strong> {room.mode} / {room.submode}</p>
                    <p><strong>Participants:</strong> {room.participants} • <strong>Viewers:</strong> {room.viewers}</p>
                    <p><strong>Created:</strong> {formatTime(room.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="dashboard-column glass">
            <h2>Inactive Rooms</h2>
            {rooms.inactive.length === 0 ? (
              <p className="hint">No inactive rooms.</p>
            ) : (
              <ul className="dashboard-room-list">
                {rooms.inactive.map((room) => (
                  <li key={room.id} className="dashboard-room-card inactive">
                    <h3>{room.title}</h3>
                    <p><strong>Room:</strong> {room.roomCode || room.id}</p>
                    <p><strong>Password:</strong> {room.roomPassword || 'hidden'}</p>
                    <p><strong>Status:</strong> {room.status || 'inactive'}</p>
                    <p><strong>Created:</strong> {formatTime(room.createdAt)}</p>
                    <p><strong>Expired:</strong> {formatTime(room.expiresAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
