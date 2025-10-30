export interface FuelPack {
  id: string;
  timestamp: number;
  words: string[];
  memes: string[];
  emotionalArc: EmotionalArc;
  sampleChallenge: SampleChallenge;
}

export interface EmotionalArc {
  start: string;
  middle: string;
  end: string;
}

export interface SampleChallenge {
  type: string;
  description: string;
  constraint: string;
}
