# Quick Start Guide - Inspire Backend

This guide will help you get started with the Inspire backend API services.

## Installation

```bash
cd backend
npm install
```

## Configuration

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Edit `.env` and add your API keys (all are optional - the system will use mock data as fallback):

```env
# Highly Recommended (Free Tier Available)
UNSPLASH_ACCESS_KEY=your_unsplash_key      # 50 requests/hour free
NEWS_API_KEY=your_newsapi_key              # 100 requests/day free
FREESOUND_API_KEY=your_freesound_key       # 60 requests/min free

# Optional Enhancement
HUGGINGFACE_API_KEY=your_hf_key            # For advanced emotion analysis
JAMENDO_CLIENT_ID=your_jamendo_id          # For music track previews

# Settings
USE_MOCK_FALLBACK=true                     # Enable fallback to mock data
LOG_API_REQUESTS=true                      # Enable request logging
```

## Getting API Keys

### Unsplash (Images)
1. Go to https://unsplash.com/developers
2. Create an application
3. Copy the "Access Key"

### NewsAPI (News & Trends)
1. Go to https://newsapi.org/register
2. Sign up for free developer account
3. Copy your API key

### Freesound (Audio Samples)
1. Go to https://freesound.org/apiv2/apply/
2. Register and create an API credential
3. Copy your API key

### Hugging Face (AI Emotion Analysis)
1. Go to https://huggingface.co/settings/tokens
2. Create a new access token
3. Copy the token

### Jamendo (Music Tracks)
1. Go to https://developer.jamendo.com/
2. Register as a developer
3. Create an application and get Client ID

## Basic Usage

### Running the Example

```bash
# Build the TypeScript code
npm run build

# Run the example
node dist/example.js
```

### Using in Your Code

```typescript
import { createAllServices } from './services';

// Initialize services
const services = createAllServices();

// Use the services
async function generateCreativeContent() {
  // Get random words for lyrics
  const words = await services.wordService.getRandomWords(10);
  
  // Find rhymes for a word
  const rhymes = await services.wordService.getRhymes('flow', 10);
  
  // Get memes for visual inspiration
  const memes = await services.memeService.getMemes();
  
  // Get random moods
  const moods = await services.moodService.getRandomMoods(5);
  
  // Search audio samples
  const drums = await services.audioService.searchSounds('drum', 10);
  
  // Get trending topics
  const trends = await services.trendService.getMusicTrends(5);
  
  // Get creative prompts
  const prompts = await services.randomService.getCreativePrompts(3);
  
  return {
    words,
    rhymes,
    memes,
    moods,
    drums,
    trends,
    prompts
  };
}
```

## Service Overview

### WordService

Generate words, find rhymes, and explore vocabulary:

```typescript
const wordService = createWordService();

// Get random words
const words = await wordService.getRandomWords(5);

// Find rhymes
const rhymes = await wordService.getRhymes('beat', 10);

// Get similar words
const similar = await wordService.getSimilarWords('music', 10);

// Get words by topic
const topicWords = await wordService.getWordsByTopic('love', 20);

// Get word definition
const definition = await wordService.getDefinition('rhythm');
```

### MemeService

Access memes and images for visual inspiration:

```typescript
const memeService = createMemeService();

// Get popular memes
const memes = await memeService.getMemes();

// Get random image
const image = await memeService.getRandomImage('music');

// Search images
const images = await memeService.searchImages('concert', 10);

// Get subreddit memes
const redditMemes = await memeService.getSubredditMemes('memes', 'hot', 10);

// Get motivational posts
const motivation = await memeService.getMotivationalPosts(5);
```

### MoodService

Analyze emotions and get mood tags:

```typescript
const moodService = createMoodService();

// Get random moods
const moods = await moodService.getRandomMoods(3);

// Get moods by intensity
const intense = await moodService.getMoodsByIntensity(7, 10);

// Get emotional arc
const arc = await moodService.getRandomEmotionalArc();

// Analyze sentiment
const sentiment = await moodService.analyzeSentiment('This beat is fire!');

// Detect emotions
const emotions = await moodService.detectEmotions('I feel so inspired');

// Get available emotions
const allEmotions = await moodService.getAvailableEmotions();
```

### AudioService

Search and discover audio samples:

```typescript
const audioService = createAudioService();

// Search sounds
const sounds = await audioService.searchSounds('drum', 10);

// Get random sounds
const randomSounds = await audioService.getRandomSounds(5);

// Search music tracks
const tracks = await audioService.searchTracks('hip hop', 10);

// Get tracks by tags
const chillTracks = await audioService.getTracksByTags(['chill', 'hip-hop'], 10);

// Get sample categories
const categories = await audioService.getSampleCategories();

// Get sounds by category
const drums = await audioService.getSoundsByCategory('Drums', 10);
```

### TrendService

Stay current with news and trending topics:

```typescript
const trendService = createTrendService();

// Get top headlines
const headlines = await trendService.getTopHeadlines('entertainment', 'us', 10);

// Search news
const musicNews = await trendService.searchNews('music', 'popularity', 10);

// Get trending from Reddit
const redditTrends = await trendService.getTrendingFromReddit('all', 'hot', 10);

// Get music trends
const musicTrends = await trendService.getMusicTrends(10);

// Get current trends
const trends = await trendService.getCurrentTrends();

// Get today in music history
const history = await trendService.getTodayInMusicHistory();

// Get multi-source inspiration
const inspiration = await trendService.getMultiSourceInspiration(['news', 'reddit', 'trends']);
```

### RandomService

Generate creative prompts and wildcards:

```typescript
const randomService = createRandomService();

// Get random activity
const activity = await randomService.getRandomActivity('creative');

// Get random ideas
const ideas = await randomService.getRandomIdeas(5);

// Get creative prompt
const prompt = await randomService.getRandomPrompt('lyrical');

// Get multiple prompts
const prompts = await randomService.getCreativePrompts(3, 'medium');

// Get wildcards
const wildcards = await randomService.getWildcards(2);

// Generate complete fuel pack
const fuelPack = await randomService.generateFuelPack(true);

// Get random persona
const persona = await randomService.getRandomPersona();

// Get mashup idea
const mashup = await randomService.getMashupIdea();
```

## Building a Fuel Pack

Here's a complete example of building a creative "Fuel Pack":

```typescript
import { createAllServices } from './services';

async function createFuelPack() {
  const services = createAllServices();
  
  // Gather all inspiration elements
  const [
    words,
    rhymes,
    moods,
    arc,
    memes,
    sounds,
    trends,
    prompts,
    wildcards
  ] = await Promise.all([
    services.wordService.getRandomWords(10),
    services.wordService.getRhymes('flow', 5),
    services.moodService.getRandomMoods(3),
    services.moodService.getRandomEmotionalArc(),
    services.memeService.getMemes(),
    services.audioService.getRandomSounds(5),
    services.trendService.getMusicTrends(5),
    services.randomService.getCreativePrompts(3),
    services.randomService.getWildcards(2)
  ]);
  
  return {
    words,
    rhymes,
    moods,
    emotionalArc: arc,
    visualInspiration: memes.slice(0, 3),
    audioSamples: sounds,
    trendingTopics: trends,
    creativePrompts: prompts,
    wildcards
  };
}

// Use it
createFuelPack().then(fuelPack => {
  console.log('🔥 Fuel Pack Generated!');
  console.log(JSON.stringify(fuelPack, null, 2));
});
```

## Error Handling

All services automatically fall back to mock data when:
- API keys are not configured
- Rate limits are exceeded
- External services are unavailable
- Network errors occur

You can control this behavior with the `USE_MOCK_FALLBACK` environment variable.

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Lint code
npm run lint

# Format code
npm run format
```

## Production Deployment

1. Set up environment variables on your server
2. Build the TypeScript code: `npm run build`
3. Run the compiled JavaScript: `node dist/index.js`

## Rate Limiting Best Practices

To avoid hitting rate limits:

1. **Enable Caching**: Store results temporarily
2. **Use Mock Fallback**: Set `USE_MOCK_FALLBACK=true` for development
3. **Batch Requests**: Combine multiple requests where possible
4. **Monitor Usage**: Check API dashboard for usage stats
5. **Implement Backoff**: Wait before retrying failed requests

## Troubleshooting

### "API key not configured"
- Check that your `.env` file exists and contains the correct keys
- Make sure you're running from the `backend/` directory
- Verify that `dotenv` is loading properly

### "Rate limit exceeded"
- Enable mock fallback: `USE_MOCK_FALLBACK=true`
- Wait before making more requests
- Consider upgrading to paid tier if needed

### "Network error"
- Check your internet connection
- Verify API endpoints are accessible
- Check for service outages

### TypeScript errors
- Run `npm run build` to see detailed errors
- Make sure all dependencies are installed
- Check that TypeScript version is compatible

## Next Steps

1. Explore individual service methods in detail
2. Build your own fuel pack generator
3. Create custom mock data for your use case
4. Integrate with a frontend application
5. Add caching layer for better performance

## Resources

- [API Research Documentation](../docs/API_RESEARCH.md)
- [Example Code](./src/example.ts)
- [Service Type Definitions](./src/services/)

## Support

For issues or questions:
1. Check the API research documentation
2. Review the example code
3. Ensure API keys are valid and active
4. Check rate limit status on provider dashboards
