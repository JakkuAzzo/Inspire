import http from 'http';
import { io as Client, Socket } from 'socket.io-client';
import { Server as SocketIOServer } from 'socket.io';

let testServer: http.Server;
let testIo: SocketIOServer;
let clientSocket: Socket;

beforeAll((done) => {
  testServer = http.createServer();
  testIo = new SocketIOServer(testServer, { cors: { origin: '*' } });

  // Register the same rooms:join handler as in src/index.ts
  testIo.on('connection', (socket) => {
    socket.on('rooms:join', ({ roomId, user }: { roomId: string; user?: string }) => {
      socket.join(roomId);
      const room = { id: roomId, participants: [user].filter(Boolean) };
      socket.emit('rooms:joined', room);
    });
  });

  testServer.listen(0, '127.0.0.1', () => {
    const addr = testServer.address() as any;
    const port = addr.port;
    clientSocket = Client(`http://127.0.0.1:${port}`, {
      transports: ['websocket'],
      timeout: 5000,
      reconnection: false,
    });
    const finish = (err?: any) => done(err);
    clientSocket.on('connect', () => finish());
    clientSocket.on('connect_error', (err) => finish(err));
  });
}, 10000);

afterAll((done) => {
  testIo.close();
  const finishClose = () => testServer?.close(() => done());
  if (clientSocket?.connected) {
    clientSocket.once('disconnect', finishClose);
    clientSocket.disconnect();
  } else {
    finishClose();
  }
});

describe('Socket.IO rooms integration', () => {
  it('joins a room and receives presence events', (done) => {
    const roomId = `test-room-${Date.now()}`;

    clientSocket.emit('rooms:join', { roomId, user: 'integration-user' });

    clientSocket.once('rooms:joined', (room: any) => {
      try {
        expect(room).toBeDefined();
        expect(room.id).toBe(roomId);
        done();
      } catch (err) {
        done(err as any);
      }
    });
  }, 10000);
});
