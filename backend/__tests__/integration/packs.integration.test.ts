import { getPool } from '../../src/db/connection';
import { PackRepository } from '../../src/repositories/packRepository';

describe('PackRepository integration (pg-mem)', () => {
  it('saves and retrieves a pack snapshot for a user', async () => {
    const pool = await getPool({});
    const repo = new PackRepository(pool);

    const userId = `user-${Date.now()}`;
    const pack = {
      id: `pack-${Date.now()}`,
      timestamp: Date.now(),
      mode: 'lyricist',
      submode: 'rapper',
      title: 'Integration Test Pack',
      filters: { timeframe: 'fresh', tone: 'funny', semantic: 'tight' }
    } as any;

    await repo.savePackForUser(userId, pack);
    const list = await repo.listSavedPacks(userId);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(1);

    const fetched = await repo.getPack(pack.id);
    expect(fetched).toBeDefined();
    expect((fetched as any).id).toBe(pack.id);
  });
});
