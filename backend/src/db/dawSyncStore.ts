import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { createId } from '../utils/id';
import type { DAWTrackState, DAWTrackChange } from '../types';

export interface DawSyncStoreConfig {
  dbPath?: string;
}

export interface DawTrackStateRow {
  roomCode: string;
  trackId: string;
  version: number;
  updatedAt: number;
  updatedBy?: string;
  state: DAWTrackState;
}

export interface DawTrackUpdateResult {
  status: 'updated' | 'conflict';
  current?: DawTrackStateRow;
  next?: DawTrackStateRow;
}

export class DawSyncStore {
  private db: Database.Database;

  constructor(private readonly config: DawSyncStoreConfig = {}) {
    const dbPath = config.dbPath ?? path.resolve(__dirname, '..', '..', 'data', 'local-sync.sqlite');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.ensureSchema();
  }

  private ensureSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS daw_track_states (
        room_code TEXT NOT NULL,
        track_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        updated_by TEXT,
        state_json TEXT NOT NULL,
        PRIMARY KEY (room_code, track_id)
      );
      CREATE TABLE IF NOT EXISTS daw_track_changes (
        id TEXT PRIMARY KEY,
        room_code TEXT NOT NULL,
        track_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        updated_by TEXT,
        state_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS daw_track_changes_lookup
        ON daw_track_changes (room_code, track_id, version);
    `);
  }

  getTrackState(roomCode: string, trackId: string): DawTrackStateRow | null {
    const row = this.db
      .prepare('SELECT room_code, track_id, version, updated_at, updated_by, state_json FROM daw_track_states WHERE room_code = ? AND track_id = ?')
      .get(roomCode, trackId) as {
        room_code: string;
        track_id: string;
        version: number;
        updated_at: number;
        updated_by: string | null;
        state_json: string;
      } | undefined;

    if (!row) return null;

    return {
      roomCode: row.room_code,
      trackId: row.track_id,
      version: row.version,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by ?? undefined,
      state: JSON.parse(row.state_json) as DAWTrackState
    };
  }

  listTrackStates(roomCode: string): DawTrackStateRow[] {
    const rows = this.db
      .prepare('SELECT room_code, track_id, version, updated_at, updated_by, state_json FROM daw_track_states WHERE room_code = ? ORDER BY track_id')
      .all(roomCode) as Array<{
        room_code: string;
        track_id: string;
        version: number;
        updated_at: number;
        updated_by: string | null;
        state_json: string;
      }>;

    return rows.map((row) => ({
      roomCode: row.room_code,
      trackId: row.track_id,
      version: row.version,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by ?? undefined,
      state: JSON.parse(row.state_json) as DAWTrackState
    }));
  }

  listChangesSince(roomCode: string, trackId: string, sinceVersion: number): DAWTrackChange[] {
    const rows = this.db
      .prepare(
        'SELECT id, room_code, track_id, version, updated_at, updated_by, state_json FROM daw_track_changes WHERE room_code = ? AND track_id = ? AND version > ? ORDER BY version'
      )
      .all(roomCode, trackId, sinceVersion) as Array<{
        id: string;
        room_code: string;
        track_id: string;
        version: number;
        updated_at: number;
        updated_by: string | null;
        state_json: string;
      }>;

    return rows.map((row) => ({
      id: row.id,
      roomCode: row.room_code,
      trackId: row.track_id,
      version: row.version,
      updatedAt: row.updated_at,
      updatedBy: row.updated_by ?? undefined,
      state: JSON.parse(row.state_json) as DAWTrackState
    }));
  }

  upsertTrackState(params: {
    roomCode: string;
    trackId: string;
    baseVersion: number | null;
    updatedBy?: string;
    state: DAWTrackState;
  }): DawTrackUpdateResult {
    const existing = this.getTrackState(params.roomCode, params.trackId);

    if (existing && params.baseVersion !== null && params.baseVersion !== existing.version) {
      return { status: 'conflict', current: existing };
    }

    const nextVersion = (existing?.version ?? 0) + 1;
    const now = Date.now();
    const statePayload: DAWTrackState = {
      ...params.state,
      roomCode: params.roomCode,
      trackId: params.trackId,
      updatedAt: now,
      updatedBy: params.updatedBy ?? params.state.updatedBy
    };
    const serialized = JSON.stringify(statePayload);

    const insertState = this.db.prepare(
      `INSERT INTO daw_track_states (room_code, track_id, version, updated_at, updated_by, state_json)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (room_code, track_id)
       DO UPDATE SET version = excluded.version, updated_at = excluded.updated_at, updated_by = excluded.updated_by, state_json = excluded.state_json`
    );

    const insertChange = this.db.prepare(
      `INSERT INTO daw_track_changes (id, room_code, track_id, version, updated_at, updated_by, state_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );

    const transaction = this.db.transaction(() => {
      insertState.run(params.roomCode, params.trackId, nextVersion, now, params.updatedBy ?? null, serialized);
      insertChange.run(createId('daw-change'), params.roomCode, params.trackId, nextVersion, now, params.updatedBy ?? null, serialized);
    });

    transaction();

    return {
      status: 'updated',
      next: {
        roomCode: params.roomCode,
        trackId: params.trackId,
        version: nextVersion,
        updatedAt: now,
        updatedBy: params.updatedBy,
        state: statePayload
      }
    };
  }
}

let store: DawSyncStore | null = null;

export function getDawSyncStore(config: DawSyncStoreConfig = {}) {
  if (!store) store = new DawSyncStore(config);
  return store;
}
