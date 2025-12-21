import fs from 'fs';
import path from 'path';
import { DailyChallenge, ChallengeStats, ChallengeAchievement, ChallengeCompletion } from '../types';

const ONE_DAY_MS = 86_400_000;

interface ChallengeState {
  users: Record<string, ChallengeStats>;
}

interface ChallengeSeed extends Omit<DailyChallenge, 'expiresAt' | 'streakCount'> {}

const DEFAULT_CHALLENGES: ChallengeSeed[] = [
  {
    id: 'challenge-city-lights',
    title: 'City Lights Cypher',
    description: 'Write or score something that captures the glow of the nighttime commute.',
    constraints: ['Reference a real street or landmark.', 'Layer at least one found-sound texture.'],
    reward: 'Keeps your streak glowing'
  },
  {
    id: 'challenge-one-take',
    title: 'One-Take Energy',
    description: 'Channel the rush of capturing a single take on camera or tape.',
    constraints: ['No punch-ins allowed.', 'Ship the take within 30 minutes of starting.'],
    reward: 'Unlocks the Focus badge fragments'
  },
  {
    id: 'challenge-remix-relay',
    title: 'Remix Relay',
    description: 'Flip an earlier idea into a new vibe without losing the core hook.',
    constraints: ['Keep at least one original motif.', 'Swap the rhythm or tempo in the chorus.'],
    reward: 'Progress toward the Relay badge'
  }
];

const ACHIEVEMENTS: ChallengeAchievement[] = [
  { id: 'first-finish', title: 'First Finish', description: 'Complete your first Inspire challenge.' },
  { id: 'streak-3', title: '3-Day Glow', description: 'Complete challenges three days in a row.' },
  { id: 'streak-7', title: 'Week Warrior', description: 'Hold a seven-day completion streak.' },
  { id: 'streak-14', title: 'Relay Master', description: 'Stay consistent for fourteen days straight.' }
];

function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfDay(date: Date): number {
  return startOfDay(date) + ONE_DAY_MS;
}

function ensureStateFile(statePath: string) {
  const dir = path.dirname(statePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(statePath)) {
    const initial: ChallengeState = { users: {} };
    fs.writeFileSync(statePath, JSON.stringify(initial, null, 2), 'utf8');
  }
}

export class ChallengeService {
  private state: ChallengeState;
  constructor(private statePath: string, private rotation: ChallengeSeed[] = DEFAULT_CHALLENGES) {
    ensureStateFile(statePath);
    this.state = this.readState();
  }

  private readState(): ChallengeState {
    try {
      const raw = fs.readFileSync(this.statePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.users) {
        return { users: parsed.users as Record<string, ChallengeStats> };
      }
    } catch (err) {
      console.warn('[challengeService] Failed to read state, resetting', err);
    }
    return { users: {} };
  }

  private writeState() {
    fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2), 'utf8');
  }

  private getOrCreateStats(userId: string): ChallengeStats {
    if (!this.state.users[userId]) {
      this.state.users[userId] = {
        userId,
        streak: 0,
        totalCompletions: 0,
        lastCompletedAt: null,
        achievements: [],
        completions: []
      };
    }
    return this.state.users[userId];
  }

  getCurrentChallenge(now: Date = new Date()): DailyChallenge {
    const dayIndex = Math.floor(now.getTime() / ONE_DAY_MS);
    const seed = this.rotation[dayIndex % this.rotation.length];
    const expiresAt = new Date(endOfDay(now)).toISOString();
    return { ...seed, expiresAt };
  }

  private hasCompletionOnDay(stats: ChallengeStats, dayStartMs: number): boolean {
    return stats.completions.some((entry) => {
      const ts = new Date(entry.completedAt).getTime();
      return ts >= dayStartMs && ts < dayStartMs + ONE_DAY_MS;
    });
  }

  private evaluateAchievements(stats: ChallengeStats, streak: number): ChallengeAchievement[] {
    const unlocked: ChallengeAchievement[] = [];
    const already = new Set(stats.achievements.map((a) => a.id));
    const total = stats.totalCompletions;
    const candidates: Array<{ id: string; condition: boolean }> = [
      { id: 'first-finish', condition: total >= 1 },
      { id: 'streak-3', condition: streak >= 3 },
      { id: 'streak-7', condition: streak >= 7 },
      { id: 'streak-14', condition: streak >= 14 }
    ];
    for (const candidate of candidates) {
      if (candidate.condition && !already.has(candidate.id)) {
        const achievement = ACHIEVEMENTS.find((a) => a.id === candidate.id);
        if (achievement) {
          unlocked.push({ ...achievement, unlockedAt: new Date().toISOString() });
        }
      }
    }
    return unlocked;
  }

  submitCompletion(userId: string, challengeId: string, completedAt: Date = new Date()): ChallengeStats {
    const challenge = this.getCurrentChallenge(completedAt);
    if (challenge.id !== challengeId) {
      throw new Error('Challenge is no longer active');
    }

    const stats = this.getOrCreateStats(userId);
    const todayStart = startOfDay(completedAt);

    if (this.hasCompletionOnDay(stats, todayStart)) {
      return stats;
    }

    const lastCompletionDay = stats.lastCompletedAt ? startOfDay(new Date(stats.lastCompletedAt)) : null;
    const isYesterday = lastCompletionDay !== null && todayStart - lastCompletionDay === ONE_DAY_MS;
    const streak = isYesterday ? stats.streak + 1 : 1;

    const completion: ChallengeCompletion = { challengeId, completedAt: completedAt.toISOString() };
    stats.completions.push(completion);
    stats.totalCompletions += 1;
    stats.streak = streak;
    stats.lastCompletedAt = completion.completedAt;

    const unlocked = this.evaluateAchievements(stats, streak);
    if (unlocked.length) {
      stats.achievements = [...stats.achievements, ...unlocked];
    }

    this.writeState();
    return stats;
  }

  getStats(userId: string): ChallengeStats {
    const stats = this.getOrCreateStats(userId);
    this.writeState();
    return stats;
  }

  listAchievements(): ChallengeAchievement[] {
    return ACHIEVEMENTS.slice();
  }
}

export default ChallengeService;
