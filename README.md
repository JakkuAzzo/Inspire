# Inspire

Inspire is an experimental creativity app that fuels musicians with curated randomness — memes, words, sounds, and moods — to spark new ideas.

## Overview

Inspire generates randomized, curated "Fuel Packs" of words, memes, emotional arcs, sounds, and other media to spark inspiration for rappers, singers, and producers. Every fuel pack is dynamically assembled from multiple creative sources to keep your ideas fresh and current.

## Features

- 🎤 **Word & Phrase Generation** - Random words, rhymes, and topic-based vocabulary for lyrics
- 🖼️ **Meme & Image Inspiration** - Trending memes and creative imagery for visual concepts
- 😊 **Emotion & Mood Data** - Emotional arcs and sentiment analysis for storytelling
- 🎵 **Audio Samples & Loops** - Searchable sound effects and royalty-free music previews
- 📰 **Topic & Trend Data** - Current events and trending discussions for relevant content
- 🎲 **Randomization Utilities** - Creative prompts and wildcard ideas for experimentation

## External Data Sources

Inspire integrates with multiple free and freemium APIs to bring creative fuel packs to life. Each service wrapper includes automatic fallback to mock data when API keys are unavailable or rate limits are reached.

### Word & Phrase Generation

**Datamuse API** - Find words that rhyme, have similar meanings, or relate to specific topics
- **Purpose**: Powers the word suggestion engine for lyric writing
- **Features**: Rhyme finding, semantic similarity, topic-based word discovery
- **Usage in Inspire**: Generates vocabulary suggestions, finds rhymes for freestyling
- **API Key**: Not required
- **Rate Limit**: 100,000 requests/day

**Random Word API** - Generate random words for creative prompts
- **Purpose**: Provides unexpected word combinations to spark ideas
- **Features**: Single or bulk random word generation
- **Usage in Inspire**: Creates writing prompts and challenges
- **API Key**: Not required
- **Rate Limit**: No strict limits

**Free Dictionary API** - Word definitions and usage examples
- **Purpose**: Helps artists understand and use words effectively
- **Features**: Definitions, phonetics, example sentences
- **Usage in Inspire**: Provides context for suggested words
- **API Key**: Not required
- **Rate Limit**: No strict limits

### Meme & Image Inspiration

**Imgflip API** - Popular meme templates
- **Purpose**: Provides visual inspiration and cultural references
- **Features**: 100+ trending meme templates
- **Usage in Inspire**: Adds humor and relatability to creative prompts
- **API Key**: Not required for read operations
- **Rate Limit**: No strict limits

**Unsplash API** - High-quality creative photography
- **Purpose**: Delivers aesthetic inspiration and mood setting
- **Features**: Random photos, keyword search, curated collections
- **Usage in Inspire**: Creates visual themes for tracks and albums
- **API Key**: Required (free tier available)
- **Rate Limit**: 50 requests/hour

**Reddit API** - Trending memes and community content
- **Purpose**: Taps into real-time internet culture
- **Features**: Access to r/memes, r/GetMotivated, and other subreddits
- **Usage in Inspire**: Provides current trends and community-driven inspiration
- **API Key**: Not required for JSON endpoints
- **Rate Limit**: ~60 requests/minute

### Emotion & Mood Data

**Hugging Face Inference API** - AI-powered emotion and sentiment analysis
- **Purpose**: Analyzes text for emotional content and tone
- **Features**: Emotion detection, sentiment classification
- **Usage in Inspire**: Helps artists craft emotional arcs and understand lyrical tone
- **API Key**: Required (free tier available)
- **Rate Limit**: Rate limited based on usage

**Custom Mood Dataset** - Curated mood categories and tags
- **Purpose**: Provides music-specific emotional categorization
- **Features**: 10+ mood categories with intensity levels, emotional arcs
- **Usage in Inspire**: Generates mood-based creative direction
- **API Key**: Not required (local data)
- **Rate Limit**: None

### Audio Samples & Loops

**Freesound API** - Community-sourced sound effects and samples
- **Purpose**: Discovers audio elements for production
- **Features**: Search by tags/BPM, preview URLs, metadata
- **Usage in Inspire**: Helps producers find specific sounds and textures
- **API Key**: Required (free registration)
- **Rate Limit**: 60 requests/minute

**Jamendo API** - Royalty-free music tracks
- **Purpose**: Provides reference tracks and inspiration
- **Features**: Search by genre/mood, preview streams, BPM info
- **Usage in Inspire**: Offers musical examples and style references
- **API Key**: Client ID required (free)
- **Rate Limit**: Varies by endpoint

### Topic & Trend Data

**NewsAPI** - Current news headlines and topics
- **Purpose**: Connects music to current events and cultural moments
- **Features**: Top headlines, keyword search, category filtering
- **Usage in Inspire**: Generates topical content ideas for lyrics
- **API Key**: Required (free tier: 100 req/day)
- **Rate Limit**: 100 requests/day (free tier)

**Reddit API** - Trending discussions and topics
- **Purpose**: Captures real-time conversation and interests
- **Features**: Hot topics from r/all, music subreddits, discussion trends
- **Usage in Inspire**: Identifies what people are talking about now
- **API Key**: Not required for basic access
- **Rate Limit**: ~60 requests/minute

### Randomization Utilities

**BoredAPI** - Random activity suggestions
- **Purpose**: Generates creative challenges and activities
- **Features**: Random activities by type, accessibility levels
- **Usage in Inspire**: Creates "wildcard" creative exercises
- **API Key**: Not required
- **Rate Limit**: No strict limits

**Random Data API** - Random personas and creative data
- **Purpose**: Provides character inspiration and random elements
- **Features**: Random user data, creative combinations
- **Usage in Inspire**: Generates perspective shifts and character ideas
- **API Key**: Not required
- **Rate Limit**: No strict limits

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Optional: API keys for enhanced features (see `.env.example`)

### Installation

```bash
cd backend
npm install
```

### Configuration

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Add your API keys to `.env` (optional - the app works with mock data):
```env
# Required for full functionality
UNSPLASH_ACCESS_KEY=your_key_here
HUGGINGFACE_API_KEY=your_key_here
FREESOUND_API_KEY=your_key_here
JAMENDO_CLIENT_ID=your_client_id_here
NEWS_API_KEY=your_key_here

# Optional: Enable mock fallback
USE_MOCK_FALLBACK=true
```

### Usage

```typescript
import { createAllServices } from './services';

// Initialize all services
const services = createAllServices();

// Get random words for lyrics
const words = await services.wordService.getRandomWords(5);

// Find rhymes
const rhymes = await services.wordService.getRhymes('flow');

// Get memes for inspiration
const memes = await services.memeService.getMemes();

// Get random moods
const moods = await services.moodService.getRandomMoods(3);

// Search for audio samples
const sounds = await services.audioService.searchSounds('drum', 10);

// Get trending topics
const trends = await services.trendService.getMusicTrends(5);

// Get creative prompts
const prompts = await services.randomService.getCreativePrompts(3);
```

## API Documentation

For detailed API research, rate limits, and endpoint documentation, see [docs/API_RESEARCH.md](docs/API_RESEARCH.md).

## Architecture

```
backend/
├── src/
│   ├── services/           # API service wrappers
│   │   ├── wordService.ts      # Word & phrase generation
│   │   ├── memeService.ts      # Meme & image inspiration
│   │   ├── moodService.ts      # Emotion & mood data
│   │   ├── audioService.ts     # Audio samples & loops
│   │   ├── trendService.ts     # Topic & trend data
│   │   ├── randomService.ts    # Randomization utilities
│   │   ├── apiClient.ts        # Base API client
│   │   └── index.ts            # Service exports
│   └── mocks/              # Fallback mock data
│       ├── wordMocks.ts
│       ├── memeMocks.ts
│       ├── moodMocks.ts
│       ├── audioMocks.ts
│       ├── trendMocks.ts
│       └── randomMocks.ts
├── package.json
├── tsconfig.json
└── .env.example
```

## Features & Benefits

### Automatic Fallback
Every service automatically falls back to curated mock data when:
- API keys are not configured
- Rate limits are exceeded
- External services are unavailable
- Network errors occur

### Type Safety
Full TypeScript support with detailed interfaces for all data types.

### Error Handling
Graceful error handling with detailed logging for debugging.

### Extensible Design
Easy to add new APIs or modify existing integrations.

## Contributing

To add a new API integration:

1. Create mock data in `src/mocks/`
2. Create a service wrapper in `src/services/`
3. Implement the service with fallback logic
4. Export from `src/services/index.ts`
5. Add API key template to `.env.example`
6. Document the API in `docs/API_RESEARCH.md`

## License

MIT
