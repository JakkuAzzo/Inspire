/**
 * Specific test for lyricist/rapper mode generation
 * to verify the fix for the "black screen" issue
 */

import { generateModePack } from '../src/modePackGenerator';
import type { LyricistModePack, ModePackRequest } from '../src/types';

describe('Lyricist Rapper Mode Generation', () => {
  it('should generate a valid rapper pack with all required fields', async () => {
    const request: ModePackRequest = {
      submode: 'rapper',
      genre: 'rap',
      filters: {
        timeframe: 'fresh',
        tone: 'funny',
        semantic: 'tight'
      }
    };

    const pack = await generateModePack('lyricist', request, {});
    
    expect(pack).toBeDefined();
    expect(pack.mode).toBe('lyricist');
    expect(pack.submode).toBe('rapper');
    
    // Cast to LyricistModePack for type-specific assertions
    const lyricistPack = pack as LyricistModePack;
    
    // Verify all required fields are present and valid
    expect(lyricistPack.id).toBeDefined();
    expect(lyricistPack.id).toMatch(/^lyricist-/);
    
    expect(lyricistPack.timestamp).toBeDefined();
    expect(typeof lyricistPack.timestamp).toBe('number');
    
    expect(lyricistPack.title).toBeDefined();
    expect(typeof lyricistPack.title).toBe('string');
    expect(lyricistPack.title.length).toBeGreaterThan(0);
    
    expect(lyricistPack.genre).toBeDefined();
    expect(typeof lyricistPack.genre).toBe('string');
    
    // Critical fields that could cause black screen if missing
    expect(lyricistPack.powerWords).toBeDefined();
    expect(Array.isArray(lyricistPack.powerWords)).toBe(true);
    expect(lyricistPack.powerWords.length).toBeGreaterThan(0);
    
    expect(lyricistPack.rhymeFamilies).toBeDefined();
    expect(Array.isArray(lyricistPack.rhymeFamilies)).toBe(true);
    
    expect(lyricistPack.flowPrompts).toBeDefined();
    expect(Array.isArray(lyricistPack.flowPrompts)).toBe(true);
    expect(lyricistPack.flowPrompts.length).toBeGreaterThan(0);
    
    expect(lyricistPack.memeSound).toBeDefined();
    expect(lyricistPack.memeSound.name).toBeDefined();
    expect(lyricistPack.memeSound.description).toBeDefined();
    
    expect(lyricistPack.topicChallenge).toBeDefined();
    expect(typeof lyricistPack.topicChallenge).toBe('string');
    expect(lyricistPack.topicChallenge.length).toBeGreaterThan(0);
    
    expect(lyricistPack.newsPrompt).toBeDefined();
    expect(lyricistPack.newsPrompt.headline).toBeDefined();
    expect(lyricistPack.newsPrompt.context).toBeDefined();
    expect(lyricistPack.newsPrompt.source).toBeDefined();
    
    expect(lyricistPack.storyArc).toBeDefined();
    expect(lyricistPack.storyArc.start).toBeDefined();
    expect(lyricistPack.storyArc.middle).toBeDefined();
    expect(lyricistPack.storyArc.end).toBeDefined();
    
    expect(lyricistPack.chordMood).toBeDefined();
    expect(typeof lyricistPack.chordMood).toBe('string');
    
    expect(lyricistPack.lyricFragments).toBeDefined();
    expect(Array.isArray(lyricistPack.lyricFragments)).toBe(true);
    expect(lyricistPack.lyricFragments.length).toBeGreaterThan(0);
    
    expect(lyricistPack.wordLab).toBeDefined();
    expect(Array.isArray(lyricistPack.wordLab)).toBe(true);
  });

  it('should generate rapper pack with different filter combinations', async () => {
    const testCases = [
      { timeframe: 'fresh' as const, tone: 'funny' as const, semantic: 'tight' as const },
      { timeframe: 'recent' as const, tone: 'deep' as const, semantic: 'balanced' as const },
      { timeframe: 'timeless' as const, tone: 'dark' as const, semantic: 'wild' as const }
    ];

    for (const filters of testCases) {
      const request: ModePackRequest = {
        submode: 'rapper',
        genre: 'rap',
        filters
      };

      const pack = await generateModePack('lyricist', request, {});
      
      expect(pack).toBeDefined();
      expect(pack.mode).toBe('lyricist');
      expect(pack.filters).toEqual(filters);
      
      const lyricistPack = pack as LyricistModePack;
      expect(lyricistPack.powerWords).toBeDefined();
      expect(lyricistPack.powerWords.length).toBeGreaterThan(0);
    }
  });

  it('should generate rapper pack with different genres', async () => {
    const genres = ['rap', 'drill', 'trap', 'r&b', 'hyperpop'];

    for (const genre of genres) {
      const request: ModePackRequest = {
        submode: 'rapper',
        genre,
        filters: {
          timeframe: 'fresh',
          tone: 'funny',
          semantic: 'tight'
        }
      };

      const pack = await generateModePack('lyricist', request, {});
      
      expect(pack).toBeDefined();
      const lyricistPack = pack as LyricistModePack;
      expect(lyricistPack.genre).toBe(genre);
      expect(lyricistPack.powerWords.length).toBeGreaterThan(0);
    }
  });
});
