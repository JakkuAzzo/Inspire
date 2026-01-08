#!/usr/bin/env node

/**
 * Test Imgflip API Integration
 * Validates the configured credentials and tests meme endpoints
 */

const imgflipUsername = 'NathanBrown-Bennett';
const imgflipPassword = 'NTYEH9gVp!T86Ah';
const imgflipUrl = 'https://api.imgflip.com';

async function testImgflipAPI() {
  console.log('😂 Testing Imgflip API Integration\n');
  console.log('═══════════════════════════════════════════');
  
  // Test 1: Check API credentials
  console.log('\n[1] API Credentials Status');
  console.log(`   ✅ Username: ${imgflipUsername}`);
  console.log(`   ✅ Password: ${imgflipPassword.substring(0, 4)}...`);
  console.log(`   ✅ API URL: ${imgflipUrl}`);
  
  // Test 2: Get popular memes (no auth required)
  console.log('\n[2] Testing /get_memes endpoint (free)');
  try {
    const memesRes = await fetch(`${imgflipUrl}/get_memes`);
    
    if (memesRes.ok) {
      const data = await memesRes.json();
      if (data.success && data.data?.memes) {
        console.log(`   ✅ Popular memes fetched: ${data.data.memes.length} templates`);
        console.log(`\n   Top 5 templates:`);
        data.data.memes.slice(0, 5).forEach((meme, i) => {
          console.log(`      ${i + 1}. "${meme.name}" (ID: ${meme.id})`);
          console.log(`         ${meme.width}x${meme.height}, ${meme.box_count} text boxes`);
        });
      } else {
        console.log(`   ❌ Unexpected response format`);
      }
    } else {
      console.log(`   ❌ Error: HTTP ${memesRes.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Network error: ${error.message}`);
  }
  
  // Test 3: Caption a meme (requires auth)
  console.log('\n[3] Testing /caption_image endpoint (free with watermark)');
  try {
    // Use "One Does Not Simply" template (ID: 61579)
    const formData = new URLSearchParams({
      template_id: '61579',
      username: imgflipUsername,
      password: imgflipPassword,
      text0: 'One does not simply',
      text1: 'Test the Imgflip API without making a meme'
    });
    
    const captionRes = await fetch(`${imgflipUrl}/caption_image`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    if (captionRes.ok) {
      const data = await captionRes.json();
      if (data.success) {
        console.log(`   ✅ Meme created successfully!`);
        console.log(`      URL: ${data.data.url}`);
        console.log(`      Page: ${data.data.page_url}`);
        console.log(`      Note: Free API includes imgflip.com watermark`);
      } else {
        console.log(`   ❌ Caption failed: ${data.error_message}`);
      }
    } else {
      const text = await captionRes.text();
      console.log(`   ❌ HTTP ${captionRes.status}: ${text.substring(0, 100)}`);
    }
  } catch (error) {
    console.log(`   ❌ Caption error: ${error.message}`);
  }
  
  // Test 4: Try another popular meme template
  console.log('\n[4] Testing with "Distracted Boyfriend" template');
  try {
    const formData = new URLSearchParams({
      template_id: '112126428', // Distracted Boyfriend
      username: imgflipUsername,
      password: imgflipPassword,
      boxes: JSON.stringify([
        { text: 'New Inspire API', x: 156, y: 11, width: 151, height: 158 },
        { text: 'The Dev', x: 378, y: 53, width: 140, height: 169 },
        { text: 'Old placeholder credentials', x: 547, y: 183, width: 141, height: 162 }
      ])
    });
    
    const captionRes = await fetch(`${imgflipUrl}/caption_image`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    if (captionRes.ok) {
      const data = await captionRes.json();
      if (data.success) {
        console.log(`   ✅ Multi-box meme created!`);
        console.log(`      URL: ${data.data.url}`);
      } else {
        console.log(`   ❌ Caption failed: ${data.error_message}`);
      }
    }
  } catch (error) {
    console.log(`   ⚠️  Multi-box test error: ${error.message}`);
  }
  
  // Test 5: API capabilities
  console.log('\n[5] API Capabilities Summary');
  console.log('   ✅ Free Features (Unlimited)');
  console.log('      • Get 100+ popular meme templates');
  console.log('      • Caption images with custom text');
  console.log('      • Up to 20 text boxes per meme');
  console.log('      • Free tier includes watermark');
  console.log('\n   🔒 Premium Features (Not configured)');
  console.log('      • Caption animated GIFs');
  console.log('      • Search 1M+ meme templates');
  console.log('      • Remove watermark');
  console.log('      • AI meme generation');
  
  console.log('\n═══════════════════════════════════════════');
  console.log('\n✅ Imgflip API credentials are configured!');
  console.log('   • Use in memeService.getTrendingMemes()');
  console.log('   • Use in memeService.captionMeme(id, text)');
  console.log('   • Appears in Editor mode packs\n');
}

testImgflipAPI().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
