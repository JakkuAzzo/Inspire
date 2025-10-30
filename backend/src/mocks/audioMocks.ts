export const mockSounds = [
  {
    id: 1,
    name: "Hip Hop Drum Loop 808",
    tags: ["drum", "loop", "hip-hop", "808", "beat"],
    description: "Classic 808 drum loop perfect for hip-hop production",
    duration: 4.5,
    previews: {
      "preview-hq-mp3": "https://freesound.org/data/previews/1/mock-preview-1.mp3"
    },
    bpm: 85,
    type: "wav"
  },
  {
    id: 2,
    name: "Trap Snare Hit",
    tags: ["snare", "trap", "percussion", "one-shot"],
    description: "Punchy trap snare for modern beats",
    duration: 0.8,
    previews: {
      "preview-hq-mp3": "https://freesound.org/data/previews/2/mock-preview-2.mp3"
    },
    type: "wav"
  },
  {
    id: 3,
    name: "Ambient Synth Pad",
    tags: ["synth", "pad", "ambient", "atmospheric", "texture"],
    description: "Ethereal synth pad for background texture",
    duration: 12.0,
    previews: {
      "preview-hq-mp3": "https://freesound.org/data/previews/3/mock-preview-3.mp3"
    },
    type: "wav"
  },
  {
    id: 4,
    name: "Bass Drop Heavy",
    tags: ["bass", "drop", "sub", "heavy", "impact"],
    description: "Heavy bass drop for maximum impact",
    duration: 2.3,
    previews: {
      "preview-hq-mp3": "https://freesound.org/data/previews/4/mock-preview-4.mp3"
    },
    type: "wav"
  },
  {
    id: 5,
    name: "Vinyl Scratch Sound",
    tags: ["vinyl", "scratch", "dj", "turntable", "effect"],
    description: "Classic vinyl scratch effect",
    duration: 1.2,
    previews: {
      "preview-hq-mp3": "https://freesound.org/data/previews/5/mock-preview-5.mp3"
    },
    type: "wav"
  }
];

export const mockTracks = [
  {
    id: "track-1",
    name: "Midnight Groove",
    artist_name: "Mock Producer",
    duration: 180,
    audiodownload: "https://mock.jamendo.com/download/track/1",
    audio: "https://mock.jamendo.com/stream/track/1",
    bpm: 92,
    tags: ["chill", "hip-hop", "instrumental", "beats"]
  },
  {
    id: "track-2",
    name: "Energy Burst",
    artist_name: "Beat Maker",
    duration: 165,
    audiodownload: "https://mock.jamendo.com/download/track/2",
    audio: "https://mock.jamendo.com/stream/track/2",
    bpm: 128,
    tags: ["energetic", "edm", "dance", "electronic"]
  },
  {
    id: "track-3",
    name: "Soul Searching",
    artist_name: "Melody Master",
    duration: 210,
    audiodownload: "https://mock.jamendo.com/download/track/3",
    audio: "https://mock.jamendo.com/stream/track/3",
    bpm: 75,
    tags: ["soul", "rnb", "smooth", "emotional"]
  }
];

export const mockSampleCategories = [
  { name: "Drums", count: 1250, tags: ["kick", "snare", "hi-hat", "cymbal", "tom", "percussion"] },
  { name: "Bass", count: 680, tags: ["808", "sub", "synth-bass", "acoustic-bass", "electric-bass"] },
  { name: "Synths", count: 920, tags: ["lead", "pad", "pluck", "arp", "fx"] },
  { name: "Vocals", count: 340, tags: ["chant", "vocal-chop", "phrase", "ad-lib", "hook"] },
  { name: "FX", count: 540, tags: ["riser", "impact", "sweep", "noise", "transition"] }
];
