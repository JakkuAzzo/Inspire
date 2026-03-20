import request from 'supertest';
import { app, io, server } from '../src/index';

describe('VST role constraints', () => {
  afterAll((done) => {
    io.close();
    if (server.listening) {
      server.close(done);
    } else {
      done();
    }
  });

  async function createMasterRoom(masterInstanceId: string) {
    const createRes = await request(app)
      .post('/api/vst/create-room')
      .send({ pluginRole: 'master', pluginInstanceId: masterInstanceId })
      .expect(201);

    const roomId = String(createRes.body.roomId);
    const roomCode = String(createRes.body.code);

    const joinRes = await request(app)
      .post('/api/vst/join-room')
      .send({
        roomId,
        code: roomCode,
        pluginRole: 'master',
        pluginInstanceId: masterInstanceId
      })
      .expect(200);

    return {
      roomId,
      roomCode,
      masterToken: String(joinRes.body.token)
    };
  }

  async function createGuestRelayToken() {
    const relaySession = await request(app)
      .post('/api/vst/guest-continue')
      .send({ pluginRole: 'relay' })
      .expect(200);

    return String(relaySession.body.token);
  }

  test('rejects second master instance in same room', async () => {
    const { roomId, roomCode } = await createMasterRoom('MASTER_A');

    const secondMasterJoin = await request(app)
      .post('/api/vst/join-room')
      .send({
        roomId,
        code: roomCode,
        pluginRole: 'master',
        pluginInstanceId: 'MASTER_B'
      })
      .expect(409);

    expect(secondMasterJoin.body.error).toBe('master_already_exists');
  });

  test('relay attach fails until master has pushed track state', async () => {
    const { roomCode } = await createMasterRoom('MASTER_TRACKLESS');
    const relayToken = await createGuestRelayToken();

    const relayAttach = await request(app)
      .post('/api/vst/relay/attach')
      .set('Authorization', `Bearer ${relayToken}`)
      .send({
        roomCode,
        pluginInstanceId: 'RELAY_NEEDS_MASTER_TRACK'
      })
      .expect(409);

    expect(relayAttach.body.error).toBe('master_track_missing');
  });

  test('rejects second relay push on same track', async () => {
    const { roomCode } = await createMasterRoom('MASTER_OCCUPANCY');

    // Master must publish at least one track state before relay/create are allowed.
    await request(app)
      .post('/api/daw-sync/push')
      .send({
        roomCode,
        trackId: 'master-track-1',
        pluginRole: 'master',
        state: {
          roomCode,
          trackId: 'master-track-1',
          trackName: 'Master Track',
          bpm: 120,
          tempo: 120,
          timeSignature: '4/4',
          clips: [],
          notes: [],
          pluginInstanceId: 'MASTER_OCCUPANCY',
          pluginRole: 'master'
        }
      })
      .expect(201);

    const relayTokenA = await createGuestRelayToken();
    const relayTokenB = await createGuestRelayToken();

    await request(app)
      .post('/api/vst/relay/attach')
      .set('Authorization', `Bearer ${relayTokenA}`)
      .send({ roomCode, pluginInstanceId: 'RELAY_A' })
      .expect(200);

    await request(app)
      .post('/api/vst/relay/attach')
      .set('Authorization', `Bearer ${relayTokenB}`)
      .send({ roomCode, pluginInstanceId: 'RELAY_B' })
      .expect(200);

    await request(app)
      .post('/api/daw-sync/push')
      .set('Authorization', `Bearer ${relayTokenA}`)
      .send({
        roomCode,
        trackId: 'relay-shared-track',
        pluginRole: 'relay',
        state: {
          roomCode,
          trackId: 'relay-shared-track',
          trackName: 'Shared Relay Track',
          bpm: 120,
          tempo: 120,
          timeSignature: '4/4',
          clips: [],
          notes: [],
          pluginInstanceId: 'RELAY_A',
          pluginRole: 'relay'
        }
      })
      .expect(201);

    const secondRelayPush = await request(app)
      .post('/api/daw-sync/push')
      .set('Authorization', `Bearer ${relayTokenB}`)
      .send({
        roomCode,
        trackId: 'relay-shared-track',
        pluginRole: 'relay',
        state: {
          roomCode,
          trackId: 'relay-shared-track',
          trackName: 'Shared Relay Track',
          bpm: 120,
          tempo: 120,
          timeSignature: '4/4',
          clips: [],
          notes: [],
          pluginInstanceId: 'RELAY_B',
          pluginRole: 'relay'
        }
      })
      .expect(409);

    expect(secondRelayPush.body.conflict).toBe(true);
    expect(secondRelayPush.body.conflictReason).toBe('relay_track_occupied');
  });
});
