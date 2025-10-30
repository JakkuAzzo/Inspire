export const mockMemes = [
  {
    id: "181913649",
    name: "Drake Hotline Bling",
    url: "https://i.imgflip.com/30b1gx.jpg",
    width: 1200,
    height: 1200,
    box_count: 2
  },
  {
    id: "87743020",
    name: "Two Buttons",
    url: "https://i.imgflip.com/1g8my4.jpg",
    width: 600,
    height: 908,
    box_count: 3
  },
  {
    id: "112126428",
    name: "Distracted Boyfriend",
    url: "https://i.imgflip.com/1ur9b0.jpg",
    width: 1200,
    height: 800,
    box_count: 3
  },
  {
    id: "131087935",
    name: "Running Away Balloon",
    url: "https://i.imgflip.com/261o3j.jpg",
    width: 761,
    height: 1024,
    box_count: 5
  },
  {
    id: "217743513",
    name: "UNO Draw 25 Cards",
    url: "https://i.imgflip.com/3lmzyx.jpg",
    width: 500,
    height: 494,
    box_count: 2
  }
];

export const mockImages = [
  {
    id: "mock-1",
    description: "Microphone in studio with purple lights",
    urls: {
      regular: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1080",
      small: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400"
    },
    user: {
      name: "Mock Artist",
      username: "mockartist"
    },
    alt_description: "Studio microphone setup"
  },
  {
    id: "mock-2",
    description: "DJ mixing on turntables",
    urls: {
      regular: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=1080",
      small: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400"
    },
    user: {
      name: "Mock DJ",
      username: "mockdj"
    },
    alt_description: "DJ equipment and turntables"
  },
  {
    id: "mock-3",
    description: "Concert crowd with raised hands",
    urls: {
      regular: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1080",
      small: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400"
    },
    user: {
      name: "Mock Photographer",
      username: "mockphoto"
    },
    alt_description: "Concert audience with lights"
  }
];

export const mockRedditPosts = [
  {
    title: "When the beat drops perfectly",
    url: "https://i.redd.it/mock1.jpg",
    author: "mockuser1",
    score: 12500,
    subreddit: "memes",
    created: Date.now() / 1000,
    permalink: "/r/memes/comments/mock1"
  },
  {
    title: "Producers be like",
    url: "https://i.redd.it/mock2.jpg",
    author: "mockuser2",
    score: 8900,
    subreddit: "memes",
    created: Date.now() / 1000 - 3600,
    permalink: "/r/memes/comments/mock2"
  },
  {
    title: "When you finally finish that track",
    url: "https://i.redd.it/mock3.jpg",
    author: "mockuser3",
    score: 15200,
    subreddit: "memes",
    created: Date.now() / 1000 - 7200,
    permalink: "/r/memes/comments/mock3"
  }
];
