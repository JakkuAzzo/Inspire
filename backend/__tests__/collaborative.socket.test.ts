import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { AddressInfo } from 'net';

describe('Collaborative Socket.io Events', () => {
  let httpServer: ReturnType<typeof createServer>;
  let ioServer: SocketIOServer;
  let clientSocket1: ClientSocket;
  let clientSocket2: ClientSocket;
  let serverUrl: string;
  const testSessionId = 'test-session-123';

  beforeAll((done: jest.DoneCallback) => {
    httpServer = createServer();
    ioServer = new SocketIOServer(httpServer, {
      cors: { origin: '*' }
    });

    // Set up basic collaborative event handlers
    ioServer.on('connection', (socket) => {
      socket.on('collab:join', (data) => {
        socket.join(`collab:${data.sessionId}`);
        socket.to(`collab:${data.sessionId}`).emit('collab:participant-joined', data);
        socket.emit('collab:join:ack', { success: true, sessionId: data.sessionId });
      });

      socket.on('collab:leave', (data) => {
        socket.to(`collab:${data.sessionId}`).emit('collab:participant-left', data);
        socket.leave(`collab:${data.sessionId}`);
      });

      socket.on('collab:daw:note-add', (data) => {
        socket.to(`collab:${data.sessionId}`).emit('collab:daw:note-added', data);
      });

      socket.on('collab:daw:note-remove', (data) => {
        socket.to(`collab:${data.sessionId}`).emit('collab:daw:note-removed', data);
      });

      socket.on('collab:daw:playback', (data) => {
        ioServer.to(`collab:${data.sessionId}`).emit('collab:daw:playback-changed', data);
      });

      socket.on('collab:daw:tempo', (data) => {
        ioServer.to(`collab:${data.sessionId}`).emit('collab:daw:tempo-changed', data);
      });

      socket.on('collab:comment:add', (data) => {
        ioServer.to(`collab:${data.sessionId}`).emit('collab:comment:added', data);
      });

      socket.on('collab:vote', (data) => {
        ioServer.to(`collab:${data.sessionId}`).emit('collab:vote:registered', data);
      });

      socket.on('collab:audio:sync-request', (data) => {
        socket.emit('collab:audio:sync-response', {
          serverTimestamp: Date.now(),
          playbackPosition: data.requestedPosition || 0,
          isPlaying: false,
          tempo: 120
        });
      });

      socket.on('collab:stream:update', (data) => {
        socket.to(`collab:${data.sessionId}`).emit('collab:stream:updated', data);
      });
    });

    httpServer.listen(() => {
      const port = (httpServer.address() as AddressInfo).port;
      serverUrl = `http://localhost:${port}`;
      done();
    });
  });

  afterAll(() => {
    ioServer.close();
    httpServer.close();
  });

  beforeEach((done: jest.DoneCallback) => {
    clientSocket1 = ioc(serverUrl, { transports: ['websocket'] });
    clientSocket2 = ioc(serverUrl, { transports: ['websocket'] });
    
    let connectedCount = 0;
    const checkBothConnected = () => {
      connectedCount++;
      if (connectedCount === 2) done();
    };

    clientSocket1.on('connect', checkBothConnected);
    clientSocket2.on('connect', checkBothConnected);
  });

  afterEach(() => {
    if (clientSocket1.connected) clientSocket1.disconnect();
    if (clientSocket2.connected) clientSocket2.disconnect();
  });

  describe('Session lifecycle events', () => {
    test('participant can join session', (done) => {
      clientSocket1.emit('collab:join', {
        sessionId: testSessionId,
        userId: 'user-1',
        userName: 'User One',
        role: 'collaborator'
      });

      clientSocket1.on('collab:join:ack', (data) => {
        expect(data.success).toBe(true);
        expect(data.sessionId).toBe(testSessionId);
        done();
      });
    });

    test('other participants notified when someone joins', (done) => {
      // Client 1 joins first
      clientSocket1.emit('collab:join', {
        sessionId: testSessionId,
        userId: 'user-1',
        userName: 'User One',
        role: 'collaborator'
      });

      // Client 2 listens for join notification
      clientSocket2.on('collab:participant-joined', (data) => {
        expect(data.userId).toBe('user-1');
        expect(data.userName).toBe('User One');
        done();
      });

      // Client 2 joins the same session
      setTimeout(() => {
        clientSocket2.emit('collab:join', {
          sessionId: testSessionId,
          userId: 'user-2',
          userName: 'User Two',
          role: 'viewer'
        });
      }, 100);
    });

    test('participants notified when someone leaves', (done) => {
      clientSocket1.emit('collab:join', {
        sessionId: testSessionId,
        userId: 'user-1',
        userName: 'User One',
        role: 'collaborator'
      });

      clientSocket2.emit('collab:join', {
        sessionId: testSessionId,
        userId: 'user-2',
        userName: 'User Two',
        role: 'collaborator'
      });

      clientSocket2.on('collab:participant-left', (data) => {
        expect(data.userId).toBe('user-1');
        done();
      });

      setTimeout(() => {
        clientSocket1.emit('collab:leave', {
          sessionId: testSessionId,
          userId: 'user-1'
        });
      }, 100);
    });
  });

  describe('DAW synchronization events', () => {
    beforeEach((done) => {
      clientSocket1.emit('collab:join', {
        sessionId: testSessionId,
        userId: 'user-1',
        role: 'collaborator'
      });

      clientSocket2.emit('collab:join', {
        sessionId: testSessionId,
        userId: 'user-2',
        role: 'collaborator'
      });

      setTimeout(done, 100);
    });

    test('note addition broadcasts to other participants', (done) => {
      const noteData = {
        sessionId: testSessionId,
        note: {
          id: 'note-123',
          pitch: 60,
          start: 0,
          duration: 1,
          velocity: 80
        }
      };

      clientSocket2.on('collab:daw:note-added', (data) => {
        expect(data.note.id).toBe('note-123');
        expect(data.note.pitch).toBe(60);
        done();
      });

      clientSocket1.emit('collab:daw:note-add', noteData);
    });

    test('note removal broadcasts to other participants', (done) => {
      const removeData = {
        sessionId: testSessionId,
        noteId: 'note-456'
      };

      clientSocket2.on('collab:daw:note-removed', (data) => {
        expect(data.noteId).toBe('note-456');
        done();
      });

      clientSocket1.emit('collab:daw:note-remove', removeData);
    });

    test('playback state change broadcasts to all participants', (done) => {
      const playbackData = {
        sessionId: testSessionId,
        isPlaying: true,
        currentBeat: 8
      };

      clientSocket2.on('collab:daw:playback-changed', (data) => {
        expect(data.isPlaying).toBe(true);
        expect(data.currentBeat).toBe(8);
        done();
      });

      clientSocket1.emit('collab:daw:playback', playbackData);
    });

    test('tempo change broadcasts to all participants', (done) => {
      const tempoData = {
        sessionId: testSessionId,
        bpm: 140
      };

      clientSocket2.on('collab:daw:tempo-changed', (data) => {
        expect(data.bpm).toBe(140);
        done();
      });

      clientSocket1.emit('collab:daw:tempo', tempoData);
    });
  });

  describe('Audio synchronization events', () => {
    test('client receives sync response', (done) => {
      clientSocket1.on('collab:audio:sync-response', (data) => {
        expect(data.serverTimestamp).toBeDefined();
        expect(typeof data.serverTimestamp).toBe('number');
        expect(data.playbackPosition).toBeDefined();
        expect(data.isPlaying).toBe(false);
        expect(data.tempo).toBe(120);
        done();
      });

      clientSocket1.emit('collab:audio:sync-request', {
        sessionId: testSessionId,
        requestedPosition: 0
      });
    });
  });

  describe('Comment and voting events', () => {
    beforeEach((done) => {
      clientSocket1.emit('collab:join', {
        sessionId: testSessionId,
        userId: 'user-1',
        role: 'collaborator'
      });

      clientSocket2.emit('collab:join', {
        sessionId: testSessionId,
        userId: 'user-2',
        role: 'viewer'
      });

      setTimeout(done, 100);
    });

    test('comment broadcasts to all participants', (done) => {
      const commentData = {
        sessionId: testSessionId,
        comment: {
          id: 'comment-123',
          userId: 'user-1',
          userName: 'User One',
          content: 'Great beat!',
          timestamp: Date.now(),
          votes: 0
        }
      };

      clientSocket2.on('collab:comment:added', (data) => {
        expect(data.comment.id).toBe('comment-123');
        expect(data.comment.content).toBe('Great beat!');
        done();
      });

      clientSocket1.emit('collab:comment:add', commentData);
    });

    test('vote broadcasts to all participants', (done) => {
      const voteData = {
        sessionId: testSessionId,
        commentId: 'comment-123',
        userId: 'user-2',
        voteType: 'upvote'
      };

      clientSocket1.on('collab:vote:registered', (data) => {
        expect(data.commentId).toBe('comment-123');
        expect(data.voteType).toBe('upvote');
        done();
      });

      clientSocket2.emit('collab:vote', voteData);
    });
  });

  describe('Video stream events', () => {
    beforeEach((done) => {
      clientSocket1.emit('collab:join', {
        sessionId: testSessionId,
        userId: 'user-1',
        role: 'collaborator'
      });

      clientSocket2.emit('collab:join', {
        sessionId: testSessionId,
        userId: 'user-2',
        role: 'collaborator'
      });

      setTimeout(done, 100);
    });

    test('stream update broadcasts to other participants', (done) => {
      const streamData = {
        sessionId: testSessionId,
        userId: 'user-1',
        streamId: 'stream-abc',
        isVideoEnabled: true,
        isAudioEnabled: true
      };

      clientSocket2.on('collab:stream:updated', (data) => {
        expect(data.userId).toBe('user-1');
        expect(data.streamId).toBe('stream-abc');
        expect(data.isVideoEnabled).toBe(true);
        done();
      });

      clientSocket1.emit('collab:stream:update', streamData);
    });
  });

  describe('Multi-participant synchronization', () => {
    test('multiple clients receive broadcasts', (done) => {
      const clients = [clientSocket1, clientSocket2];
      let receivedCount = 0;

      clients.forEach(client => {
        client.emit('collab:join', {
          sessionId: testSessionId,
          userId: `user-${client.id}`,
          role: 'collaborator'
        });
      });

      const checkAllReceived = () => {
        receivedCount++;
        if (receivedCount === 2) done();
      };

      clientSocket1.on('collab:daw:tempo-changed', (data) => {
        expect(data.bpm).toBe(160);
        checkAllReceived();
      });

      clientSocket2.on('collab:daw:tempo-changed', (data) => {
        expect(data.bpm).toBe(160);
        checkAllReceived();
      });

      setTimeout(() => {
        clientSocket1.emit('collab:daw:tempo', {
          sessionId: testSessionId,
          bpm: 160
        });
      }, 100);
    });
  });
});
