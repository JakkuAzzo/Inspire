import { ChallengeActivity } from '../types';

function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

const activityLog: ChallengeActivity[] = [
  {
    id: 'activity-aurora-city-hook',
    handle: '@auroraflow',
    status: 'submitted',
    timestamp: minutesAgo(18),
    activity: 'Shared a one-take hook for the City Lights Cypher with layered whisper backs.',
    type: 'lyric'
  },
  {
    id: 'activity-midnight-texture',
    handle: '@midnightloops',
    status: 'accepted',
    timestamp: minutesAgo(42),
    activity: 'Submitted a texture flip built from subway ambience and DX7 chords.',
    type: 'producer'
  },
  {
    id: 'activity-cutcraft-reel',
    handle: '@cutcraft',
    status: 'submitted',
    timestamp: minutesAgo(57),
    activity: 'Uploaded a 30-second reel pacing map with night-drive b-roll transitions.',
    type: 'editor'
  },
  {
    id: 'activity-synthsage-vapor',
    handle: '@synthsage',
    status: 'accepted',
    timestamp: minutesAgo(95),
    activity: 'Logged a vaporwave remix stem pack inspired by the subway badge prompt.',
    type: 'producer'
  },
  {
    id: 'activity-vocalnova-streak',
    handle: '@vocalnova',
    status: 'submitted',
    timestamp: minutesAgo(130),
    activity: 'Delivered a harmony stack with halftime switch-ups for streak badge progress.',
    type: 'lyric'
  },
  {
    id: 'activity-loopbyte-collab',
    handle: '@loopbyte',
    status: 'accepted',
    timestamp: minutesAgo(210),
    activity: 'Imported a collaborator\'s synth stem and annotated the beat markers.',
    type: 'producer'
  }
];

export function listChallengeActivity(limit = 10): ChallengeActivity[] {
  if (!Number.isFinite(limit) || limit <= 0) {
    return activityLog.slice();
  }
  const safeLimit = Math.min(Math.floor(limit), activityLog.length);
  return activityLog
    .slice()
    .sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1))
    .slice(0, safeLimit);
}
