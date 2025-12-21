import { Pool } from 'pg';
import { createId } from '../utils/id';
import { FuelPack, ModePack } from '../types';

export type AnyPack = FuelPack | ModePack;

export interface ShareToken {
  token: string;
  packId: string;
  visibility: 'private' | 'unlisted' | 'public';
  expiresAt?: Date | null;
}

export class PackRepository {
  constructor(private readonly pool: Pool) {}

  async ensureUser(userId: string, email?: string) {
    await this.pool.query('INSERT INTO users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING', [userId, email ?? null]);
  }

  async savePackSnapshot(ownerId: string, pack: AnyPack) {
    await this.ensureUser(ownerId);
    const payload = JSON.stringify(pack);
    await this.pool.query(
      `INSERT INTO fuel_packs (id, owner_id, mode, submode, headline, filters, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET owner_id = EXCLUDED.owner_id, payload = EXCLUDED.payload, headline = EXCLUDED.headline`,
      [
        pack.id,
        ownerId,
        'mode' in pack ? pack.mode : 'fuel',
        'submode' in pack ? (pack as any).submode : null,
        (pack as any).headline ?? null,
        JSON.stringify((pack as any).filters ?? null),
        payload
      ]
    );
  }

  async savePackForUser(userId: string, pack: AnyPack) {
    await this.savePackSnapshot(userId, pack);
    await this.pool.query('INSERT INTO saved_packs (user_id, pack_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, pack.id]);
  }

  async listSavedPacks(userId: string): Promise<AnyPack[]> {
    const { rows } = await this.pool.query(
      `SELECT payload FROM fuel_packs fp
       INNER JOIN saved_packs sp ON sp.pack_id = fp.id
       WHERE sp.user_id = $1
       ORDER BY sp.created_at DESC`,
      [userId]
    );
    return rows.map((row) => row.payload as AnyPack);
  }

  async getPack(packId: string): Promise<AnyPack | null> {
    const { rows } = await this.pool.query('SELECT payload FROM fuel_packs WHERE id=$1', [packId]);
    if (!rows.length) return null;
    return rows[0].payload as AnyPack;
  }

  async createShareToken(
    ownerId: string,
    packId: string,
    visibility: ShareToken['visibility'],
    expiresAt?: Date | null
  ): Promise<ShareToken> {
    await this.ensureUser(ownerId);
    const token = createId('share');
    await this.pool.query(
      'INSERT INTO share_tokens (token, pack_id, owner_id, visibility, expires_at) VALUES ($1, $2, $3, $4, $5)',
      [token, packId, ownerId, visibility, expiresAt ?? null]
    );
    return { token, packId, visibility, expiresAt: expiresAt ?? null };
  }

  async resolveShareToken(token: string): Promise<{ pack: AnyPack; visibility: string; expiresAt: Date | null } | null> {
    const { rows } = await this.pool.query(
      `SELECT st.visibility, st.expires_at, fp.payload FROM share_tokens st
       INNER JOIN fuel_packs fp ON fp.id = st.pack_id
       WHERE st.token = $1`,
      [token]
    );
    if (!rows.length) return null;
    const row = rows[0];
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return null;
    return { pack: row.payload as AnyPack, visibility: row.visibility, expiresAt: row.expires_at };
  }
}
