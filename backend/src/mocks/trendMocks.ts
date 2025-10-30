export const mockNews = [
  {
    source: { id: null, name: "Music News Daily" },
    author: "Mock Reporter",
    title: "New Wave of Hip-Hop Artists Revolutionizing the Genre",
    description: "A fresh generation of artists is bringing innovation to hip-hop with experimental sounds and authentic storytelling.",
    url: "https://example.com/news/1",
    urlToImage: "https://example.com/images/news1.jpg",
    publishedAt: new Date().toISOString(),
    content: "The hip-hop landscape is evolving rapidly..."
  },
  {
    source: { id: null, name: "Culture Beat" },
    author: "Trend Analyst",
    title: "Social Media Trends Influencing Modern Music Production",
    description: "How viral moments and internet culture are shaping the way artists create and release music.",
    url: "https://example.com/news/2",
    urlToImage: "https://example.com/images/news2.jpg",
    publishedAt: new Date(Date.now() - 3600000).toISOString(),
    content: "Social platforms have become the new radio..."
  },
  {
    source: { id: null, name: "Sound & Vision" },
    author: "Music Journalist",
    title: "The Return of Sampling: Producers Dig Deep into Archives",
    description: "Modern producers are rediscovering classic samples and giving them new life in contemporary tracks.",
    url: "https://example.com/news/3",
    urlToImage: "https://example.com/images/news3.jpg",
    publishedAt: new Date(Date.now() - 7200000).toISOString(),
    content: "Sampling has always been at the heart of hip-hop..."
  }
];

export const mockTrendingTopics: Array<{ topic: string; mentions: number; trend: 'rising' | 'stable' | 'falling' }> = [
  { topic: "AI in Music Production", mentions: 15420, trend: "rising" },
  { topic: "Lo-Fi Hip-Hop", mentions: 12800, trend: "stable" },
  { topic: "NFT Music Releases", mentions: 9650, trend: "falling" },
  { topic: "Collaboration Culture", mentions: 18200, trend: "rising" },
  { topic: "Vintage Sound Revival", mentions: 7340, trend: "rising" },
  { topic: "Live Stream Concerts", mentions: 11500, trend: "stable" }
];

export const mockRedditTopics = [
  {
    title: "What's the most underrated hip-hop album of 2024?",
    subreddit: "hiphopheads",
    score: 2340,
    num_comments: 487,
    created: Date.now() / 1000,
    permalink: "/r/hiphopheads/comments/mock1"
  },
  {
    title: "Producers: What's your go-to technique for creating unique beats?",
    subreddit: "makinghiphop",
    score: 1890,
    num_comments: 312,
    created: Date.now() / 1000 - 3600,
    permalink: "/r/makinghiphop/comments/mock2"
  },
  {
    title: "The evolution of trap music: A retrospective",
    subreddit: "Music",
    score: 4520,
    num_comments: 678,
    created: Date.now() / 1000 - 7200,
    permalink: "/r/Music/comments/mock3"
  }
];

export const mockWikipediaEvents = [
  {
    year: 1973,
    text: "DJ Kool Herc hosts a party at 1520 Sedgwick Avenue in the Bronx, often considered the birth of hip-hop",
    pages: [{ title: "Hip hop music" }]
  },
  {
    year: 1979,
    text: "The Sugarhill Gang releases 'Rapper's Delight', the first hip-hop single to become a Top 40 hit",
    pages: [{ title: "Rapper's Delight" }]
  },
  {
    year: 1988,
    text: "N.W.A releases 'Straight Outta Compton', pioneering gangsta rap",
    pages: [{ title: "Straight Outta Compton" }]
  }
];
