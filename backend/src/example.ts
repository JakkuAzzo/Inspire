/**
 * Example usage of Inspire services
 * 
 * This file demonstrates how to use the various API services
 * to generate creative fuel packs for musicians.
 */

import { createAllServices } from './services';

async function main() {
  // Initialize all services with environment variables
  const services = createAllServices();

  console.log('=== Inspire Fuel Pack Generator ===\n');

  // 1. Word & Phrase Generation
  console.log('📝 WORDS & PHRASES');
  console.log('-------------------');
  
  const randomWords = await services.wordService.getRandomWords(5);
  console.log('Random words:', randomWords.join(', '));
  
  const rhymes = await services.wordService.getRhymes('flow', 5);
  console.log('Rhymes for "flow":', rhymes.map(r => r.word).join(', '));
  
  const topicWords = await services.wordService.getWordsByTopic('music', 5);
  console.log('Music-related words:', topicWords.map(w => w.word).join(', '));
  console.log();

  // 2. Meme & Image Inspiration
  console.log('🖼️  VISUAL INSPIRATION');
  console.log('-------------------');
  
  const memes = await services.memeService.getMemes();
  console.log(`Found ${memes.length} meme templates`);
  console.log('Top meme:', memes[0]?.name);
  
  const image = await services.memeService.getRandomImage('music');
  console.log('Random image:', image?.description || 'No image available');
  console.log();

  // 3. Emotion & Mood Data
  console.log('😊 MOODS & EMOTIONS');
  console.log('-------------------');
  
  const moods = await services.moodService.getRandomMoods(3);
  console.log('Random moods:', moods.map(m => m.name).join(', '));
  
  const emotionalArc = await services.moodService.getRandomEmotionalArc();
  console.log(`Emotional arc: ${emotionalArc.start} → ${emotionalArc.middle} → ${emotionalArc.end}`);
  
  const sentiment = await services.moodService.analyzeSentiment('This beat is fire!');
  console.log('Sentiment analysis:', sentiment[0]?.label, sentiment[0]?.score);
  console.log();

  // 4. Audio Samples & Loops
  console.log('🎵 AUDIO SAMPLES');
  console.log('-------------------');
  
  const sounds = await services.audioService.searchSounds('drum', 3);
  console.log(`Found ${sounds.length} drum sounds`);
  if (sounds.length > 0) {
    console.log('Sample sound:', sounds[0].name);
  }
  
  const categories = await services.audioService.getSampleCategories();
  console.log('Sample categories:', categories.map(c => c.name).join(', '));
  console.log();

  // 5. Topic & Trend Data
  console.log('📰 TRENDING TOPICS');
  console.log('-------------------');
  
  const news = await services.trendService.searchNews('music', 'popularity', 3);
  console.log(`Found ${news.length} news articles`);
  if (news.length > 0) {
    console.log('Top headline:', news[0].title);
  }
  
  const musicTrends = await services.trendService.getMusicTrends(3);
  console.log(`Found ${musicTrends.length} trending music topics`);
  if (musicTrends.length > 0) {
    console.log('Hot topic:', musicTrends[0].title);
  }
  console.log();

  // 6. Randomization & Creative Prompts
  console.log('🎲 CREATIVE PROMPTS');
  console.log('-------------------');
  
  const ideas = await services.randomService.getRandomIdeas(3);
  console.log('Random ideas:');
  ideas.forEach((idea, i) => console.log(`  ${i + 1}. ${idea}`));
  
  const prompts = await services.randomService.getCreativePrompts(2);
  console.log('\nCreative prompts:');
  prompts.forEach((prompt, i) => {
    console.log(`  ${i + 1}. [${prompt.type}] ${prompt.prompt} (${prompt.difficulty})`);
  });
  
  const wildcards = await services.randomService.getWildcards(2);
  console.log('\nWildcards:', wildcards.join(', '));
  console.log();

  // 7. Generate Complete Fuel Pack
  console.log('🔥 COMPLETE FUEL PACK');
  console.log('-------------------');
  
  const fuelPack = await services.randomService.generateFuelPack(true);
  console.log('Fuel Pack Contents:');
  console.log('  Ideas:', fuelPack.ideas.join(', '));
  console.log('  Activity:', fuelPack.activity.activity);
  console.log('  Prompts:', fuelPack.prompts.map(p => p.prompt).join(' | '));
  console.log('  Wildcards:', fuelPack.wildcards?.join(', '));
  console.log();

  console.log('=== Fuel Pack Generated Successfully! ===');
}

// Run the example
if (require.main === module) {
  main().catch(console.error);
}

export { main };
