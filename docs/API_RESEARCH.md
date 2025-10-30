# API Research for Inspire

This document contains research on free and freemium APIs that can be integrated into Inspire to bring creative fuel packs to life.

## API Overview Table

| Category | API Name | Purpose | Base URL | Free Tier | Rate Limits | Key Endpoints |
|----------|----------|---------|----------|-----------|-------------|---------------|
| **Word & Phrase** | Datamuse API | Word associations, rhymes, related words | https://api.datamuse.com | ✅ Free | 100,000 requests/day | `/words?ml=`, `/words?rel_rhy=`, `/words?topics=` |
| **Word & Phrase** | Random Word API | Random word generation | https://random-word-api.herokuapp.com | ✅ Free | No strict limits | `/word`, `/word?number=5` |
| **Word & Phrase** | Free Dictionary API | Word definitions and examples | https://api.dictionaryapi.dev | ✅ Free | No strict limits | `/api/v2/entries/en/{word}` |
| **Meme & Image** | Imgflip API | Meme templates and trending memes | https://api.imgflip.com | ✅ Free | No strict limits | `/get_memes` |
| **Meme & Image** | Unsplash API | High-quality creative images | https://api.unsplash.com | ✅ Free (50 req/hr) | 50 requests/hour | `/photos/random`, `/search/photos` |
| **Meme & Image** | Reddit JSON API | Memes from subreddits | https://www.reddit.com | ✅ Free | ~60 requests/min | `/r/{subreddit}/hot.json`, `/r/memes/random.json` |
| **Emotion & Mood** | Hugging Face API | Sentiment analysis and emotion detection | https://api-inference.huggingface.co | ✅ Free (limited) | Rate limited | `/models/{model_id}` |
| **Emotion & Mood** | Custom Mood Dataset | Curated mood/emotion tags | Local/JSON | ✅ Free | N/A | Local mock data |
| **Audio Samples** | Freesound API | Audio samples and sound effects | https://freesound.org/apiv2 | ✅ Free (requires key) | 60 requests/min | `/search/text/`, `/sounds/{id}/` |
| **Audio Samples** | Jamendo API | Music tracks and previews | https://api.jamendo.com | ✅ Free (requires key) | Varies by endpoint | `/tracks/`, `/tracks/?search=` |
| **Topic & Trend** | NewsAPI | Current news headlines and topics | https://newsapi.org/v2 | ✅ Free (100 req/day) | 100 requests/day | `/top-headlines`, `/everything` |
| **Topic & Trend** | Reddit API | Trending topics and discussions | https://www.reddit.com | ✅ Free | ~60 requests/min | `/r/all/hot.json`, `/r/{subreddit}/top.json` |
| **Randomization** | BoredAPI | Random activity suggestions | https://www.boredapi.com/api | ✅ Free | No strict limits | `/activity`, `/activity?type=` |
| **Randomization** | Random Data API | Random user/address/misc data | https://random-data-api.com/api | ✅ Free | No strict limits | `/v2/users`, `/creative/random_creative` |

## API Details

### Word & Phrase Generation

#### 1. Datamuse API
- **Purpose**: Find words related to a given word, rhymes, similar meanings, etc.
- **Documentation**: https://www.datamuse.com/api/
- **Authentication**: None required
- **Key Features**:
  - No API key needed
  - Excellent for finding rhymes and related words
  - Perfect for rap/lyric inspiration
- **Example Endpoints**:
  - `GET /words?ml=music` - Words with similar meaning to "music"
  - `GET /words?rel_rhy=flow` - Words that rhyme with "flow"
  - `GET /words?topics=love` - Words related to topic "love"

#### 2. Random Word API
- **Purpose**: Generate random words for creative prompts
- **Documentation**: https://github.com/mcnaveen/Random-Words-API
- **Authentication**: None required
- **Key Features**:
  - Simple random word generation
  - Can specify number of words
  - No rate limiting
- **Example Endpoints**:
  - `GET /word` - Single random word
  - `GET /word?number=10` - Multiple random words

#### 3. Free Dictionary API
- **Purpose**: Get definitions, examples, and usage of words
- **Documentation**: https://dictionaryapi.dev/
- **Authentication**: None required
- **Key Features**:
  - Complete word definitions
  - Example sentences
  - Phonetics and audio pronunciation
- **Example Endpoints**:
  - `GET /api/v2/entries/en/{word}` - Word definition and details

### Meme & Image Inspiration

#### 1. Imgflip API
- **Purpose**: Access meme templates and popular memes
- **Documentation**: https://imgflip.com/api
- **Authentication**: None for getting memes
- **Key Features**:
  - 100+ popular meme templates
  - No authentication needed for read operations
  - Simple JSON responses
- **Example Endpoints**:
  - `GET /get_memes` - Get popular meme templates

#### 2. Unsplash API
- **Purpose**: High-quality stock photos for visual inspiration
- **Documentation**: https://unsplash.com/documentation
- **Authentication**: API key required (free tier)
- **Key Features**:
  - Beautiful curated photos
  - Search by keyword
  - Random photo endpoint
- **Example Endpoints**:
  - `GET /photos/random?query=music` - Random photo by topic
  - `GET /search/photos?query=energy` - Search photos

#### 3. Reddit JSON API
- **Purpose**: Access memes and trending content from subreddits
- **Documentation**: https://www.reddit.com/dev/api
- **Authentication**: None for read-only (add .json to URLs)
- **Key Features**:
  - No API key needed for basic access
  - Access to r/memes, r/dankmemes, etc.
  - Trending and hot content
- **Example Endpoints**:
  - `GET /r/memes/hot.json` - Hot memes from r/memes
  - `GET /r/GetMotivated/top.json?t=week` - Top motivational posts

### Emotion & Mood Data

#### 1. Hugging Face Inference API
- **Purpose**: Sentiment analysis and emotion detection
- **Documentation**: https://huggingface.co/docs/api-inference
- **Authentication**: API key required (free tier available)
- **Key Features**:
  - Pre-trained emotion models
  - Sentiment classification
  - Free tier with rate limits
- **Example Models**:
  - `j-hartmann/emotion-english-distilroberta-base` - Emotion detection
  - `cardiffnlp/twitter-roberta-base-sentiment` - Sentiment analysis

#### 2. Custom Mood Dataset
- **Purpose**: Curated list of moods and emotions for music
- **Authentication**: None (local data)
- **Key Features**:
  - Fallback when external APIs are unavailable
  - Music-specific mood tags
  - Fast local access

### Audio Samples & Loops

#### 1. Freesound API
- **Purpose**: Search and access thousands of audio samples
- **Documentation**: https://freesound.org/docs/api/
- **Authentication**: API key required (free)
- **Key Features**:
  - Huge library of sounds
  - Search by tags, BPM, duration
  - Preview URLs available
- **Example Endpoints**:
  - `GET /apiv2/search/text/?query=drum&fields=name,tags,previews` - Search for drum sounds
  - `GET /apiv2/sounds/{id}/` - Get sound details

#### 2. Jamendo API
- **Purpose**: Access music tracks and previews
- **Documentation**: https://developer.jamendo.com/v3.0
- **Authentication**: Client ID required (free)
- **Key Features**:
  - Royalty-free music
  - Preview streams
  - Search by mood, genre, BPM
- **Example Endpoints**:
  - `GET /v3.0/tracks/?audioformat=mp32&limit=10` - Get tracks
  - `GET /v3.0/tracks/?search=hip hop` - Search tracks

### Topic & Trend Data

#### 1. NewsAPI
- **Purpose**: Current news headlines and trending topics
- **Documentation**: https://newsapi.org/docs
- **Authentication**: API key required (free: 100 req/day)
- **Key Features**:
  - Top headlines from various sources
  - Search historical articles
  - Category filtering
- **Example Endpoints**:
  - `GET /v2/top-headlines?country=us` - Top US headlines
  - `GET /v2/everything?q=music&sortBy=popularity` - Music news

#### 2. Reddit API
- **Purpose**: Trending discussions and topics
- **Documentation**: https://www.reddit.com/dev/api
- **Authentication**: None for basic access
- **Key Features**:
  - Real-time trending topics
  - Multiple subreddits for different interests
  - Community-driven content
- **Example Endpoints**:
  - `GET /r/all/hot.json?limit=25` - Trending across Reddit
  - `GET /r/hiphopheads/hot.json` - Hip hop discussions

### Randomization Utilities

#### 1. BoredAPI
- **Purpose**: Random activity suggestions
- **Documentation**: https://www.boredapi.com/documentation
- **Authentication**: None required
- **Key Features**:
  - Random creative activities
  - Filter by type, participants
  - Good for "wildcard" prompts
- **Example Endpoints**:
  - `GET /api/activity` - Random activity
  - `GET /api/activity?type=recreational` - Random recreational activity

#### 2. Random Data API
- **Purpose**: Generate random creative data
- **Documentation**: https://random-data-api.com/documentation
- **Authentication**: None required
- **Key Features**:
  - Various random data types
  - Creative prompts and ideas
  - Simple JSON responses
- **Example Endpoints**:
  - `GET /api/v2/users?size=5` - Random user personas
  - `GET /api/cannabis/random_cannabis` - Random creative prompts

## Integration Strategy

### API Key Management
- Store all API keys in environment variables
- Provide fallback to mock data when keys are missing
- Never commit API keys to version control

### Rate Limiting
- Implement caching to reduce API calls
- Use fallback data when rate limits are hit
- Consider implementing request queuing for high-volume usage

### Error Handling
- Graceful degradation when APIs are unavailable
- Always provide mock data fallback
- Log API errors for monitoring

### Testing
- Mock API responses in tests
- Test fallback mechanisms
- Validate data structure consistency
