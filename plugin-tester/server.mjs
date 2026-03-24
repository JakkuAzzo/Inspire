import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const publicDir = path.join(__dirname, 'public');

const port = Number(process.env.PLUGIN_TESTER_PORT || 4179);
const backendUrl = (process.env.BACKEND_URL || 'http://127.0.0.1:3001').replace(/\/$/, '');

function jsonResponse(res, code, body) {
  const payload = JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload)
  });
  res.end(payload);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error('Request too large'));
      }
    });
    req.on('end', () => {
      if (!data.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

async function backendPost(endpoint, body, bearerToken) {
  const headers = { 'Content-Type': 'application/json' };
  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  const response = await fetch(`${backendUrl}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body || {})
  });

  const text = await response.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    body: parsed
  };
}

function listPluginArtifacts() {
  const artifacts = [
    {
      id: 'vst3-debug',
      label: 'InspireVST VST3 (Debug)',
      path: path.join(repoRoot, 'build', 'InspireVST_artefacts', 'Debug', 'VST3', 'InspireVST.vst3')
    },
    {
      id: 'au-debug',
      label: 'InspireVST AU (Debug)',
      path: path.join(repoRoot, 'build', 'InspireVST_artefacts', 'Debug', 'AU', 'InspireVST.component')
    }
  ];

  return artifacts.map((artifact) => ({
    ...artifact,
    exists: fs.existsSync(artifact.path)
  }));
}

function serveStatic(req, res) {
  const requestPath = req.url === '/' ? '/index.html' : req.url;
  const safePath = path.normalize(requestPath).replace(/^\.\.(\/|\\|$)/, '');
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8'
    }[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': mime });
    res.end(content);
  });
}

async function handleApi(req, res) {
  if (req.method === 'GET' && req.url === '/api/health') {
    jsonResponse(res, 200, { ok: true, backendUrl });
    return;
  }

  if (req.method === 'GET' && req.url === '/api/plugins') {
    jsonResponse(res, 200, { ok: true, artifacts: listPluginArtifacts() });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/vst/guest-continue') {
    const payload = await readJson(req);
    const role = String(payload.role || 'relay').toLowerCase();
    const result = await backendPost('/api/vst/guest-continue', { pluginRole: role });
    jsonResponse(res, result.status, result.body);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/vst/create-room') {
    const payload = await readJson(req);
    const result = await backendPost(
      '/api/vst/create-room',
      {
        password: payload.password || '',
        pluginRole: payload.role || 'master',
        pluginInstanceId: payload.instanceId || ''
      },
      payload.token || ''
    );
    jsonResponse(res, result.status, result.body);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/vst/master-activate') {
    const payload = await readJson(req);
    const roomId = String(payload.roomId || '').trim();
    const roomCode = String(payload.roomCode || '').trim().toUpperCase();
    const instanceId = String(payload.instanceId || '').trim();

    if (!roomId || !roomCode || !instanceId) {
      jsonResponse(res, 400, { error: 'roomId, roomCode, and instanceId are required' });
      return;
    }

    const join = await backendPost('/api/vst/join-room', {
      roomId,
      code: roomCode,
      pluginRole: 'master',
      pluginInstanceId: instanceId
    });

    if (!join.ok || !join.body || typeof join.body.token !== 'string' || !join.body.token) {
      jsonResponse(res, join.status, join.body);
      return;
    }

    const token = join.body.token;
    const heartbeat = await backendPost(
      '/api/vst/master/heartbeat',
      {
        roomCode,
        pluginInstanceId: instanceId
      },
      token
    );

    if (!heartbeat.ok) {
      jsonResponse(res, heartbeat.status, heartbeat.body);
      return;
    }

    jsonResponse(res, 200, {
      ok: true,
      token,
      roomId: join.body.roomId,
      roomCode: join.body.roomCode || roomCode,
      pluginRole: 'master',
      masterInstanceId: instanceId
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/vst/attach') {
    const payload = await readJson(req);
    const role = String(payload.role || 'relay').toLowerCase();
    const route = role === 'create' ? '/api/vst/create/attach' : '/api/vst/relay/attach';

    let attachResult = await backendPost(
      route,
      {
        roomCode: payload.roomCode || '',
        pluginInstanceId: payload.instanceId || ''
      },
      payload.token || ''
    );

    let refreshedToken = '';
    const errorText = JSON.stringify(attachResult.body || {}).toLowerCase();
    const isAuthFailure = errorText.includes('invalid session token') || errorText.includes('session expired');

    if (!attachResult.ok && isAuthFailure) {
      const refresh = await backendPost('/api/vst/guest-continue', { pluginRole: role });
      if (refresh.ok && refresh.body && typeof refresh.body.token === 'string' && refresh.body.token) {
        refreshedToken = refresh.body.token;
        attachResult = await backendPost(
          route,
          {
            roomCode: payload.roomCode || '',
            pluginInstanceId: payload.instanceId || ''
          },
          refreshedToken
        );
      }
    }

    jsonResponse(res, attachResult.status, {
      ...attachResult.body,
      tokenRefreshed: Boolean(refreshedToken),
      refreshedToken
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/vst/master-seed-track') {
    const payload = await readJson(req);
    const roomCode = String(payload.roomCode || '').toUpperCase();
    const instanceId = String(payload.instanceId || '').trim();
    const token = String(payload.token || '').trim();

    if (!roomCode || !instanceId || !token) {
      jsonResponse(res, 400, { error: 'roomCode, instanceId, and token are required' });
      return;
    }

    const nowBeat = Number(payload.currentBeat || 1);
    const trackId = String(payload.trackId || `vst-${instanceId}`);

    const result = await backendPost(
      '/api/daw-sync/push',
      {
        roomCode,
        trackId,
        baseVersion: -1,
        pluginRole: 'master',
        state: {
          roomCode,
          trackId,
          trackIndex: 0,
          trackName: 'Master Seed Track',
          trackType: 'hybrid',
          bpm: 120,
          tempo: 120,
          timeSignature: '4/4',
          currentBeat: nowBeat,
          sourcePpqPosition: 0,
          sourceSamplePosition: 0,
          arrangementStartPpq: 0,
          arrangementEndPpq: 16,
          dawName: 'PluginTester',
          dawAdapter: 'simulated',
          updatedBy: 'plugin-tester-master',
          clips: [],
          notes: [],
          clipsJson: '[]',
          notesJson: '[]',
          fxUsed: [],
          automationLanes: [],
          pluginInstanceId: instanceId,
          dawTrackIndex: 1,
          dawTrackName: 'Master 1',
          pluginRole: 'master',
          masterInstanceId: instanceId
        },
        updatedBy: 'plugin-tester-master',
        masterInstanceId: instanceId
      },
      token
    );

    jsonResponse(res, result.status, result.body);
    return;
  }

  jsonResponse(res, 404, { error: 'Not found' });
}

const server = http.createServer(async (req, res) => {
  try {
    if ((req.url || '').startsWith('/api/')) {
      await handleApi(req, res);
      return;
    }

    serveStatic(req, res);
  } catch (err) {
    jsonResponse(res, 500, {
      error: 'Internal server error',
      message: err instanceof Error ? err.message : String(err)
    });
  }
});

server.listen(port, () => {
  process.stdout.write(`plugin-tester running at http://127.0.0.1:${port}\n`);
  process.stdout.write(`proxying VST API to ${backendUrl}\n`);
});
