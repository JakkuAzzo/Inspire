export const mockMoods = [
  { name: "Energetic", tags: ["hype", "powerful", "intense", "aggressive", "bold"], intensity: 9 },
  { name: "Chill", tags: ["relaxed", "smooth", "laid-back", "mellow", "easy"], intensity: 3 },
  { name: "Dark", tags: ["mysterious", "haunting", "ominous", "brooding", "gothic"], intensity: 7 },
  { name: "Happy", tags: ["joyful", "uplifting", "cheerful", "bright", "optimistic"], intensity: 8 },
  { name: "Sad", tags: ["melancholic", "somber", "blue", "down", "emotional"], intensity: 6 },
  { name: "Romantic", tags: ["loving", "passionate", "tender", "intimate", "sweet"], intensity: 5 },
  { name: "Angry", tags: ["furious", "rage", "hostile", "aggressive", "fierce"], intensity: 10 },
  { name: "Confident", tags: ["bold", "assured", "strong", "powerful", "dominant"], intensity: 8 },
  { name: "Dreamy", tags: ["ethereal", "floating", "surreal", "atmospheric", "spacey"], intensity: 4 },
  { name: "Motivational", tags: ["inspiring", "uplifting", "empowering", "driven", "determined"], intensity: 9 }
];

export const mockEmotions = [
  "joy", "anger", "sadness", "fear", "surprise", "disgust", "trust", "anticipation",
  "love", "hate", "pride", "shame", "guilt", "envy", "gratitude", "hope",
  "anxiety", "confidence", "curiosity", "boredom", "excitement", "peace"
];

export const mockEmotionalArcs = [
  { start: "struggle", middle: "determination", end: "triumph" },
  { start: "peace", middle: "conflict", end: "resolution" },
  { start: "loneliness", middle: "connection", end: "love" },
  { start: "doubt", middle: "perseverance", end: "confidence" },
  { start: "darkness", middle: "hope", end: "light" },
  { start: "anger", middle: "understanding", end: "forgiveness" },
  { start: "fear", middle: "courage", end: "victory" },
  { start: "sadness", middle: "healing", end: "joy" }
];

export const mockSentimentAnalysis = {
  positive: {
    score: 0.85,
    keywords: ["amazing", "incredible", "fantastic", "brilliant", "outstanding", "excellent", "wonderful"],
    emotions: ["joy", "excitement", "gratitude", "love", "pride"]
  },
  negative: {
    score: 0.75,
    keywords: ["terrible", "awful", "horrible", "disappointing", "frustrating", "annoying", "bad"],
    emotions: ["anger", "sadness", "disgust", "fear", "shame"]
  },
  neutral: {
    score: 0.50,
    keywords: ["okay", "fine", "normal", "average", "standard", "regular", "typical"],
    emotions: ["calm", "peace", "boredom", "curiosity"]
  }
};
