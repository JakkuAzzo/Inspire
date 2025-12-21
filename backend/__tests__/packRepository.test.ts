import { getPool, closePool } from '../src/db/connection';
import { PackRepository } from '../src/repositories/packRepository';
import { LyricistModePack } from '../src/types';

describe('PackRepository', () => {
  afterEach(async () => {
    await closePool();
  });

  it('saves and retrieves packs with share tokens', async () => {
    const pool = await getPool({});
    const repo = new PackRepository(pool);
    const sample: LyricistModePack = {
      id: 'pack_123',
      timestamp: Date.now(),
      title: 'Test pack',
      summary: 'Testing pack',
      mode: 'lyricist',
      submode: 'freestyle',
      genre: 'rap',
      headline: 'hello',
      powerWords: [],
      rhymeFamilies: [],
      flowPrompts: [],
      memeSound: { name: 'm', description: 'd', tone: 'funny' },
      topicChallenge: 't',
      newsPrompt: { headline: 'h', context: 'c', timeframe: 'fresh', source: 's' },
      storyArc: { start: 's', middle: 'm', end: 'e' },
      chordMood: 'c',
      lyricFragments: [],
      wordLab: [],
      filters: { timeframe: 'fresh', tone: 'funny', semantic: 'tight' }
    };

    await repo.savePackForUser('user_1', sample);
    const saved = await repo.listSavedPacks('user_1');
    expect(saved[0]?.id).toBe(sample.id);

    const share = await repo.createShareToken('user_1', sample.id, 'unlisted');
    const resolved = await repo.resolveShareToken(share.token);
    expect(resolved?.pack.id).toBe(sample.id);
  });
});
