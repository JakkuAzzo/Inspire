#!/usr/bin/env node

/**
 * Test Jamendo API Integration
 * Validates the configured client ID and tests track search
 */

const clientId = '0386941b';
const clientSecret = '81609f12a054a772a294fc5b0c6abbed';
const jamendoUrl = 'https://api.jamendo.com/v3.0';

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function testJamendo() {
  console.log('🎶 Testing Jamendo API Integration\n');
  console.log('═══════════════════════════════════════════');

  // Credentials
  console.log('\n[1] Credentials Status');
  console.log(`   ✅ Client ID: ${clientId}`);
  console.log(`   ✅ Client Secret: ${clientSecret.substring(0, 8)}... (not required for read calls)`);
  console.log(`   ✅ API URL: ${jamendoUrl}`);

  // Tracks search
  console.log('\n[2] Testing /tracks/ search');
  const queries = [
    { name: 'lofi', extra: 'tags=lofi&order=popularity_total' },
    { name: 'ambient', extra: 'tags=ambient&order=popularity_month' },
    { name: 'hiphop', extra: 'tags=hiphop&order=popularity_week' }
  ];
  for (const { name, extra } of queries) {
    try {
      const url = `${jamendoUrl}/tracks/?client_id=${clientId}&format=jsonpretty&limit=3&include=musicinfo+stats+licenses&${extra}`;
      const data = await fetchJson(url);
      const results = data.results || [];
      console.log(`   ✅ Query "${name}": ${results.length} tracks`);
      results.forEach((track, i) => {
        console.log(`      ${i + 1}. "${track.name}" by ${track.artist_name} (${(track.duration/60).toFixed(1)} min)`);
        if (track.audiodownload) console.log(`         Download: ${track.audiodownload}`);
        else if (track.audio) console.log(`         Stream: ${track.audio}`);
      });
    } catch (err) {
      console.log(`   ❌ Query "${name}" failed: ${err.message}`);
    }
  }

  // Radios (genre discovery)
  console.log('\n[3] Testing /radios/ endpoint');
  try {
    const data = await fetchJson(`${jamendoUrl}/radios/?client_id=${clientId}&format=jsonpretty&limit=3`);
    const radios = data.results || [];
    console.log(`   ✅ Radios fetched: ${radios.length}`);
    radios.forEach((radio, i) => {
      console.log(`      ${i + 1}. ${radio.name} — ${radio.description}`);
    });
  } catch (err) {
    console.log(`   ❌ Radios fetch failed: ${err.message}`);
  }

  // Rate limits
  console.log('\n[4] Rate Limit Information');
  console.log('   Jamendo free: generous, but keep requests reasonable');

  console.log('\n═══════════════════════════════════════════');
  console.log('\n✅ Jamendo API client configured!');
  console.log('   • Used by audioService for Producer packs');
  console.log('   • Fallback to Freesound/mock if unavailable\n');
}

testJamendo().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
