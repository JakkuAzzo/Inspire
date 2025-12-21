import fs from 'fs';
import os from 'os';
import path from 'path';
import { ChallengeService } from '../src/services/challengeService';

function createTempFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'challenge-db-'));
  return path.join(dir, 'state.json');
}

describe('ChallengeService', () => {
  it('rotates daily challenges and sets expiry to end of day', () => {
    const statePath = createTempFile();
    const service = new ChallengeService(statePath);
    const now = new Date('2024-01-02T10:00:00Z');
    const challenge = service.getCurrentChallenge(now);
    expect(challenge.expiresAt).toBe('2024-01-03T00:00:00.000Z');
    const nextDay = service.getCurrentChallenge(new Date(now.getTime() + 86_400_000));
    expect(nextDay.id).not.toBe(challenge.id);
  });

  it('tracks streaks, completions, and achievements', () => {
    const statePath = createTempFile();
    const service = new ChallengeService(statePath);
    const baseDate = new Date('2024-03-01T14:00:00Z');
    const firstChallenge = service.getCurrentChallenge(baseDate);
    const statsDayOne = service.submitCompletion('user-1', firstChallenge.id, baseDate);
    expect(statsDayOne.totalCompletions).toBe(1);
    expect(statsDayOne.streak).toBe(1);
    expect(statsDayOne.achievements.some((a) => a.id === 'first-finish')).toBe(true);

    const nextDay = new Date(baseDate.getTime() + 86_400_000);
    const secondChallenge = service.getCurrentChallenge(nextDay);
    const statsDayTwo = service.submitCompletion('user-1', secondChallenge.id, nextDay);
    expect(statsDayTwo.streak).toBe(2);

    const thirdDay = new Date(nextDay.getTime() + 86_400_000);
    const thirdChallenge = service.getCurrentChallenge(thirdDay);
    const statsDayThree = service.submitCompletion('user-1', thirdChallenge.id, thirdDay);
    expect(statsDayThree.streak).toBe(3);
    expect(statsDayThree.achievements.some((a) => a.id === 'streak-3')).toBe(true);
  });

  it('prevents duplicate completions for a single day', () => {
    const statePath = createTempFile();
    const service = new ChallengeService(statePath);
    const now = new Date('2024-05-01T12:00:00Z');
    const challenge = service.getCurrentChallenge(now);
    const first = service.submitCompletion('user-duplicate', challenge.id, now);
    const second = service.submitCompletion('user-duplicate', challenge.id, new Date(now.getTime() + 2 * 60 * 60 * 1000));
    expect(second.totalCompletions).toBe(first.totalCompletions);
    expect(second.streak).toBe(first.streak);
  });
});
