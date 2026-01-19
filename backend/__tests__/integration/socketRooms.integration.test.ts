import http from 'http';
import { io as Client, Socket } from 'socket.io-client';
import { app, server, io } from '../../src/index';

let httpServer: http.Server;
let clientSocket: Socket;

beforeAll((done) => {
  httpServer = server.listen(0, '127.0.0.1', () => {
    const addr = httpServer.address() as any;
    const port = addr.port;
    clientSocket = Client(`http://127.0.0.1:${port}`, { transports: ['websocket'], timeout: 5000 });
    const finish = (err?: any) => done(err);
    clientSocket.on('connect', () => finish());
    clientSocket.on('connect_error', (err) => finish(err));
  });
}, 10000);

afterAll((done) => {
  const finishClose = () => httpServer?.close(() => done());
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
