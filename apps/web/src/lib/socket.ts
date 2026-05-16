import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) throw new Error('Socket not initialised — call connectSocket first');
  return socket;
}

// apiToken comes from session.apiToken (NextAuth session callback).
// A new socket is created per session so the token is always fresh.
export function connectSocket(sessionId: string, apiToken: string): Socket {
  socket?.disconnect();

  socket = io(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'}/session`, {
    auth: { token: apiToken },
    autoConnect: false,
  });

  socket.connect();
  socket.emit('session:join', { sessionId });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
