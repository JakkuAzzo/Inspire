import request from 'supertest';
import { app } from '../dist/index';

const modeCases = [
  { mode: 'lyricist', submodes: ['rapper', 'singer'] },
  { mode: 'producer', submodes: ['musician', 'sampler', 'sound-designer'] },
  { mode: 'editor', submodes: ['image-editor', 'video-editor', 'audio-editor'] }
];

describe('Mode pack generation per submode', () => {
  test.each(modeCases.flatMap(({ mode, submodes }) => submodes.map((submode) => ({ mode, submode }))))(
    'POST /api/modes/%s/fuel-pack accepts %s submode',
    async ({ mode, submode }) => {
      const payload = {
        submode,
        filters: { timeframe: 'recent', tone: 'deep', semantic: 'balanced' },
        genre: 'lo-fi'
      };

      const res = await request(app).post(`/api/modes/${mode}/fuel-pack`).send(payload).set('Accept', 'application/json');

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('pack');
      const pack = res.body.pack;
      expect(pack).toMatchObject({ mode, submode });
      expect(pack).toHaveProperty('filters');
      expect(pack).toHaveProperty('timestamp');
      expect(pack.filters).toEqual(expect.objectContaining(payload.filters));
    }
  );
});
