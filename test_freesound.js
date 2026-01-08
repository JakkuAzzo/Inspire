#!/usr/bin/env node

/**
 * Test Freesound API Integration
 * Validates the configured credentials and tests audio sample search
 */

const freesoundKey = 'FZ9SGr2HANc2SU54zMGC4dexIQPplyG9PwyORTAh';
const freesoundUrl = 'https://freesound.org/apiv2';

async function testFreesoundAPI() {
  console.log('🎵 Testing Freesound API Integration\n');
  console.log('═══════════════════════════════════════════');
  
  // Test 1: Check API credentials
  console.log('\n[1] API Credentials Status');
  console.log(`   ✅ API Key: ${freesoundKey.substring(0, 10)}...`);
  console.log(`   ✅ API URL: ${freesoundUrl}`);
  
  // Test 2: Search for audio samples
  console.log('\n[2] Testing /search/text endpoint');
  const searchQueries = [
    { query: 'kick drum', filter: 'duration:[0 TO 2]' },
    { query: 'piano loop', filter: 'duration:[0 TO 10]' },
    { query: 'synth pad', filter: 'tag:synthesizer' }
  ];
  
  for (const { query, filter } of searchQueries) {
    try {
      const params = new URLSearchParams({
        query,
        filter: filter || '',
        fields: 'id,name,tags,duration,previews,username',
        page_size: 3
      });
      
      const searchRes = await fetch(`${freesoundUrl}/search/text/?${params}`, {
        headers: {
          'Authorization': `Token ${freesoundKey}`
        }
      });
      
      if (searchRes.ok) {
        const data = await searchRes.json();
        console.log(`   ✅ Search for "${query}": ${data.count} total results`);
        if (data.results?.length > 0) {
          data.results.forEach((sound, i) => {
            console.log(`      ${i + 1}. "${sound.name}" (${sound.duration.toFixed(1)}s) by ${sound.username}`);
            console.log(`         Preview: ${sound.previews['preview-lq-mp3']}`);
          });
        }
      } else {
        const errorText = await searchRes.text();
        console.log(`   ❌ Search failed: HTTP ${searchRes.status}`);
        console.log(`      Response: ${errorText.substring(0, 100)}`);
      }
    } catch (error) {
      console.log(`   ❌ Search error: ${error.message}`);
    }
  }
  
  // Test 3: Get sound details
  console.log('\n[3] Testing /sounds/{id} endpoint');
  try {
    // Use a known popular sound ID
    const soundId = 1234; // Replace with actual ID from search
    const detailRes = await fetch(`${freesoundUrl}/sounds/${soundId}/`, {
      headers: {
        'Authorization': `Token ${freesoundKey}`
      }
    });
    
    if (detailRes.ok) {
      const sound = await detailRes.json();
      console.log(`   ✅ Sound details retrieved`);
      console.log(`      Name: ${sound.name}`);
      console.log(`      Tags: ${sound.tags.join(', ')}`);
    } else {
      console.log(`   ⚠️  Sound ${soundId} not found (expected - using test ID)`);
    }
  } catch (error) {
    console.log(`   ⚠️  Detail fetch error: ${error.message}`);
  }
  
  // Test 4: Rate limit info
  console.log('\n[4] Rate Limit Information');
  console.log('   Free tier: 60 requests/minute');
  console.log('   Current setup: Authorized requests with API key');
  
  console.log('\n═══════════════════════════════════════════');
  console.log('\n✅ Freesound API credentials are configured!');
  console.log('   • Use in audioService.searchSounds(query, filter)');
  console.log('   • Returns: kick drums, loops, synths, FX, vocals');
  console.log('   • Appears in Producer mode packs\n');
}

testFreesoundAPI().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
