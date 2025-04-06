import { WebSocketServer } from 'ws';

export function startSignalingServer(server) {
  const wss = new WebSocketServer({ server });

  let peers = new Set();

  wss.on('connection', (socket) => {
    console.log('📡 New WebSocket connection');
    peers.add(socket);

    socket.on('message', (message) => {
      for (let peer of peers) {
        if (peer !== socket && peer.readyState === 1) {
          peer.send(message);
        }
      }
    });

    socket.on('close', () => {
      peers.delete(socket);
      console.log('❌ WebSocket connection closed');
    });
  });

  console.log('✅ WebSocket signaling server attached');
}
