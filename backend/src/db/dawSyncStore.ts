import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { createId } from '../utils/id';
import type {
  DAWTrackState,
  DAWTrackChange,
  CollabPushDetails,
  CollabFileAssetInput,
  CollabPushAssetRecord,
  CollabPushEventRecord,
  CollabRoomMemberRecord,
  CollabEditType,
  CollabMidiSummary
} from '../types';

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

export interface CollabPushEventInsert {
  roomCode: string;
  trackId: string;
  version: number;
  updatedBy?: string;
  pluginInstanceId?: string;
  dawTrackIndex?: number;
  dawTrackName?: string;
  details?: CollabPushDetails;
  payload?: Record<string, unknown>;
  sourceRef?: string;
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

      CREATE TABLE IF NOT EXISTS collab_room_memberships (
        id TEXT PRIMARY KEY,
        room_code TEXT NOT NULL,
        user_id TEXT NOT NULL,
        username TEXT NOT NULL,
        role TEXT NOT NULL,
        joined_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS collab_push_events (
        id TEXT PRIMARY KEY,
        room_code TEXT NOT NULL,
        track_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        event_time INTEGER NOT NULL,
        updated_by TEXT,
        plugin_instance_id TEXT,
        daw_track_index INTEGER,
        daw_track_name TEXT,
        pushed_by_user_id TEXT,
        pushed_by_username TEXT,
        edit_type TEXT NOT NULL,
        track_beat REAL,
        duration_seconds REAL,
        file_types_json TEXT NOT NULL,
        fx_used_json TEXT,
        automation_lanes_json TEXT,
        midi_summary_json TEXT,
        notes TEXT,
        source TEXT NOT NULL,
        source_ref TEXT,
        payload_json TEXT
      );

      CREATE TABLE IF NOT EXISTS collab_push_assets (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        room_code TEXT NOT NULL,
        track_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_path TEXT,
        size_bytes INTEGER,
        duration_seconds REAL,
        checksum TEXT,
        metadata_json TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (event_id) REFERENCES collab_push_events(id)
      );
    `);

    this.ensureColumn('collab_push_events', 'source_ref', 'TEXT');

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS collab_push_events_room_source_ref
        ON collab_push_events (room_code, source_ref);

      CREATE INDEX IF NOT EXISTS collab_room_memberships_room_joined
        ON collab_room_memberships (room_code, joined_at);

      CREATE INDEX IF NOT EXISTS collab_push_events_room_event_time
        ON collab_push_events (room_code, event_time DESC);

      CREATE INDEX IF NOT EXISTS collab_push_events_room_track
        ON collab_push_events (room_code, track_id, event_time DESC);

      CREATE INDEX IF NOT EXISTS collab_push_events_room_instance
        ON collab_push_events (room_code, plugin_instance_id, event_time DESC);

      CREATE INDEX IF NOT EXISTS collab_push_assets_room_event
        ON collab_push_assets (room_code, event_id, created_at DESC);
    `);
  }

  private ensureColumn(tableName: string, columnName: string, columnDef: string): void {
    const columns = this.db
      .prepare(`PRAGMA table_info(${tableName})`)
      .all() as Array<{ name: string }>;
    const exists = columns.some((column) => column.name === columnName);
    if (!exists) {
      this.db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
    }
  }

  recordRoomMembership(params: {
    roomCode: string;
    userId: string;
    username: string;
    role: 'host' | 'collaborator' | 'viewer';
    joinedAt?: number;
  }): void {
    const joinedAt = params.joinedAt ?? Date.now();
    this.db
      .prepare(
        `INSERT INTO collab_room_memberships (id, room_code, user_id, username, role, joined_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        createId('collab-member'),
        params.roomCode,
        params.userId,
        params.username,
        params.role,
        joinedAt
      );
  }

  listRoomMemberships(roomCode: string): CollabRoomMemberRecord[] {
    const rows = this.db
      .prepare(
        `SELECT id, room_code, user_id, username, role, joined_at
         FROM collab_room_memberships
         WHERE room_code = ?
         ORDER BY joined_at ASC`
      )
      .all(roomCode) as Array<{
      id: string;
      room_code: string;
      user_id: string;
      username: string;
      role: 'host' | 'collaborator' | 'viewer';
      joined_at: number;
    }>;

    return rows.map((row) => ({
      id: row.id,
      roomCode: row.room_code,
      userId: row.user_id,
      username: row.username,
      role: row.role,
      joinedAt: row.joined_at
    }));
  }

  roomHasMembershipUser(roomCode: string, userId: string): boolean {
    const row = this.db
      .prepare('SELECT 1 AS ok FROM collab_room_memberships WHERE room_code = ? AND user_id = ? LIMIT 1')
      .get(roomCode, userId) as { ok: number } | undefined;
    return !!row?.ok;
  }

  roomHasUserActivity(roomCode: string, userId: string): boolean {
    const row = this.db
      .prepare('SELECT 1 AS ok FROM collab_push_events WHERE room_code = ? AND pushed_by_user_id = ? LIMIT 1')
      .get(roomCode, userId) as { ok: number } | undefined;
    return !!row?.ok;
  }

  recordPushEvent(params: CollabPushEventInsert): string {
    const id = createId('collab-push');
    const eventTime = Date.now();
    const details = params.details ?? {};
    const fileTypes = details.fileTypes ?? [];
    const source = details.source ?? 'vst';
    const editType: CollabEditType = details.editType ?? 'other';

    this.db
      .prepare(
        `INSERT INTO collab_push_events (
          id, room_code, track_id, version, event_time, updated_by,
          plugin_instance_id, daw_track_index, daw_track_name,
          pushed_by_user_id, pushed_by_username,
          edit_type, track_beat, duration_seconds, file_types_json,
          fx_used_json, automation_lanes_json, midi_summary_json,
          notes, source, source_ref, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        params.roomCode,
        params.trackId,
        params.version,
        eventTime,
        params.updatedBy ?? null,
        params.pluginInstanceId ?? null,
        params.dawTrackIndex ?? null,
        params.dawTrackName ?? null,
        details.pushedByUserId ?? null,
        details.pushedByUsername ?? null,
        editType,
        details.trackBeat ?? null,
        details.durationSeconds ?? null,
        JSON.stringify(fileTypes),
        details.fxUsed ? JSON.stringify(details.fxUsed) : null,
        details.automationLanes ? JSON.stringify(details.automationLanes) : null,
        details.midiSummary ? JSON.stringify(details.midiSummary) : null,
        details.notes ?? null,
        source,
        params.sourceRef ?? null,
        params.payload ? JSON.stringify(params.payload) : null
      );

    return id;
  }

  recordPushAssets(roomCode: string, trackId: string, eventId: string, assets: CollabFileAssetInput[]): CollabPushAssetRecord[] {
    if (!assets.length) return [];
    const now = Date.now();
    const insert = this.db.prepare(
      `INSERT INTO collab_push_assets (
        id, event_id, room_code, track_id, file_name, file_type, file_path,
        size_bytes, duration_seconds, checksum, metadata_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const records: CollabPushAssetRecord[] = [];
    const transaction = this.db.transaction(() => {
      for (const asset of assets) {
        const id = createId('collab-asset');
        insert.run(
          id,
          eventId,
          roomCode,
          trackId,
          asset.fileName,
          asset.fileType,
          asset.filePath ?? null,
          asset.sizeBytes ?? null,
          asset.durationSeconds ?? null,
          asset.checksum ?? null,
          asset.metadata ? JSON.stringify(asset.metadata) : null,
          now
        );
        records.push({
          id,
          eventId,
          roomCode,
          trackId,
          fileName: asset.fileName,
          fileType: asset.fileType,
          filePath: asset.filePath,
          sizeBytes: asset.sizeBytes,
          durationSeconds: asset.durationSeconds,
          metadata: asset.metadata,
          createdAt: now
        });
      }
    });

    transaction();
    return records;
  }

  listPushEventsByRoom(roomCode: string, options: { since?: number; limit?: number } = {}): CollabPushEventRecord[] {
    const since = options.since ?? 0;
    const limit = options.limit ?? 250;

    const rows = this.db
      .prepare(
        `SELECT
          id, room_code, track_id, version, event_time, updated_by,
          plugin_instance_id, daw_track_index, daw_track_name,
          pushed_by_user_id, pushed_by_username,
          edit_type, track_beat, duration_seconds, file_types_json,
          fx_used_json, automation_lanes_json, midi_summary_json,
          notes, source, source_ref, payload_json
         FROM collab_push_events
         WHERE room_code = ? AND event_time > ?
         ORDER BY event_time DESC
         LIMIT ?`
      )
      .all(roomCode, since, limit) as Array<{
      id: string;
      room_code: string;
      track_id: string;
      version: number;
      event_time: number;
      updated_by: string | null;
      plugin_instance_id: string | null;
      daw_track_index: number | null;
      daw_track_name: string | null;
      pushed_by_user_id: string | null;
      pushed_by_username: string | null;
      edit_type: CollabEditType;
      track_beat: number | null;
      duration_seconds: number | null;
      file_types_json: string;
      fx_used_json: string | null;
      automation_lanes_json: string | null;
      midi_summary_json: string | null;
      notes: string | null;
      source: 'vst' | 'web' | 'backfill';
      source_ref: string | null;
      payload_json: string | null;
    }>;

    const assetsByEvent = this.listPushAssetsByEventIds(rows.map((row) => row.id));

    return rows.map((row) => ({
      id: row.id,
      roomCode: row.room_code,
      trackId: row.track_id,
      version: row.version,
      eventTime: row.event_time,
      updatedBy: row.updated_by ?? undefined,
      pluginInstanceId: row.plugin_instance_id ?? undefined,
      dawTrackIndex: row.daw_track_index ?? undefined,
      dawTrackName: row.daw_track_name ?? undefined,
      pushedByUserId: row.pushed_by_user_id ?? undefined,
      pushedByUsername: row.pushed_by_username ?? undefined,
      editType: row.edit_type,
      trackBeat: row.track_beat ?? undefined,
      durationSeconds: row.duration_seconds ?? undefined,
      fileTypes: JSON.parse(row.file_types_json) as string[],
      fxUsed: row.fx_used_json ? (JSON.parse(row.fx_used_json) as string[]) : undefined,
      automationLanes: row.automation_lanes_json ? (JSON.parse(row.automation_lanes_json) as string[]) : undefined,
      midiSummary: row.midi_summary_json ? (JSON.parse(row.midi_summary_json) as CollabMidiSummary) : undefined,
      notes: row.notes ?? undefined,
      source: row.source,
      payload: row.payload_json ? (JSON.parse(row.payload_json) as Record<string, unknown>) : undefined,
      assets: assetsByEvent.get(row.id) ?? []
    }));
  }

  hasPushEventSourceRef(roomCode: string, sourceRef: string): boolean {
    const row = this.db
      .prepare('SELECT 1 AS ok FROM collab_push_events WHERE room_code = ? AND source_ref = ? LIMIT 1')
      .get(roomCode, sourceRef) as { ok: number } | undefined;
    return !!row?.ok;
  }

  listTrackIdsForRoom(roomCode: string): string[] {
    const rows = this.db
      .prepare('SELECT DISTINCT track_id FROM daw_track_changes WHERE room_code = ? ORDER BY track_id')
      .all(roomCode) as Array<{ track_id: string }>;
    return rows.map((row) => row.track_id);
  }

  listAllChangesForRoom(roomCode: string, trackId: string): DAWTrackChange[] {
    const rows = this.db
      .prepare(
        'SELECT id, room_code, track_id, version, updated_at, updated_by, state_json FROM daw_track_changes WHERE room_code = ? AND track_id = ? ORDER BY version'
      )
      .all(roomCode, trackId) as Array<{
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

  countPushEvents(roomCode: string): number {
    const row = this.db
      .prepare('SELECT COUNT(1) AS count FROM collab_push_events WHERE room_code = ?')
      .get(roomCode) as { count: number };
    return row.count;
  }

  getPushAssetById(assetId: string): CollabPushAssetRecord | null {
    const row = this.db
      .prepare(
        `SELECT
          id, event_id, room_code, track_id, file_name, file_type, file_path,
          size_bytes, duration_seconds, metadata_json, created_at
         FROM collab_push_assets
         WHERE id = ?
         LIMIT 1`
      )
      .get(assetId) as {
      id: string;
      event_id: string;
      room_code: string;
      track_id: string;
      file_name: string;
      file_type: string;
      file_path: string | null;
      size_bytes: number | null;
      duration_seconds: number | null;
      metadata_json: string | null;
      created_at: number;
    } | undefined;

    if (!row) return null;

    return {
      id: row.id,
      eventId: row.event_id,
      roomCode: row.room_code,
      trackId: row.track_id,
      fileName: row.file_name,
      fileType: row.file_type,
      filePath: row.file_path ?? undefined,
      sizeBytes: row.size_bytes ?? undefined,
      durationSeconds: row.duration_seconds ?? undefined,
      metadata: row.metadata_json ? (JSON.parse(row.metadata_json) as Record<string, unknown>) : undefined,
      createdAt: row.created_at
    };
  }

  private listPushAssetsByEventIds(eventIds: string[]): Map<string, CollabPushAssetRecord[]> {
    const map = new Map<string, CollabPushAssetRecord[]>();
    if (!eventIds.length) return map;

    const placeholders = eventIds.map(() => '?').join(',');
    const rows = this.db
      .prepare(
        `SELECT
          id, event_id, room_code, track_id, file_name, file_type, file_path,
          size_bytes, duration_seconds, metadata_json, created_at
         FROM collab_push_assets
         WHERE event_id IN (${placeholders})
         ORDER BY created_at DESC`
      )
      .all(...eventIds) as Array<{
      id: string;
      event_id: string;
      room_code: string;
      track_id: string;
      file_name: string;
      file_type: string;
      file_path: string | null;
      size_bytes: number | null;
      duration_seconds: number | null;
      metadata_json: string | null;
      created_at: number;
    }>;

    for (const row of rows) {
      const list = map.get(row.event_id) ?? [];
      list.push({
        id: row.id,
        eventId: row.event_id,
        roomCode: row.room_code,
        trackId: row.track_id,
        fileName: row.file_name,
        fileType: row.file_type,
        filePath: row.file_path ?? undefined,
        sizeBytes: row.size_bytes ?? undefined,
        durationSeconds: row.duration_seconds ?? undefined,
        metadata: row.metadata_json ? (JSON.parse(row.metadata_json) as Record<string, unknown>) : undefined,
        createdAt: row.created_at
      });
      map.set(row.event_id, list);
    }

    return map;
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
