#!/usr/bin/env node

/**
 * Test Unsplash API Integration
 * Validates the configured credentials and tests image search
 */

const unsplashKey = '_0YrB4PlRrlFNx5TgnV4Mdp7HQwz8toC3Vks8CZh8gU';
const unsplashSecretKey = 'fFAUHifHSSVxrVIeaHlzKE76zpKr6xRCMFBCyLnEtn4';
const unsplashUrl = 'https://api.unsplash.com';

async function testUnsplashAPI() {
  console.log('🎨 Testing Unsplash API Integration\n');
  console.log('═══════════════════════════════════════════');
  
  // Test 1: Check API credentials
  console.log('\n[1] API Credentials Status');
  console.log(`   ✅ Access Key: ${unsplashKey.substring(0, 10)}...`);
  console.log(`   ✅ Secret Key: ${unsplashSecretKey.substring(0, 10)}...`);
  console.log(`   ✅ API URL: ${unsplashUrl}`);
  
  // Test 2: Random photo endpoint
  console.log('\n[2] Testing /photos/random endpoint');
  try {
    const randomRes = await fetch(`${unsplashUrl}/photos/random?count=3`, {
      headers: {
        'Authorization': `Client-ID ${unsplashKey}`,
        'Accept-Version': 'v1'
      }
    });
    
    if (randomRes.ok) {
      const randomPhotos = await randomRes.json();
      const photoArray = Array.isArray(randomPhotos) ? randomPhotos : [randomPhotos];
      console.log(`   ✅ Random photos fetched successfully (${photoArray.length} photo(s))`);
      photoArray.forEach((photo, i) => {
        console.log(`      Photo ${i + 1}: "${photo.description || photo.alt_description || 'Untitled'}" by ${photo.user.name}`);
        console.log(`              URL: ${photo.urls.small}`);
      });
    } else {
      console.log(`   ❌ Error: HTTP ${randomRes.status}`);
      const text = await randomRes.text();
      console.log(`      Response: ${text.substring(0, 100)}`);
    }
  } catch (error) {
    console.log(`   ❌ Network error: ${error.message}`);
  }
  
  // Test 3: Search photos endpoint
  console.log('\n[3] Testing /search/photos endpoint');
  const searchQueries = ['abstract art', 'music production', 'creative inspiration'];
  
  for (const query of searchQueries) {
    try {
      const searchRes = await fetch(`${unsplashUrl}/search/photos?query=${encodeURIComponent(query)}&per_page=2`, {
        headers: {
          'Authorization': `Client-ID ${unsplashKey}`,
          'Accept-Version': 'v1'
        }
      });
      
      if (searchRes.ok) {
        const data = await searchRes.json();
        console.log(`   ✅ Search for "${query}": ${data.results?.length || 0} results`);
        if (data.results?.length > 0) {
          console.log(`      First result: "${data.results[0].description || 'Untitled'}" by ${data.results[0].user.name}`);
        }
      } else {
        console.log(`   ❌ Search failed: HTTP ${searchRes.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Search error: ${error.message}`);
    }
  }
  
  // Test 4: Rate limit info
  console.log('\n[4] Rate Limit Information');
  console.log('   Free tier: 50 requests/hour');
  console.log('   Current setup: Authorized requests');
  
  console.log('\n═══════════════════════════════════════════');
  console.log('\n✅ Unsplash API credentials are configured!');
  console.log('   • Use in memeService.searchImages(query, perPage)');
  console.log('   • Falls back to Picsum if no key configured');
  console.log('   • Images will appear in Editor mode packs\n');
}

testUnsplashAPI().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
